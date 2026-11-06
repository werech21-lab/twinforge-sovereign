import type { ClaudeToolSchema } from "@/lib/ai/tools/composio";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ProviderResult = {
  text: string;
  provider: string;
  estimatedCostUsd: number;
  toolsUsed?: string[];
  citations?: string[];
};

const MAX_TOKENS = Number(process.env.AI_MAX_TOKENS || 1200);
const FAILOVER_TIMEOUT_MS = Number(process.env.AI_FAILOVER_TIMEOUT_MS || 18000);
export const DEFAULT_TASK_COST_CAP_USD = Number(
  process.env.AI_TASK_COST_CAP_USD || 0.1,
);

function estimateCostUsd(
  provider: string,
  inputChars: number,
  outputChars: number,
) {
  const inTok = Math.ceil(inputChars / 4);
  const outTok = Math.ceil(outputChars / 4);
  if (provider.startsWith("gemini")) {
    return (inTok / 1_000_000) * 0.1 + (outTok / 1_000_000) * 0.4;
  }
  if (provider.startsWith("openai") || provider.startsWith("gpt")) {
    return (inTok / 1_000_000) * 0.15 + (outTok / 1_000_000) * 0.6;
  }
  if (provider.startsWith("claude") || provider.startsWith("anthropic")) {
    return (inTok / 1_000_000) * 0.8 + (outTok / 1_000_000) * 4.0;
  }
  if (provider.startsWith("sonar") || provider.startsWith("perplexity")) {
    return (inTok / 1_000_000) * 3.0 + (outTok / 1_000_000) * 15.0 + 0.005;
  }
  return 0.01;
}

function enforceCostCap(cost: number, cap: number) {
  if (cost > cap) {
    throw new Error(
      `تجاوز حد تكلفة الاستدلال ($${cost.toFixed(4)} > $${cap.toFixed(4)})`,
    );
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`AI_TIMEOUT_${ms}ms`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function callGemini(
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number = MAX_TOKENS,
) {
  const key =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) throw new Error("NO_GEMINI_KEY");

  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: system
        ? { parts: [{ text: system }] }
        : undefined,
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = (json.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || "")
    .join("")
    .trim();

  if (!text) throw new Error("Gemini empty response");
  return { text, provider: model };
}

async function callOpenAI(
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number = MAX_TOKENS,
) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("NO_OPENAI_KEY");

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI ${res.status}: ${err.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = (json.choices?.[0]?.message?.content || "").trim();
  if (!text) throw new Error("OpenAI empty response");
  return { text, provider: model };
}

async function callAnthropic(messages: ChatMessage[], temperature: number) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("NO_ANTHROPIC_KEY");

  const model = process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest";
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const chatMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      temperature,
      system: system || undefined,
      messages: chatMessages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic ${res.status}: ${err.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = (json.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text || "")
    .join("\n")
    .trim();

  if (!text) throw new Error("Anthropic empty response");
  return { text, provider: model };
}

async function callPerplexityChat(messages: ChatMessage[], temperature: number) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) throw new Error("NO_PERPLEXITY_KEY");

  const model = process.env.PERPLEXITY_MODEL || "sonar-pro";
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: MAX_TOKENS,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Perplexity ${res.status}: ${err.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = (json.choices?.[0]?.message?.content || "").trim();
  if (!text) throw new Error("Perplexity empty response");
  return { text, provider: model };
}

type AnthropicContentBlock =
  | { type: "text"; text: string }
  | {
      type: "tool_use";
      id: string;
      name: string;
      input: Record<string, unknown>;
    }
  | {
      type: "tool_result";
      tool_use_id: string;
      content: string;
      is_error?: boolean;
    };

/**
 * حلقة وكيل Claude مع دعم الأدوات المباشر (Composio + Perplexity + Firecrawl + Playwright).
 */
