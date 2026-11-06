export type PerplexityCitation = {
  url: string;
  title?: string;
  date?: string;
};

export type PerplexityMarketResult = {
  answer: string;
  citations: PerplexityCitation[];
  model: string;
  estimatedCostUsd: number;
};

export const DEFAULT_KUWAIT_RESTAURANT_ANALYST_PROMPT =
  "أنت محلل أسواق مطاعم خبير في الكويت والخليج. قدم إجابات دقيقة مدعومة بالمصادر والأرقام.";

type PerplexityApiResponse = {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string;
      annotations?: Array<{
        type?: string;
        url_citation?: { url?: string; title?: string; date?: string };
      }>;
    };
  }>;
  citations?: string[];
  annotations?: Array<{
    type?: string;
    url_citation?: { url?: string; title?: string; date?: string };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
};

export function isPerplexityConfigured(): boolean {
  return Boolean(process.env.PERPLEXITY_API_KEY);
}

/**
 * 1. خدمة Perplexity (sonar-pro) للبحث العميق وتحليل أسواق المطاعم في الكويت والخليج
 */
export async function analyzeMarketWithPerplexity(
  query: string,
  opts?: {
    systemPrompt?: string;
    model?: string;
    temperature?: number;
    timeoutMs?: number;
  },
): Promise<PerplexityMarketResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("مفتاح PERPLEXITY_API_KEY غير مضبوط في متغيرات البيئة");
  }

  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    throw new Error("استعلام البحث مطلوب لخدمة Perplexity");
  }

  const model = opts?.model || process.env.PERPLEXITY_MODEL || "sonar-pro";
  const systemPrompt =
    opts?.systemPrompt || DEFAULT_KUWAIT_RESTAURANT_ANALYST_PROMPT;
  const timeoutMs = opts?.timeoutMs ?? 25_000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: opts?.temperature ?? 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: trimmedQuery },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Perplexity ${res.status}: ${errBody.slice(0, 300)}`);
    }

    const data = (await res.json()) as PerplexityApiResponse;
    const answer = (data.choices?.[0]?.message?.content || "").trim();
    if (!answer) {
      throw new Error("استجابة Perplexity فارغة");
    }

    const citationMap = new Map<string, PerplexityCitation>();

    const allAnnotations = [
      ...(data.annotations || []),
      ...(data.choices?.[0]?.message?.annotations || []),
    ];
    for (const item of allAnnotations) {
      const url = item.url_citation?.url;
      if (url && !citationMap.has(url)) {
        citationMap.set(url, {
          url,
          title: item.url_citation?.title,
          date: item.url_citation?.date,
        });
      }
    }

    for (const rawUrl of data.citations || []) {
      if (typeof rawUrl === "string" && rawUrl && !citationMap.has(rawUrl)) {
        citationMap.set(rawUrl, { url: rawUrl });
      }
    }

    const promptTokens =
      data.usage?.prompt_tokens ?? Math.ceil(trimmedQuery.length / 4);
    const completionTokens =
      data.usage?.completion_tokens ?? Math.ceil(answer.length / 4);
    // sonar-pro approx pricing ($3 / 1M in, $15 / 1M out + search request)
    const estimatedCostUsd =
      (promptTokens / 1_000_000) * 3 +
      (completionTokens / 1_000_000) * 15 +
      0.005;

    return {
      answer,
      citations: Array.from(citationMap.values()),
      model: data.model || model,
      estimatedCostUsd,
    };
  } finally {
    clearTimeout(timer);
  }
}
