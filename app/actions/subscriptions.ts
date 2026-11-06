"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function activateSubscriptionAction(input: {
  email: string;
  planName: string;
  adminKey: string;
}) {
  const expected = process.env.ADMIN_ACTIVATE_KEY;
  if (!expected || input.adminKey !== expected) {
    throw new Error("مفتاح التفعيل غير صالح");
  }

  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error("أدخل البريد الإلكتروني");

  const admin = createAdminClient();

  const { data: userData, error: userError } = await admin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (userError) throw new Error(userError.message);
  if (!userData) throw new Error("المستخدم غير موجود");

  const { data: plan, error: planError } = await admin
    .from("subscription_plans")
    .select("id")
    .eq("name", input.planName)
    .eq("is_active", true)
    .maybeSingle();

  if (planError) throw new Error(planError.message);
  if (!plan) throw new Error("الباقة غير موجودة");

  const now = new Date();
  const end = new Date();
  end.setMonth(end.getMonth() + 1);

  // أغلق الاشتراكات النشطة السابقة لنفس المستخدم
  await admin
    .from("subscriptions")
    .update({
      status: "canceled",
      updated_at: now.toISOString(),
    })
    .eq("user_id", userData.id)
    .in("status", ["active", "trialing", "past_due"]);

  const { error } = await admin.from("subscriptions").insert({
    user_id: userData.id,
    plan_id: plan.id,
    status: "active",
    current_period_start: now.toISOString(),
    current_period_end: end.toISOString(),
  });

  if (error) throw new Error(error.message);

  return { ok: true as const, userId: userData.id, planId: plan.id };
}
