"use server";

import { createClient } from "@/lib/supabase/server";
import {
  composeTwinSoul,
  executeNightTask,
} from "@/lib/ai/twin-engine";
import {
  getUserPlanName,
  settleTaskPayment,
} from "@/lib/finance/settle-task";
import { getRequestLocale } from "@/lib/i18n/server";

export async function completeTaskAction(taskId: string) {
  const locale = await getRequestLocale();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("يجب تسجيل الدخول أولاً");
  }

  const { data: task, error: taskError } = await supabase
    .from("night_tasks")
    .select("*")
    .eq("id", taskId)
    .maybeSingle();

  if (taskError || !task) {
    throw new Error("المهمة غير موجودة");
  }

  const twinId = task.twin_id as string;

  const { data: twin } = await supabase
    .from("twins")
    .select("*")
    .eq("id", twinId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!twin) {
    throw new Error("غير مصرح");
  }

  const { checkInferenceBudget } = await import("@/lib/inference-budget");
  const budget = await checkInferenceBudget(twin.user_id, 0.1);
  if (!budget.allowed) {
    throw new Error(
      budget.reason === "daily_limit_exceeded"
        ? "تم تجاوز حد الاستدلال اليومي. حاول غداً أو رقِّ باقتك."
        : "لا يوجد اشتراك نشط.",
    );
  }

  if (task.status === "completed") {
    throw new Error("المهمة مكتملة مسبقاً");
  }
  if (task.status === "failed") {
    throw new Error("المهمة فاشلة ولا يمكن إكمالها");
  }

  if (task.requires_approval) {
    const { data: approval } = await supabase
      .from("owner_approvals")
      .select("id, status")
      .eq("task_id", taskId)
      .eq("approval_type", "task_execution")
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!approval || approval.status === "pending") {
      if (!approval) {
        const { error: approvalError } = await supabase
          .from("owner_approvals")
          .insert({
            twin_id: twin.id,
            task_id: taskId,
            approval_type: "task_execution",
            status: "pending",
            details: {
              title: task.title,
              reward_amount: task.reward_amount,
              reward_currency: task.reward_currency,
            },
          });

        if (approvalError) {
          throw new Error(approvalError.message);
        }
      }

      await supabase
        .from("night_tasks")
        .update({ status: "requires_approval" })
        .eq("id", taskId);

      throw new Error("المهمة بانتظار موافقتك في صفحة الموافقات");
    }

    if (approval.status === "rejected") {
      throw new Error("رُفضت الموافقة على هذه المهمة");
    }
  }

  // --- تنفيذ AI حقيقي (مدعوم بأدوات Perplexity, Firecrawl, Playwright, Composio) ---
  const { data: memories } = await supabase
    .from("twin_memories")
    .select("content, memory_type")
    .eq("twin_id", twin.id)
    .order("created_at", { ascending: false })
    .limit(12);

  const soul = composeTwinSoul(twin, memories || []);
  const ai = await executeNightTask(
    soul,
    {
      id: task.id,
      title: task.title,
      description: task.description,
      reward_amount: Number(task.reward_amount || 0),
      reward_currency: task.reward_currency || "earned_gems",
      requires_approval: Boolean(task.requires_approval),
      allowExternalMutations: true,
      userId: user.id,
    },
    locale,
  );

  const learned = ai.learned_memory || ai.learningSummary;

  const { error: updateError } = await supabase
    .from("night_tasks")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      result_text: ai.output,
      learning_summary: learned,
      ai_provider: ai.provider,
      ai_cost_usd: ai.estimatedCostUsd,
    })
    .eq("id", taskId);

  if (updateError) {
    // أعمدة AI قد تكون غير مطبّقة بعد — أكمل بدونها
    const { error: basicErr } = await supabase
      .from("night_tasks")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", taskId);
    if (basicErr) throw new Error(basicErr.message);
  }

  await supabase.from("twin_memories").insert({
    twin_id: twin.id,
    content: learned,
    memory_type: "lesson",
    importance: 0.7,
  });

  const buyerTwinId =
    (task as { buyer_twin_id?: string | null }).buyer_twin_id || null;
  const alreadySettled = Boolean(
    (task as { payment_settled?: boolean }).payment_settled,
  );

  let settlement = null;

  if (buyerTwinId && !alreadySettled) {
    // بانتظار موافقة صاحب الطلب على التسليم قبل القيد المالي
    await supabase.from("owner_approvals").insert({
      twin_id: buyerTwinId,
      task_id: taskId,
      approval_type: "delivery_acceptance",
      status: "pending",
      details: {
        title: task.title,
        reward_amount: task.reward_amount,
        seller_twin_id: twin.id,
        output_preview: ai.output.slice(0, 400),
      },
    });
  } else if (!alreadySettled) {
    const planName = await getUserPlanName(user.id);
    settlement = await settleTaskPayment({
      twinId: twin.id,
      taskId,
      grossReward: Number(task.reward_amount || 0),
      buyerTwinId: null,
      planName,
    });
    if (settlement) {
      await supabase
        .from("night_tasks")
        .update({ payment_settled: true })
        .eq("id", taskId);
    }
  }

  return {
    ok: true as const,
    ai: {
      provider: ai.provider,
      usedFallback: ai.usedFallback,
      toolsUsed: ai.toolsUsed || [],
      citations: ai.citations || [],
      learningSummary: learned,
      learned_memory: learned,
      outputPreview: ai.output.slice(0, 500),
    },
    settlement,
    awaitingClientApproval: Boolean(buyerTwinId && !alreadySettled),
  };
}
