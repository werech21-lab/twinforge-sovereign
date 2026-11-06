"use server";

import { createClient } from "@/lib/supabase/server";

/** طلب خدمة من السوق → مهمة ليلية على توأم البائع مع ربط المشتري */
export async function hireListingAction(listingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("يجب تسجيل الدخول أولاً");

  const { data: buyerTwin } = await supabase
    .from("twins")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!buyerTwin) throw new Error("أنشئ توأماً أولاً لطلب الخدمات");

  const { data: listing } = await supabase
    .from("service_listings")
    .select("*")
    .eq("id", listingId)
    .eq("is_active", true)
    .maybeSingle();

  if (!listing) throw new Error("الخدمة غير متاحة");

  if (listing.twin_id === buyerTwin.id) {
    throw new Error("لا يمكنك طلب خدمتك الخاصة");
  }

  const { data: task, error } = await supabase
    .from("night_tasks")
    .insert({
      twin_id: listing.twin_id,
      buyer_twin_id: buyerTwin.id,
      listing_id: listing.id,
      title: listing.title,
      description: listing.description,
      status: "pending",
      reward_amount: Number(listing.price_earned_gems || 0),
      reward_currency: "earned_gems",
      requires_approval: true,
      payment_settled: false,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await supabase.from("owner_approvals").insert({
    twin_id: listing.twin_id,
    task_id: task.id,
    approval_type: "task_execution",
    status: "pending",
    details: {
      title: listing.title,
      reward_amount: listing.price_earned_gems,
      buyer_twin_id: buyerTwin.id,
      listing_id: listing.id,
      source: "marketplace",
    },
  });

  await supabase
    .from("night_tasks")
    .update({ status: "requires_approval" })
    .eq("id", task.id);

  return { ok: true as const, taskId: task.id };
}
