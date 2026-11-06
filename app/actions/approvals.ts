"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getUserPlanName,
  settleTaskPayment,
} from "@/lib/finance/settle-task";

export async function respondToApprovalAction(
  approvalId: string,
  status: "approved" | "rejected",
  note?: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("يجب تسجيل الدخول أولاً");

  const { data: approval } = await supabase
    .from("owner_approvals")
    .select("*")
    .eq("id", approvalId)
    .maybeSingle();

  if (!approval) throw new Error("الموافقة غير موجودة");

  const { data: twinOwn } = await supabase
    .from("twins")
    .select("id")
    .eq("id", approval.twin_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!twinOwn) throw new Error("غير مصرح");

  if (approval.status !== "pending") {
    throw new Error("تمت معالجة هذه الموافقة مسبقاً");
  }

  const { error } = await supabase
    .from("owner_approvals")
    .update({
      status,
      responded_at: new Date().toISOString(),
      response_note: note || null,
    })
    .eq("id", approvalId);

  if (error) throw new Error(error.message);

  let settlement = null;

  // عند موافقة صاحب الطلب على التسليم → قيد مزدوج
  if (
    status === "approved" &&
    approval.approval_type === "delivery_acceptance" &&
    approval.task_id
  ) {
    const { data: task } = await supabase
      .from("night_tasks")
      .select("*")
      .eq("id", approval.task_id)
      .maybeSingle();

    if (task && !task.payment_settled) {
      const { data: sellerTwin } = await supabase
        .from("twins")
        .select("user_id")
        .eq("id", task.twin_id)
        .maybeSingle();

      const planName = sellerTwin?.user_id
        ? await getUserPlanName(sellerTwin.user_id)
        : null;

      settlement = await settleTaskPayment({
        twinId: task.twin_id,
        taskId: task.id,
        grossReward: Number(task.reward_amount || 0),
        buyerTwinId: task.buyer_twin_id || null,
        planName,
      });

      if (settlement) {
        await supabase
          .from("night_tasks")
          .update({ payment_settled: true })
          .eq("id", task.id);
      }
    }
  }

  return { ok: true as const, settlement };
}