export async function runClaudeWithTools(opts: {
  messages: ChatMessage[];
  tools: ClaudeToolSchema[];
  executeTool: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{
    summaryText: string;
    citations?: string[];
    estimatedCostUsd: number;
  }>;
  temperature?: number;
  maxSteps?: number;
  costCapUsd?: number;
}): Promise<ProviderResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("NO_ANTHROPIC_KEY");

  const model = process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest";
  const maxSteps = opts.maxSteps ?? 4;
  const costCap = opts.costCapUsd ?? DEFAULT_TASK_COST_CAP_USD;

  const system = opts.messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");

  const conversation: Array<{
    role: "user" | "assistant";
    content: string | AnthropicContentBlock[];
  }> = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

  const toolsUsed: string[] = [];
  const citations = new Set<string>();
  let totalCostUsd = 0;

  for (let step = 0; step < maxSteps; step += 1) {
    const res = await withTimeout(
      fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: MAX_TOKENS,
          temperature: opts.temperature ?? 0.5,
          system: system || undefined,
          tools: opts.tools.length > 0 ? opts.tools : undefined,
          messages: conversation,
        }),
      }),
      FAILOVER_TIMEOUT_MS * 2,
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic ${res.status}: ${err.slice(0, 300)}`);
    }

    const json = (await res.json()) as {
      stop_reason?: string;
      content?: AnthropicContentBlock[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const inTok = json.usage?.input_tokens ?? 300;
    const outTok = json.usage?.output_tokens ?? 200;
    totalCostUsd += (inTok / 1_000_000) * 0.8 + (outTok / 1_000_000) * 4.0;
    enforceCostCap(totalCostUsd, costCap);

    const blocks = json.content || [];
    const toolUses = blocks.filter(
      (b): b is Extract<AnthropicContentBlock, { type: "tool_use" }> =>
        b.type === "tool_use",
    );

    if (toolUses.length === 0 || json.stop_reason !== "tool_use") {
      const finalText = blocks
        .filter(
          (b): b is Extract<AnthropicContentBlock, { type: "text" }> =>
            b.type === "text",
        )
        .map((b) => b.text)
        .join("\n")
        .trim();

      if (!finalText) throw new Error("Anthropic empty tool response");
      return {
        text: finalText,
        provider: model,
        estimatedCostUsd: totalCostUsd,
        toolsUsed,
        citations: Array.from(citations),
      };
    }

    conversation.push({ role: "assistant", content: blocks });

    const toolResults: AnthropicContentBlock[] = [];
    for (const call of toolUses) {
      try {
        const out = await opts.executeTool(call.name, call.input || {});
        toolsUsed.push(call.name);
        out.citations?.forEach((u) => citations.add(u));
        totalCostUsd += out.estimatedCostUsd;
        toolResults.push({
          type: "tool_result",
          tool_use_id: call.id,
          content: out.summaryText,
        });
      } catch (err) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: call.id,
          is_error: true,
          content: err instanceof Error ? err.message : "Tool execution failed",
        });
      }
    }

    conversation.push({ role: "user", content: toolResults });
  }

  throw new Error("Claude exceeded maximum tool steps");
}

/**
 * Gemini أولاً مع مهلة، ثم Auto-Failover إلى OpenAI ثم Anthropic ثم Perplexity.
 */
export async function generateChat(
  messages: ChatMessage[],
  opts?: { costCapUsd?: number; temperature?: number; maxTokens?: number },
): Promise<ProviderResult> {
  const costCap = opts?.costCapUsd ?? DEFAULT_TASK_COST_CAP_USD;
  const temperature = opts?.temperature ?? 0.7;
  const maxTokens = opts?.maxTokens ?? MAX_TOKENS;
  const inputChars = messages.reduce((n, m) => n + m.content.length, 0);

  const hasGemini = Boolean(
    process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  );
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasPerplexity = Boolean(process.env.PERPLEXITY_API_KEY);

  if (!hasGemini && !hasOpenAI && !hasAnthropic && !hasPerplexity) {
    throw new Error("NO_AI_PROVIDER");
  }

  let lastError: unknown;

  if (hasGemini) {
    try {
      const result = await withTimeout(
        callGemini(messages, temperature, maxTokens),
        Math.min(FAILOVER_TIMEOUT_MS, 5500),
      );
      const cost = estimateCostUsd("gemini", inputChars, result.text.length);
      enforceCostCap(cost, costCap);
      return {
        text: result.text,
        provider: result.provider,
        estimatedCostUsd: cost,
      };
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.info(`[AI Failover] Gemini -> OpenAI/Anthropic (${msg.slice(0, 80)})`);
    }
  }

  if (hasOpenAI) {
    try {
      const result = await withTimeout(
        callOpenAI(messages, temperature, maxTokens),
        FAILOVER_TIMEOUT_MS,
      );
      const cost = estimateCostUsd("openai", inputChars, result.text.length);
      enforceCostCap(cost, costCap);
      return {
        text: result.text,
        provider: result.provider,
        estimatedCostUsd: cost,
      };
    } catch (err) {
      lastError = err;
      console.warn("OpenAI failed → failover:", err);
    }
  }

  if (hasAnthropic) {
    try {
      const result = await withTimeout(
        callAnthropic(messages, temperature),
        FAILOVER_TIMEOUT_MS,
      );
      const cost = estimateCostUsd("anthropic", inputChars, result.text.length);
      enforceCostCap(cost, costCap);
      return {
        text: result.text,
        provider: result.provider,
        estimatedCostUsd: cost,
      };
    } catch (err) {
      lastError = err;
      console.warn("Anthropic failed → failover:", err);
    }
  }

  if (hasPerplexity) {
    try {
      const result = await withTimeout(
        callPerplexityChat(messages, temperature),
        FAILOVER_TIMEOUT_MS,
      );
      const cost = estimateCostUsd(
        "perplexity",
        inputChars,
        result.text.length,
      );
      enforceCostCap(cost, costCap);
      return {
        text: result.text,
        provider: result.provider,
        estimatedCostUsd: cost,
      };
    } catch (err) {
      lastError = err;
      console.warn("Perplexity chat failed:", err);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("ALL_AI_PROVIDERS_FAILED");
}

export function resolveAiProvider():
  | "gemini"
  | "openai"
  | "anthropic"
  | "perplexity"
  | "none" {
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return "gemini";
  }
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.PERPLEXITY_API_KEY) return "perplexity";
  return "none";
}
