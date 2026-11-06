"use server";

import { createClient } from "@/lib/supabase/server";

const SOVEREIGN_DAILY_INFERENCE_USD = 50.0;

type PlanRow = { max_daily_inference_usd: number };
type TwinBudgetRow = { id: string; daily_inference_limit?: number | null };

export async function checkInferenceBudget(
  userId: string,
  estimatedCost: number = 0.05,
  activeTwinId?: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    return {
      allowed: false,
      reason: "unauthorized" as const,
      remaining: 0,
      dailyLimit: SOVEREIGN_DAILY_INFERENCE_USD,
    };
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select(
      `
      id,
      plan:subscription_plans ( max_daily_inference_usd )
    `,
    )
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"])
    .limit(1)
    .maybeSingle();

  const plan = subscription?.plan as PlanRow | PlanRow[] | null | undefined;
  const planRow = Array.isArray(plan) ? plan[0] : plan;
  const planLimit = Number(
    planRow?.max_daily_inference_usd ?? SOVEREIGN_DAILY_INFERENCE_USD,
  );

  const { data: twins } = await supabase
    .from("twins")
    .select("id, daily_inference_limit")
    .eq("user_id", userId);

  const typedTwins = (twins as TwinBudgetRow[] | null) || [];
  const selectedTwin = activeTwinId
    ? typedTwins.find((t) => t.id === activeTwinId)
    : typedTwins[0];

  const twinLimit = Number(
    selectedTwin?.daily_inference_limit ??
      Math.max(
        0,
        ...typedTwins.map((t) => Number(t.daily_inference_limit || 0)),
      ) ??
      SOVEREIGN_DAILY_INFERENCE_USD,
  );

  const dailyLimit = Math.max(
    SOVEREIGN_DAILY_INFERENCE_USD,
    planLimit,
    twinLimit,
  );

  const twinIds = typedTwins.map((t) => t.id);
  if (twinIds.length === 0) {
    return {
      allowed: true as const,
      remaining: dailyLimit,
      dailyLimit,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: todayTasks } = await supabase
    .from("night_tasks")
    .select("ai_cost_usd, reward_amount")
    .in("twin_id", twinIds)
    .eq("status", "completed")
    .gte("completed_at", today.toISOString());

  const usedToday = (todayTasks || []).reduce((sum, t) => {
    const row = t as { ai_cost_usd?: number | null; reward_amount?: number | null };
    if (row.ai_cost_usd !== undefined && row.ai_cost_usd !== null && Number(row.ai_cost_usd) > 0) {
      return sum + Number(row.ai_cost_usd);
    }
    return sum + Math.min(0.05, Number(row.reward_amount || 0) * 0.002);
  }, 0);

  const remaining = Math.max(0, dailyLimit - usedToday);

  if (remaining < estimatedCost) {
    return {
      allowed: false,
      reason: "daily_limit_exceeded" as const,
      remaining,
      dailyLimit,
    };
  }

  return {
    allowed: true as const,
    remaining,
    dailyLimit,
  };
}
