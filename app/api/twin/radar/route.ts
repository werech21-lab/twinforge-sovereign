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

export type RadarOpportunity = {
  id: string;
  title: string;
  description: string;
  category: string;
  expectedSuccessRate: number;
  estimatedGems: number;
  whyMatched: string;
  aiStrategy: string;
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

function buildFallbackOpportunities(twinName: string): RadarOpportunity[] {
  return [
    {
      id: `opp-${Date.now()}-1`,
      title: "وكيل أتمتة متابعة العملاء المحتملين وإغلاق العروض السريعة",
      description:
        "بناء مسار ذكي يستقبل استفسارات العملاء، يصنف الميزانية، ويرسل عرض سعر مخصص مع تذكير تلقائي لرفع معدل الإغلاق.",
      category: "ai_automation",
      expectedSuccessRate: 94,
      estimatedGems: 320,
      whyMatched: `متوافق مع خبرة «${twinName}» وتفضيل المالك للأنظمة المؤتمتة ذات العائد المباشر.`,
      aiStrategy: "تصنيف النية عبر LLM + توليد عرض فوري + متابعة مجدولة خلال 24 ساعة.",
    },
    {
      id: `opp-${Date.now()}-2`,
      title: "رادار مراقبة تسعير المنافسين وتنبيهات الفجوة الربحية اليومية",
      description:
        "رصد تغيرات الأسعار والعروض في السوق المستهدف تلقائياً واقتراح تعديلات فورية تحمي هامش الربح وتزيد المبيعات.",
      category: "analysis",
      expectedSuccessRate: 91,
      estimatedGems: 260,
      whyMatched: "يستفيد من أدوات البحث وسحب البيانات المدمجة لتقديم قرارات مدعومة بالأرقام.",
      aiStrategy: "سحب دوري عبر Firecrawl + تحليل مرونة السعر عبر Perplexity + ملخص تنفيذي.",
    },
    {
      id: `opp-${Date.now()}-3`,
      title: "نظام تحويل التقارير التشغيلية إلى حزم محتوى واستشارات B2B",
      description:
        "تحويل مخرجات التحليل الليلي إلى تقارير قطاعية جاهزة للبيع للشركات الناشئة ورواد الأعمال في سوق الخدمات.",
      category: "saas_growth",
      expectedSuccessRate: 88,
      estimatedGems: 410,
      whyMatched: "يعظّم العائد من المهام الليلية للتوأم ويحول المعرفة المتراكمة إلى دخل إضافي.",
      aiStrategy: "تجميع الرؤى القطاعية + تنسيق شهادة تنفيذية + نشر عرض في سوق الخدمات.",
    },
  ];
}

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const requestedTwinId = searchParams.get("twinId");
    const refresh = searchParams.get("refresh") === "1";
    const locale = normalizeLocale(searchParams.get("locale") || DEFAULT_LOCALE);
    const langName = LOCALE_META[locale].aiName;

    const { data: twins } = await supabase
      .from("twins")
      .select("id, name, personality_summary, energy, mood, reputation, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    const twin =
      (twins || []).find((t) => t.id === requestedTwinId) || (twins || [])[0];
    if (!twin) {
      return NextResponse.json({
        ok: true,
        opportunities: [],
        activeTasks: [],
        learnedPreferencesCount: 0,
      });
    }

    const [{ data: memories }, { data: activeTasks }] = await Promise.all([
      supabase
        .from("twin_memories")
        .select("content, memory_type")
        .eq("twin_id", twin.id)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("marketplace_tasks")
        .select("*")
        .eq("twin_id", twin.id)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    const prefMemories = (memories || []).filter(
      (m) => m.memory_type === "preference",
    );
    let opportunities = buildFallbackOpportunities(twin.name);
    if (prefMemories.length > 0) {
      const latestPref = prefMemories[0].content.slice(0, 95);
      opportunities = opportunities.map((opp, idx) =>
        idx === 0
          ? {
              ...opp,
              whyMatched: `متوائمة مع بصمة قراراتك المتعلمة (${prefMemories.length} إشارات): «${latestPref}...»`,
            }
          : opp,
      );
    }
    let provider = "sovereign-memory-radar";

    if (refresh && resolveAiProvider() !== "none") {
      const budget = await checkInferenceBudget(
        user.id,
        refresh ? 0.01 : 0,
        twin.id,
      );
      if (budget.allowed) {
        try {
          const soul = composeTwinSoul(twin, memories || []);
          const prefText = prefMemories
            .slice(0, 6)
            .map((m) => `- ${m.content}`)
            .join("\n");

          const sys = `أنت محرك "رادار الفرص السيادية" للتوأم «${twin.name}» على منصة TwinForge.
ولّد 3 فرص أعمال/أتمتة ذكية وعملية جداً تناسب شخصية التوأم وتفضيلات مالكه المتعلمة.
CRITICAL: Respond entirely in ${langName} (${locale}).
Return valid JSON ONLY:
{
  "opportunities": [
    {
      "title": "عنوان الفرصة الذكية",
      "description": "وصف عملي مختصر لكيفية التنفيذ والقيمة المضافة",
      "category": "ai_automation",
      "expectedSuccessRate": 93,
      "estimatedGems": 340,
      "whyMatched": "كيف ارتبطت هذه الفرصة بأسلوب وقرارات المالك السابقة",
      "aiStrategy": "خطة التوأم المختصرة لتنفيذها فوراً"
    }
  ]
}`;

          const usr = `بيانات التوأم:
الاسم: ${twin.name}
الروح والمهارات: ${soul.core_soul || twin.personality_summary || "وكيل أتمتة وأعمال"}
الطاقة: ${twin.energy} · السمعة: ${twin.reputation}

بصمة أسلوب وقرارات المالك المتعلمة (${prefMemories.length} إشارات):
${prefText || "المالك يفضّل المشاريع المؤتمتة عالية الربحية وسريعة التنفيذ."}`;

          const ai = await generateChat(
            [
              { role: "system", content: sys },
              { role: "user", content: usr },
            ],
            { temperature: refresh ? 0.82 : 0.65, maxTokens: 1300 },
          );
          provider = ai.provider;

          const parsed = parseJsonObject(ai.text);
          if (Array.isArray(parsed?.opportunities) && parsed.opportunities.length > 0) {
            opportunities = (parsed.opportunities as Array<Record<string, unknown>>)
              .slice(0, 3)
              .map((item, idx) => ({
                id: `opp-${Date.now()}-${idx + 1}`,
                title: String(item.title || opportunities[idx]?.title || "فرصة أتمتة ذكية"),
                description: String(
                  item.description || opportunities[idx]?.description || "",
                ),
                category: String(item.category || "ai_automation"),
                expectedSuccessRate: Math.min(
                  98,
                  Math.max(72, Number(item.expectedSuccessRate) || 90),
                ),
                estimatedGems: Math.max(
                  80,
                  Math.round(Number(item.estimatedGems) || 280),
                ),
                whyMatched: String(
                  item.whyMatched ||
                    "مبنية على تحليل قراراتك وتوجيهاتك الأخيرة للتوأم.",
                ),
                aiStrategy: String(
                  item.aiStrategy || "تقسيم آلي وتنفيذ مباشر عبر أدوات التوأم.",
                ),
              }));
          }
        } catch (err) {
          console.warn("Opportunity radar AI fallback:", err);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      twinId: twin.id,
      twinName: twin.name,
      provider,
      learnedPreferencesCount: prefMemories.length,
      opportunities,
      activeTasks: activeTasks || [],
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "فشل تحميل رادار الفرص";
    return NextResponse.json({ error: message }, { status: 400 });
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

    const body = (await request.json()) as {
      action?: "deploy" | "dismiss";
      twinId?: string;
      opportunity?: Partial<RadarOpportunity>;
    };

    const { data: twin } = await supabase
      .from("twins")
      .select("id, name")
      .eq("id", body.twinId || "")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!twin) {
      return NextResponse.json({ error: "التوأم غير موجود" }, { status: 404 });
    }

    const opp = body.opportunity || {};
    const title = String(opp.title || "مهمة سيادية من رادار الفرص").trim();

    if (body.action === "dismiss") {
      const dismissNote = `إشارة تعلم ذاتي من المالك: استبعد فرصة «${title}» — يفضّل التركيز على مسارات ذات أولوية وعائد مختلف.`;
      const { data: mem } = await supabase
        .from("twin_memories")
        .insert({
          twin_id: twin.id,
          content: dismissNote,
          memory_type: "preference",
          importance: 0.72,
        })
        .select("id, content, memory_type, created_at")
        .maybeSingle();

      return NextResponse.json({ ok: true, dismissed: true, learnedMemory: mem });
    }

    const description = String(opp.description || "").trim();
    const category = String(opp.category || "ai_automation");
    const expectedSuccessRate = Math.min(
      99,
      Math.max(50, Math.round(Number(opp.expectedSuccessRate) || 90)),
    );
    const rewardGems = Math.max(25, Number(opp.estimatedGems) || 250);
    const aiStrategy = String(opp.aiStrategy || "").trim();

    // 1) نشر العرض في سوق الخدمات
    const { data: listing } = await supabase
      .from("service_listings")
      .insert({
        twin_id: twin.id,
        title,
        description: `${description}${aiStrategy ? `\n\nخطة التنفيذ: ${aiStrategy}` : ""}`,
        category,
        price_earned_gems: rewardGems,
        is_active: true,
      })
      .select("id")
      .maybeSingle();

    // 2) إنشاء المهمة التنفيذية للتوأم
    const { data: nightTask } = await supabase
      .from("night_tasks")
      .insert({
        twin_id: twin.id,
        listing_id: listing?.id || null,
        title,
        description: `${description}${aiStrategy ? `\n\nالاستراتيجية الذكية: ${aiStrategy}` : ""}`,
        status: "in_progress",
        reward_amount: rewardGems,
        reward_currency: "earned_gems",
        requires_approval: false,
      })
      .select("id")
      .maybeSingle();

    // 3) إدراج الفرصة كمهمة نشطة في marketplace_tasks
    const { data: marketplaceTask, error: mpError } = await supabase
      .from("marketplace_tasks")
      .insert({
        twin_id: twin.id,
        night_task_id: nightTask?.id || null,
        listing_id: listing?.id || null,
        title,
        description,
        category,
        expected_success_rate: expectedSuccessRate,
        reward_gems: rewardGems,
        status: "active",
        ai_strategy: aiStrategy || null,
      })
      .select("*")
      .single();

    if (mpError) {
      throw new Error(mpError.message);
    }

    // 4) تعلم ذاتي في twin_memories من قرار التكليف الفوري
    const learnedText = `بصمة قرار المالك في رادار الفرص: كلّفني فوراً بتنفيذ «${title}» (نسبة نجاح ${expectedSuccessRate}% · عائد ${rewardGems} Earned Gems) ضمن فئة (${category}).`;
    const { data: savedMemory } = await supabase
      .from("twin_memories")
      .insert({
        twin_id: twin.id,
        content: learnedText,
        memory_type: "preference",
        importance: 0.9,
      })
      .select("id, content, memory_type, created_at")
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      marketplaceTask,
      nightTaskId: nightTask?.id || null,
      learnedMemory: savedMemory,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "فشل تكليف التوأم بالفرصة";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
