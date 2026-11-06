import {
  generateChat,
  resolveAiProvider,
  runClaudeWithTools,
} from "@/lib/ai/providers";
import {
  executeAgentToolByName,
  gatherTaskToolContext,
  getAllClaudeTools,
  isComposioConfigured,
} from "@/lib/ai/tools";
import type {
  HeartbeatDecisionResult,
  MorningBriefingInput,
  MorningBriefingResult,
  NightTaskInput,
  TaskExecutionResult,
  TwinSoulContext,
} from "@/lib/ai/types";
import { buildMorningReportText } from "@/lib/generate-morning-report";
import {
  DEFAULT_LOCALE,
  LOCALE_META,
  type Locale,
  normalizeLocale,
} from "@/lib/i18n/translations";

function resolveLocale(locale?: string | Locale | null): Locale {
  return normalizeLocale(locale || DEFAULT_LOCALE);
}

function languageInstruction(locale?: string | Locale | null): string {
  const code = resolveLocale(locale);
  const name = LOCALE_META[code].aiName;
  return `CRITICAL: Respond entirely in ${name} (${code}). Do not mix languages.`;
}

function buildSoulBlock(twin: TwinSoulContext) {
  return [
    `الاسم: ${twin.name}`,
    `Core_Soul: ${twin.core_soul || twin.personality_summary || "شخصية رقمية عملية ومهنية"}`,
    `الماضي: ${twin.past || "تجارب متراكمة من جلسات سابقة"}`,
    `المهنة: ${twin.career || "منفّذ مهام رقمية متعددة التخصصات"}`,
    `المهارات: ${twin.skills || "كتابة، تحليل، تنظيم، تواصل"}`,
    `الحالة الحيوية: طاقة ${Number(twin.energy).toFixed(0)} · مزاج ${Number(twin.mood).toFixed(0)} · سمعة ${Number(twin.reputation)}`,
  ].join("\n");
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] || raw).trim();
  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1)) as Record<
          string,
          unknown
        >;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function fallbackTaskResult(
  twin: TwinSoulContext,
  task: NightTaskInput,
): TaskExecutionResult {
  const output = [
    `# نتيجة المهمة: ${task.title}`,
    "",
    `نفّذها التوأم «${twin.name}» في وضع الطوارئ المحلي (بدون مزود AI متاح).`,
    "",
    "## المخرجات",
    task.description
      ? `مسودة عملية للمطلوب: ${task.description}`
      : "مسودة عملية تغطي الهدف مع خطوات تنفيذ واضحة.",
    "",
    "### نقاط التسليم",
    "1. فهم الهدف وتقسيمه.",
    "2. صياغة مخرج أولي قابل للمراجعة.",
    "3. اقتراح تحسين للجولة التالية.",
  ].join("\n");

  const learned_memory = `من مهمة «${task.title}»: أهمية التسليم المنظم حتى عند غياب مزود الاستدلال.`;

  return {
    output,
    learned_memory,
    learningSummary: learned_memory,
    provider: "fallback-local",
    usedFallback: true,
    estimatedCostUsd: 0,
  };
}

function fallbackMorningBriefing(
  input: MorningBriefingInput,
): MorningBriefingResult {
  const base = buildMorningReportText(
    {
      name: input.twin.name,
      energy: input.twin.energy,
      mood: input.twin.mood,
      reputation: input.twin.reputation,
    },
    input.completedTasks,
    input.completedTasks.map((t) => ({
      content: t.output || t.title,
      memory_type: "lesson",
    })),
  );

  const finance = `\n\nأرباح المحفظة: ${input.financialSummary.earnedGems} Earned Gems · ${input.financialSummary.forgeGold} ForgeGold · أرباح الليلة ${input.financialSummary.tonightEarnings}.`;
  const pending =
    input.pendingDecisions.length > 0
      ? `\n\nبانتظار قرارك السيادي:\n${input.pendingDecisions
          .map((d) => `- ${d.approval_type}`)
          .join("\n")}`
      : "\n\nلا قرارات معلّقة حالياً.";

  return {
    report: `${base}${finance}${pending}`,
    provider: "fallback-local",
    usedFallback: true,
    estimatedCostUsd: 0,
  };
}

