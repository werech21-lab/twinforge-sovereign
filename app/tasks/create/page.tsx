"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const AGENT_TOOL_PRESETS = [
  {
    badge: "Perplexity · sonar-pro",
    title: "تحليل سوق المطاعم في الكويت والخليج",
    description:
      "أجرِ تحليلاً دقيقاً لسوق المطاعم السريعة والقهوة المختصة في الكويت والخليج مع متوسط الأسعار وأهم المؤشرات المدعومة بالمصادر والأرقام.",
    reward: "25",
    requiresApproval: false,
  },
  {
    badge: "Firecrawl · KWD",
    title: "سحب قائمة وأسعار منافس بالدينار الكويتي",
    description:
      "اسحب جميع أصناف المنيو والفئات والأسعار بالدينار الكويتي (KWD) من رابط المنافس: https://example.com/menu",
    reward: "20",
    requiresApproval: false,
  },
  {
    badge: "Playwright · Snapshot",
    title: "فحص بوابة إلكترونية والتقاط حالتها",
    description:
      "افحص الموقع عبر المتصفح الآلي وتأكد من عنوان الصفحة ومحتواها الظاهر مع لقطة شاشة كاملة: https://example.com",
    reward: "15",
    requiresApproval: false,
  },
  {
    badge: "Composio · Claude",
    title: "إرسال ملخص التحليل وتحديث جدول الأسعار",
    description:
      "جهّز ملخص مقارنة الأسعار وأرسله عبر Gmail وحدّث جدول بيانات Google Sheets بالنتائج المعتمدة.",
    reward: "30",
    requiresApproval: true,
  },
];

export default function CreateTaskPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("10");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const router = useRouter();

  const applyPreset = (preset: (typeof AGENT_TOOL_PRESETS)[number]) => {
    setTitle(preset.title);
    setDescription(preset.description);
    setReward(preset.reward);
    setRequiresApproval(preset.requiresApproval);
    setStatus("");
  };

  const createTask = async () => {
    if (!title.trim()) {
      setStatus("أدخل عنوان المهمة");
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?next=/tasks/create");
        return;
      }

      const { data: twin } = await supabase
        .from("twins")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!twin) {
        setStatus("يجب إنشاء توأم أولاً");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("night_tasks").insert({
        twin_id: twin.id,
        title: title.trim(),
        description: description.trim() || null,
        status: requiresApproval ? "requires_approval" : "pending",
        reward_amount: parseFloat(reward) || 0,
        reward_currency: "earned_gems",
        requires_approval: requiresApproval,
      });

      if (error) throw error;

      setStatus("تم إنشاء المهمة بنجاح");
      setTitle("");
      setDescription("");
      setReward("10");
      setRequiresApproval(false);

      setTimeout(() => router.push("/tasks"), 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "فشل الإنشاء";
      setStatus("خطأ: " + message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-accent">
        إنشاء مهمة ليلية
      </h1>

      <div className="space-y-2">
        <p className="text-xs text-slate-300">
          قوالب سريعة للأدوات المدمجة (Perplexity · Firecrawl · Playwright · Composio):
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {AGENT_TOOL_PRESETS.map((preset) => (
            <button
              key={preset.badge}
              type="button"
              onClick={() => applyPreset(preset)}
              className="rounded-xl border border-white/15 bg-bg/60 p-3 text-right transition hover:border-accent"
            >
              <span className="block text-[11px] font-medium text-accent">
                {preset.badge}
              </span>
              <span className="mt-0.5 block text-xs text-slate-200">
                {preset.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 tf-card p-4">
        <div>
          <label className="mb-1 block text-sm text-slate-300">عنوان المهمة</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: تحليل سوق المطاعم في الكويت"
            className="w-full rounded-xl border border-white/15 bg-bg px-4 py-3 outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">الوصف (اختياري)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="تفاصيل المهمة أو رابط الموقع/المنيو..."
            className="h-28 w-full rounded-xl border border-white/15 bg-bg px-4 py-3 outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">المكافأة (Earned Gems)</label>
          <input
            type="number"
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-bg px-4 py-3 outline-none focus:border-accent"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={requiresApproval}
            onChange={(e) => setRequiresApproval(e.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          <span>تتطلب موافقة المالك</span>
        </label>
      </div>

      <button
        type="button"
        onClick={createTask}
        disabled={loading || !title.trim()}
        className="w-full rounded-xl bg-accent py-3 font-medium text-bg disabled:opacity-50"
      >
        {loading ? "جاري الإنشاء..." : "إنشاء المهمة"}
      </button>

      {status ? <p className="text-center text-sm text-slate-300">{status}</p> : null}
    </div>
  );
}
