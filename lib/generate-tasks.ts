"use server";

import { createClient } from "@/lib/supabase/server";

const SAMPLE_TASKS = [
  {
    title: "تحليل سوق المطاعم في الكويت والخليج",
    description:
      "حلل توجهات وأسعار مطاعم البرغر والقهوة المختصة في الكويت والخليج مع أرقام ومصادر موثقة.",
    reward_amount: 25,
    requires_approval: false,
  },
  {
    title: "فحص بوابة إلكترونية عبر المتصفح الآلي",
    description:
      "افحص حالة الصفحة وعنوانها ومحتواها الظاهر عبر Playwright للرابط https://example.com",
    reward_amount: 15,
    requires_approval: false,
  },
  {
    title: "تحليل بيانات مبيعات وتحديث الجدول",
    description:
      "حلل بيانات المبيعات المقترحة وجهّز ملخصاً لإرساله عبر البريد أو تحديث جدول البيانات.",
    reward_amount: 25,
    requires_approval: true,
  },
  {
    title: "كتابة ملخص أخبار التقنية",
    description: "لخص أهم 5 أخبار تقنية لهذا الأسبوع",
    reward_amount: 15,
    requires_approval: false,
  },
  {
    title: "تصميم خطة محتوى لمطعم محلي",
    description: "اقترح خطة محتوى تسويقية لأسبوع كامل تستهدف السوق الكويتي",
    reward_amount: 20,
    requires_approval: false,
  },
];

export async function generateSampleTasks(twinId: string, count: number = 3) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("يجب تسجيل الدخول أولاً");
  }

  const { data: twin } = await supabase
    .from("twins")
    .select("id")
    .eq("id", twinId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!twin) {
    throw new Error("غير مصرح");
  }

  const shuffled = [...SAMPLE_TASKS].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  const tasksToInsert = selected.map((task) => ({
    twin_id: twinId,
    title: task.title,
    description: task.description,
    status: task.requires_approval ? "requires_approval" : "pending",
    reward_amount: task.reward_amount,
    reward_currency: "earned_gems",
    requires_approval: task.requires_approval,
  }));

  const { data, error } = await supabase
    .from("night_tasks")
    .insert(tasksToInsert)
    .select();

  if (error) {
    throw new Error("فشل إنشاء المهام: " + error.message);
  }

  return data;
}