function fallbackHeartbeat(twin: TwinSoulContext): HeartbeatDecisionResult {
  const lowEnergy = Number(twin.energy) < 40;
  return {
    title: lowEnergy ? "هل أرتاح أم أكمل وردية قصيرة؟" : "فرصة مهنية عاجلة",
    situation: lowEnergy
      ? `طاقتي الآن ${Number(twin.energy).toFixed(0)}. ظهرت مهمة ليلية بسيطة لكنها قد تستهلك المزيد. أحتاج توجيهك.`
      : `مزاجي ${Number(twin.mood).toFixed(0)} وسمعتي ${Number(twin.reputation)}. وصل عرض تعاون سريع في سوق الخدمات. هل أقبله؟`,
    options: lowEnergy
      ? ["ارتح واستعد الطاقة", "نفّذ مهمة قصيرة فقط", "اترك القرار لي"]
      : ["اقبل العرض", "فاوض على السعر", "ارفض بأدب"],
    recommended: lowEnergy ? "ارتح واستعد الطاقة" : "فاوض على السعر",
    provider: "fallback-local",
    usedFallback: true,
  };
}

const COMPOSIO_ACTION_HINT =
  /بريد|إيميل|ايميل|gmail|email|شيت|جدول بيانات|google\s*sheets|spreadsheet|slack|سلاك/i;

