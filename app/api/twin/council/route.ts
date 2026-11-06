import { NextResponse } from "next/server";
import { generateChat, resolveAiProvider } from "@/lib/ai/providers";
import { composeTwinSoul } from "@/lib/ai/twin-engine";
import { checkInferenceBudget } from "@/lib/inference-budget";
import {
  DEFAULT_LOCALE,
  LOCALE_META,
  normalizeLocale,
} from "@/lib/i18n/translations";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type CouncilRequestBody = {
  mode?: "direct" | "council";
  prompt?: string;
  twinId?: string;
  locale?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
};

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

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول أولاً" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as CouncilRequestBody;
    const mode = body.mode === "council" ? "council" : "direct";
    const prompt = (body.prompt || "").trim();
    if (!prompt) {
      return NextResponse.json(
        { error: "أدخل رسالتك أو سؤالك أولاً" },
        { status: 400 },
      );
    }

    const locale = normalizeLocale(body.locale || DEFAULT_LOCALE);
    const langName = LOCALE_META[locale].aiName;

    const budget = await checkInferenceBudget(user.id, 0.02, body.twinId);
    if (!budget.allowed) {
      return NextResponse.json(
        { error: "تم بلوغ حد الاستدلال اليومي ($50.00)" },
        { status: 402 },
      );
    }

    const { data: allTwins } = await supabase
      .from("twins")
      .select("id, name, personality_summary, energy, mood, reputation, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    const fleet = allTwins || [];
    if (fleet.length === 0) {
      return NextResponse.json(
        { error: "أنشئ توأماً أولاً للبدء" },
        { status: 400 },
      );
    }

    // =======================================================================
    // الوضع (أ): التخاطب المباشر مع التوأم المختار + التعلم التلقائي
    // =======================================================================
    if (mode === "direct") {
      const targetTwin =
        fleet.find((t) => t.id === body.twinId) || fleet[0];

      const { data: memories } = await supabase
        .from("twin_memories")
        .select("content, memory_type")
        .eq("twin_id", targetTwin.id)
        .order("created_at", { ascending: false })
        .limit(10);

      const soul = composeTwinSoul(targetTwin, memories || []);
      const prefBlock = (memories || [])
        .filter((m) => m.memory_type === "preference")
        .slice(0, 5)
        .map((m) => `- ${m.content}`)
        .join("\n");

      let replyText = "";
      let learnedInsight = `توجيه مباشر من المالك: «${prompt.slice(0, 140)}» — التركيز على سرعة الإنجاز والدقة التنفيذية.`;
      let providerUsed = "fallback-local";

      if (resolveAiProvider() !== "none") {
        try {
          const historyLines = (body.history || [])
            .slice(-4)
            .map((h) => `${h.role === "user" ? "Owner" : targetTwin.name}: ${h.content}`)
            .join("\n");

          const sys = `أنت التوأم الرقمي السيادي «${targetTwin.name}» على منصة TwinForge.
تتحدث مباشرة مع مالكك بأسلوبك الشخصي المتزن والذكي.
CRITICAL: Respond entirely in ${langName} (${locale}).
Return JSON only:
{"reply":"ردك المباشر الوافي والعملي لمالكك","learned_preference":"جملة واحدة تصف ما تعلمته عن أسلوب أو أولويات المالك من هذه الرسالة"}`;

          const usr = `هويتك: ${soul.core_soul || targetTwin.personality_summary || "توأم تنفيذي خبير"}
الطاقة: ${targetTwin.energy} · المزاج: ${targetTwin.mood} · السمعة: ${targetTwin.reputation}
تفضيلات المالك المتعلمة سابقاً:
${prefBlock || "لا توجد تفضيلات مسجلة بعد."}

${historyLines ? `سياق الحوار الأخير:\n${historyLines}\n` : ""}رسالة المالك الآن: ${prompt}`;

          const ai = await generateChat(
            [
              { role: "system", content: sys },
              { role: "user", content: usr },
            ],
            { temperature: 0.6, maxTokens: 1100 },
          );
          providerUsed = ai.provider;
          const parsed = parseJsonObject(ai.text);
          replyText =
            (typeof parsed?.reply === "string" && parsed.reply.trim()) ||
            ai.text.trim();
          if (
            typeof parsed?.learned_preference === "string" &&
            parsed.learned_preference.trim()
          ) {
            learnedInsight = parsed.learned_preference.trim();
          }
        } catch (err) {
          console.warn("Direct twin chat fallback:", err);
        }
      }

      if (!replyText) {
        replyText = `أهلاً بك يا شريكي السيادي. أنا «${targetTwin.name}» — استلمت توجيهك حول: «${prompt}». استناداً إلى خبرتي وطاقتي الحالية (${Math.round(Number(targetTwin.energy))}/100)، أنصح بتقسيم الهدف إلى مسار تنفيذي فوري عالي العائد مع أتمتة المتابعة المتكررة وتوثيق النتائج في سجلنا المالي.`;
      }

      const { data: savedMem } = await supabase
        .from("twin_memories")
        .insert({
          twin_id: targetTwin.id,
          content: learnedInsight,
          memory_type: "preference",
          importance: 0.8,
        })
        .select("id, content, memory_type, created_at")
        .maybeSingle();

      return NextResponse.json({
        ok: true,
        mode: "direct",
        twinId: targetTwin.id,
        twinName: targetTwin.name,
        reply: replyText,
        learnedMemory: savedMem || {
          id: `mem-${Date.now()}`,
          content: learnedInsight,
          memory_type: "preference",
          created_at: new Date().toISOString(),
        },
        provider: providerUsed,
      });
    }

    // =======================================================================
    // الوضع (ب): مجلس التوأمين المشترك (Founder & Son Synergy Council)
    // =======================================================================
    const founderTwin =
      fleet.find((t) => /مؤسس|قائد|founder|تنفيذي/i.test(t.name)) || fleet[0];
    const sonTwin =
      fleet.find(
        (t) => t.id !== founderTwin.id && /ابن|مبتكر|son|ذكي/i.test(t.name),
      ) ||
      fleet.find((t) => t.id !== founderTwin.id) ||
      founderTwin;

    const { data: councilMemories } = await supabase
      .from("twin_memories")
      .select("twin_id, content, memory_type")
      .in("twin_id", Array.from(new Set([founderTwin.id, sonTwin.id])))
      .order("created_at", { ascending: false })
      .limit(12);

    const ownerPrefs = (councilMemories || [])
      .filter((m) => m.memory_type === "preference" || m.memory_type === "lesson")
      .slice(0, 6)
      .map((m) => `- ${m.content}`)
      .join("\n");

    let councilResult = {
      projectTitle: prompt.slice(0, 65),
      founderName: founderTwin.name,
      sonName:
        sonTwin.id === founderTwin.id
          ? "المبتكر الذكي (توأم الابن)"
          : sonTwin.name,
      founderVerdict: {
        headline: "جدوى استراتيجية ومالية واعدة مع قابلية توسع عالية وهوامش ربح محمية",
        strategicPillars: [
          "التركيز على شريحة العملاء الأعلى ربحية بعقود اشتراك متكررة واضحة",
          "ضبط التكلفة التشغيلية عند الحد الأدنى وربط التسعير بالقيمة الفعلية المحققة",
          "بناء ميزة تنافسية يصعب تقليدها عبر البيانات المتراكمة وجودة التسليم",
        ],
        financialOutlook:
          "استرداد رأس المال التشغيلي سريع مع هامش ربح صافي مستهدف يتجاوز 68% وعائد مستدام بالـ Earned Gems.",
        roiScore: 92,
      },
      sonVerdict: {
        headline: "معمارية وكلاء ذكاء اصطناعي وأتمتة متكاملة تعمل على مدار الساعة",
        automationWorkflows: [
          "بناء وكيل استقبال وتأهيل آلي للطلبات يحلل احتياج العميل خلال ثوانٍ",
          "ربط مسار التنفيذ بأدوات البحث وسحب البيانات وتوليد التقارير تلقائياً",
          "لوحة تتبع ذكية تتعلم من ردود العملاء وتطوّر جودة المخرجات ذاتياً",
        ],
        techStack: "Next.js + Multi-LLM Agents + Webhook Pipelines + Supabase Vector Memory",
        innovationScore: 95,
      },
      synergyPlan: {
        executiveSummary:
          "دمج الحوكمة المالية الصارمة لتوأم المؤسس مع محرك الأتمتة الفوري لتوأم الابن لإطلاق نسخة تنفيذية أولى سريعة العائد وقابلة للتوسع.",
        actionSteps: [
          "المرحلة 1 (توأم المؤسس): اعتماد هيكل التسعير والعرض التنافسي ومؤشرات الربحية",
          "المرحلة 2 (توأم الابن): تجهيز مسار الأتمتة الذكي وربط قنوات التنفيذ الآلي",
          "المرحلة 3 (مشتركة): إطلاق التجربة على أول شريحة عملاء وقياس معدل التحويل",
          "المرحلة 4 (توسع): أتمتة الدورة بالكامل وتحويلها إلى أصل يدر Earned Gems ليلياً",
        ],
        estimatedGems: 380,
        timeline: "48 ساعة لإطلاق النسخة التنفيذية الأولى",
      },
      learnedPreference: `جلسة مجلس مشترك حول «${prompt.slice(0, 100)}» — المالك يجمع بين الجدوى المالية المحكمة والأتمتة الذكية السريعة.`,
    };

    let providerUsed = "fallback-local";

    if (resolveAiProvider() !== "none") {
      try {
        const sys = `أنت تدير "مجلس التوأمين المشترك" (Founder & Son Synergy Council) على منصة TwinForge.
الشخصية الأولى: «${founderTwin.name}» (${founderTwin.personality_summary || "قائد استراتيجي ومالي حاسم"}).
الشخصية الثانية: «${councilResult.sonName}» (${sonTwin.personality_summary || "مبتكر مسارات أتمتة ووكلاء ذكاء اصطناعي"}).
CRITICAL: Respond entirely in ${langName} (${locale}).
Return valid JSON ONLY matching this exact schema:
{
  "projectTitle": "عنوان تنفيذي قوي للفكرة",
  "founderVerdict": {
    "headline": "خلاصة الرؤية الاستراتيجية والمالية في جملة قوية",
    "strategicPillars": ["ركيزة 1", "ركيزة 2", "ركيزة 3"],
    "financialOutlook": "تحليل العائد والتسعير والمخاطر",
    "roiScore": 92
  },
  "sonVerdict": {
    "headline": "خلاصة ابتكار الأتمتة والذكاء الاصطناعي في جملة قوية",
    "automationWorkflows": ["مسار أتمتة 1", "مسار أتمتة 2", "مسار أتمتة 3"],
    "techStack": "التقنيات والوكلاء المقترحون",
    "innovationScore": 96
  },
  "synergyPlan": {
    "executiveSummary": "ملخص الخطة التنفيذية المشتركة بين المؤسس والابن",
    "actionSteps": ["خطوة 1", "خطوة 2", "خطوة 3", "خطوة 4"],
    "estimatedGems": 380,
    "timeline": "الإطار الزمني للتنفيذ"
  },
  "learnedPreference": "ما تعلمه التوأمان عن طموح وأسلوب المالك من هذا الطرح"
}`;

        const usr = `فكرة أو سؤال المالك المعروض على المجلس:
«${prompt}»

ذاكرة وتفضيلات المالك السابقة:
${ownerPrefs || "جلسة تأسيسية جديدة."}`;

        const ai = await generateChat(
          [
            { role: "system", content: sys },
            { role: "user", content: usr },
          ],
          { temperature: 0.65, maxTokens: 1600 },
        );
        providerUsed = ai.provider;

        const parsed = parseJsonObject(ai.text);
        if (parsed && typeof parsed === "object") {
          const fv = (parsed.founderVerdict || {}) as Record<string, unknown>;
          const sv = (parsed.sonVerdict || {}) as Record<string, unknown>;
          const sp = (parsed.synergyPlan || {}) as Record<string, unknown>;

          councilResult = {
            ...councilResult,
            projectTitle:
              typeof parsed.projectTitle === "string" && parsed.projectTitle
                ? parsed.projectTitle
                : councilResult.projectTitle,
            founderVerdict: {
              headline:
                typeof fv.headline === "string" && fv.headline
                  ? fv.headline
                  : councilResult.founderVerdict.headline,
              strategicPillars:
                Array.isArray(fv.strategicPillars) && fv.strategicPillars.length > 0
                  ? fv.strategicPillars.map(String)
                  : councilResult.founderVerdict.strategicPillars,
              financialOutlook:
                typeof fv.financialOutlook === "string" && fv.financialOutlook
                  ? fv.financialOutlook
                  : councilResult.founderVerdict.financialOutlook,
              roiScore: Math.min(
                99,
                Math.max(60, Number(fv.roiScore) || councilResult.founderVerdict.roiScore),
              ),
            },
            sonVerdict: {
              headline:
                typeof sv.headline === "string" && sv.headline
                  ? sv.headline
                  : councilResult.sonVerdict.headline,
              automationWorkflows:
                Array.isArray(sv.automationWorkflows) &&
                sv.automationWorkflows.length > 0
                  ? sv.automationWorkflows.map(String)
                  : councilResult.sonVerdict.automationWorkflows,
              techStack:
                typeof sv.techStack === "string" && sv.techStack
                  ? sv.techStack
                  : councilResult.sonVerdict.techStack,
              innovationScore: Math.min(
                99,
                Math.max(
                  65,
                  Number(sv.innovationScore) || councilResult.sonVerdict.innovationScore,
                ),
              ),
            },
            synergyPlan: {
              executiveSummary:
                typeof sp.executiveSummary === "string" && sp.executiveSummary
                  ? sp.executiveSummary
                  : councilResult.synergyPlan.executiveSummary,
              actionSteps:
                Array.isArray(sp.actionSteps) && sp.actionSteps.length > 0
                  ? sp.actionSteps.map(String)
                  : councilResult.synergyPlan.actionSteps,
              estimatedGems: Math.max(
                50,
                Number(sp.estimatedGems) || councilResult.synergyPlan.estimatedGems,
              ),
              timeline:
                typeof sp.timeline === "string" && sp.timeline
                  ? sp.timeline
                  : councilResult.synergyPlan.timeline,
            },
            learnedPreference:
              typeof parsed.learnedPreference === "string" &&
              parsed.learnedPreference.trim()
                ? parsed.learnedPreference.trim()
                : councilResult.learnedPreference,
          };
        }
      } catch (err) {
        console.warn("Synergy council fallback:", err);
      }
    }

    // حفظ التعلم في ذاكرة كلا التوأمين
    const targetIds = Array.from(new Set([founderTwin.id, sonTwin.id]));
    const memRows = targetIds.map((id) => ({
      twin_id: id,
      content: councilResult.learnedPreference,
      memory_type: "preference",
      importance: 0.88,
    }));

    const { data: insertedMemories } = await supabase
      .from("twin_memories")
      .insert(memRows)
      .select("id, content, memory_type, created_at");

    return NextResponse.json({
      ok: true,
      mode: "council",
      provider: providerUsed,
      council: councilResult,
      learnedMemory: insertedMemories?.[0] || null,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "فشل تنفيذ جلسة التخاطب";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