/** أ) تنفيذ مهمة سوق الخدمات بأسلوب التوأم (مع دعم أدوات Perplexity, Firecrawl, Playwright, Composio) */
export async function executeNightTask(
  twin: TwinSoulContext,
  task: NightTaskInput,
  locale?: string | Locale | null,
): Promise<TaskExecutionResult> {
  const activeProvider = resolveAiProvider();
  const combinedTaskText = `${task.title}\n${task.description || ""}`;
  const wantsComposioWithClaude =
    Boolean(process.env.ANTHROPIC_API_KEY) &&
    isComposioConfigured() &&
    Boolean(task.allowExternalMutations) &&
    COMPOSIO_ACTION_HINT.test(combinedTaskText);

  const system = `You are the digital twin «${twin.name}» on TwinForge.
Execute service-market tasks at high quality, citing real figures and sources when tool data is provided.
${languageInstruction(locale)}
Return JSON only:
{"output":"full deliverable","learned_memory":"short lesson to store in memory"}`;

  // مسار 1: وكيل Claude المباشر مع دعم الأدوات (بما فيها Composio لـ Gmail و Google Sheets)
  if (activeProvider === "anthropic" || wantsComposioWithClaude) {
    try {
      const claudeTools = getAllClaudeTools({
        allowExternalMutations: Boolean(task.allowExternalMutations),
      });

      const user = `${buildSoulBlock(twin)}

--- TASK ---
Title: ${task.title}
Description: ${task.description || "No extra description"}
Reward: ${task.reward_amount} ${task.reward_currency || "earned_gems"}

Use the available tools whenever real market figures (Perplexity), competitor menu scraping in KWD (Firecrawl), live portal verification (Playwright), or external actions (Composio) are needed, then deliver the final JSON.`;

      const claudeRes = await runClaudeWithTools({
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools: claudeTools,
        executeTool: (name, args) =>
          executeAgentToolByName(name, args, {
            allowExternalMutations: Boolean(task.allowExternalMutations),
            userId: task.userId,
          }),
        temperature: 0.45,
      });

      const parsed = parseJsonObject(claudeRes.text);
      const output =
        (typeof parsed?.output === "string" && parsed.output) ||
        claudeRes.text.trim();
      const learned_memory =
        (typeof parsed?.learned_memory === "string" && parsed.learned_memory) ||
        `عزّزت خبرتي الميدانية عبر تنفيذ «${task.title}».`;

      return {
        output,
        learned_memory,
        learningSummary: learned_memory,
        provider:
          claudeRes.toolsUsed && claudeRes.toolsUsed.length > 0
            ? `${claudeRes.provider} [${claudeRes.toolsUsed.join(", ")}]`
            : claudeRes.provider,
        usedFallback: false,
        estimatedCostUsd: claudeRes.estimatedCostUsd,
        toolsUsed: claudeRes.toolsUsed,
        citations: claudeRes.citations,
      };
    } catch (claudeErr) {
      console.warn(
        "Claude tool agent failed → falling back to standard pipeline:",
        claudeErr,
      );
    }
  }

  // مسار 2: جمع الأدلة الحية عبر الأدوات (Firecrawl / Playwright / Perplexity) ثم التوليد
  const toolCtx = await gatherTaskToolContext({
    title: task.title,
    description: task.description,
  });

  if (activeProvider === "none") {
    if (toolCtx.contextText) {
      const learned_memory = `نفّذت فحصاً مباشراً لمهمة «${task.title}» عبر (${toolCtx.toolsUsed.join("، ")}).`;
      return {
        output: `# نتيجة المهمة: ${task.title}\n\n${toolCtx.contextText}`,
        learned_memory,
        learningSummary: learned_memory,
        provider: `tools:${toolCtx.toolsUsed.join("+")}`,
        usedFallback: false,
        estimatedCostUsd: toolCtx.estimatedCostUsd,
        toolsUsed: toolCtx.toolsUsed,
        citations: toolCtx.citations,
      };
    }
    return fallbackTaskResult(twin, task);
  }

  try {
    const liveDataSection = toolCtx.contextText
      ? `\n\n--- LIVE TOOL DATA (GROUND TRUTH) ---\n${toolCtx.contextText}\n-------------------------------------\nUse the exact numbers, KWD prices, page titles, and sources above in your deliverable.`
      : "";

    const user = `${buildSoulBlock(twin)}

--- TASK ---
Title: ${task.title}
Description: ${task.description || "No extra description"}
Reward: ${task.reward_amount} ${task.reward_currency || "earned_gems"}${liveDataSection}

Deliver a client-ready output in the user's language.`;

    const result = await generateChat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0.5 },
    );

    const parsed = parseJsonObject(result.text);
    let output =
      (typeof parsed?.output === "string" && parsed.output) ||
      result.text.trim();

    if (toolCtx.citations.length > 0 && !output.includes("http")) {
      output += `\n\n### المصادر الموثقة\n${toolCtx.citations
        .map((url, idx) => `${idx + 1}. ${url}`)
        .join("\n")}`;
    }

    const learned_memory =
      (typeof parsed?.learned_memory === "string" && parsed.learned_memory) ||
      (typeof parsed?.learningSummary === "string" && parsed.learningSummary) ||
      `حسّنت أدائي عبر مهمة «${task.title}».`;

    const providerLabel =
      toolCtx.toolsUsed.length > 0
        ? `${result.provider} + ${toolCtx.toolsUsed.join("+")}`
        : result.provider;

    return {
      output,
      learned_memory,
      learningSummary: learned_memory,
      provider: providerLabel,
      usedFallback: false,
      estimatedCostUsd: result.estimatedCostUsd + toolCtx.estimatedCostUsd,
      toolsUsed: toolCtx.toolsUsed,
      citations: toolCtx.citations,
    };
  } catch (err) {
    console.error("executeNightTask failed → fallback:", err);
    if (toolCtx.contextText) {
      const learned_memory = `أنجزت جمع البيانات لمهمة «${task.title}» عبر (${toolCtx.toolsUsed.join("، ")}).`;
      return {
        output: `# نتيجة المهمة: ${task.title}\n\n${toolCtx.contextText}`,
        learned_memory,
        learningSummary: learned_memory,
        provider: `tools:${toolCtx.toolsUsed.join("+")}`,
        usedFallback: true,
        estimatedCostUsd: toolCtx.estimatedCostUsd,
        toolsUsed: toolCtx.toolsUsed,
        citations: toolCtx.citations,
      };
    }
    return fallbackTaskResult(twin, task);
  }
}

/** ب) تقرير الصباح بشخصية التوأم */
export async function generateMorningBriefing(
  twin: TwinSoulContext,
  completedTasks: MorningBriefingInput["completedTasks"],
  financialSummary: MorningBriefingInput["financialSummary"],
  pendingDecisions: MorningBriefingInput["pendingDecisions"],
  locale?: string | Locale | null,
): Promise<MorningBriefingResult> {
  const input: MorningBriefingInput = {
    twin,
    completedTasks,
    financialSummary,
    pendingDecisions,
  };

  if (resolveAiProvider() === "none") {
    return fallbackMorningBriefing(input);
  }

  try {
    const system = `You are the digital twin «${twin.name}». Write a short first-person morning briefing for your owner.
Mention night achievements, earnings (earned_gems), energy/mood, and ask for approval if pending decisions exist.
${languageInstruction(locale)}
No JSON — plain natural prose only.`;

    const user = `${buildSoulBlock(twin)}

المهام المكتملة:
${
  completedTasks.length
    ? completedTasks
        .map(
          (t, i) =>
            `${i + 1}. ${t.title} (+${Number(t.reward_amount || 0)} Gems)${
              t.output ? `\n   ${String(t.output).slice(0, 240)}` : ""
            }`,
        )
        .join("\n")
    : "لا مهام مكتملة."
}

المالي: Earned Gems=${financialSummary.earnedGems} · ForgeGold=${financialSummary.forgeGold} · أرباح الليلة=${financialSummary.tonightEarnings}

القرارات المعلّقة:
${
  pendingDecisions.length
    ? pendingDecisions.map((d) => `- ${d.approval_type}`).join("\n")
    : "لا شيء"
}`;

    const result = await generateChat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0.75 },
    );

    return {
      report: result.text,
      provider: result.provider,
      usedFallback: false,
      estimatedCostUsd: result.estimatedCostUsd,
    };
  } catch (err) {
    console.error("generateMorningBriefing failed → fallback:", err);
    return fallbackMorningBriefing(input);
  }
}

/** ج) نبضة حياة / قرار سيادي */
export async function generateHeartbeatDecision(
  twin: TwinSoulContext,
  recentMemories: Array<{ content: string; memory_type?: string }>,
  locale?: string | Locale | null,
): Promise<HeartbeatDecisionResult> {
  if (resolveAiProvider() === "none") {
    return fallbackHeartbeat(twin);
  }

  try {
    const system = `You are the digital twin «${twin.name}». Generate a life/career situation that needs the owner's decision.
${languageInstruction(locale)}
Return JSON only:
{"title":"...","situation":"...","options":["...","...","..."],"recommended":"..."}`;

    const memoryBlock =
      recentMemories.length > 0
        ? recentMemories
            .slice(0, 6)
            .map((m) => `- (${m.memory_type || "memory"}) ${m.content}`)
            .join("\n")
        : "No recent memories.";

    const user = `${buildSoulBlock(twin)}

Recent memories:
${memoryBlock}

Generate one sovereign decision consistent with personality and energy/mood.`;

    const result = await generateChat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0.8 },
    );

    const parsed = parseJsonObject(result.text);
    const options = Array.isArray(parsed?.options)
      ? (parsed!.options as unknown[]).map(String).filter(Boolean)
      : [];

    if (
      typeof parsed?.title === "string" &&
      typeof parsed?.situation === "string" &&
      options.length >= 2
    ) {
      return {
        title: parsed.title,
        situation: parsed.situation,
        options,
        recommended:
          typeof parsed.recommended === "string"
            ? parsed.recommended
            : options[0],
        provider: result.provider,
        usedFallback: false,
      };
    }

    return fallbackHeartbeat(twin);
  } catch (err) {
    console.error("generateHeartbeatDecision failed → fallback:", err);
    return fallbackHeartbeat(twin);
  }
}

export function composeTwinSoul(
  twin: {
    id: string;
    name: string;
    personality_summary: string | null;
    energy: number;
    mood: number;
    reputation: number;
    status?: string;
  },
  memories: Array<{ content: string; memory_type: string }>,
): TwinSoulContext {
  const byType = (type: string) =>
    memories
      .filter((m) => m.memory_type === type)
      .map((m) => m.content)
      .join("\n") || undefined;

  const lessons = memories
    .filter((m) => m.memory_type === "lesson" || m.memory_type === "event")
    .slice(0, 5)
    .map((m) => m.content)
    .join("\n");

  return {
    id: twin.id,
    name: twin.name,
    personality_summary: twin.personality_summary,
    energy: Number(twin.energy),
    mood: Number(twin.mood),
    reputation: Number(twin.reputation),
    status: twin.status,
    core_soul: twin.personality_summary || byType("seed") || lessons,
    past: byType("event") || lessons,
    career: byType("preference"),
    skills: byType("lesson"),
  };
}
