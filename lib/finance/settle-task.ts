"use server";

import { createAdminClient } from "@/lib/supabase/admin";

const PLAN_COMMISSION: Record<string, number> = {
  starter: 0.2,
  pro: 0.15,
  vip: 0.1,
  syndicate: 0.05,
};

const DEFAULT_COMMISSION = 0.2;
/** تبريد أرباح المهام قبل السحب البنكي (افتراضي 14 يوماً) */
const COOLING_HOURS = Number(process.env.WITHDRAWAL_COOLING_DAYS || 14) * 24;

export type SettleTaskResult = {
  gross: number;
  commission: number;
  net: number;
  commissionRate: number;
  coolingUntil: string;
  ledgerIds: string[];
};

/**
 * قيد مزدوج عند إتمام مهمة:
 * - خصم ForgeGold من المشتري (إن وُجد)
 * - عمولة المنصة → commission
 * - صافي Earned Gems → حساب التوأم + فترة تبريد في audit
 */
export async function settleTaskPayment(input: {
  twinId: string;
  taskId: string;
  grossReward: number;
  buyerTwinId?: string | null;
  planName?: string | null;
}): Promise<SettleTaskResult | null> {
  const gross = Number(input.grossReward || 0);
  if (gross <= 0) return null;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return null;
  }

  const commissionRate =
    (input.planName && PLAN_COMMISSION[input.planName]) || DEFAULT_COMMISSION;
  const commission = Math.round(gross * commissionRate * 10000) / 10000;
  const net = Math.round((gross - commission) * 10000) / 10000;
  const coolingUntil = new Date(
    Date.now() + COOLING_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const ledgerIds: string[] = [];

  const { data: treasuryGold } = await admin
    .from("accounts")
    .select("id, balance")
    .eq("is_system", true)
    .eq("account_type", "treasury")
    .eq("currency", "forge_gold")
    .maybeSingle();

  const { data: commissionGold } = await admin
    .from("accounts")
    .select("id")
    .eq("is_system", true)
    .eq("account_type", "commission")
    .eq("currency", "forge_gold")
    .maybeSingle();

  const { data: treasuryGems } = await admin
    .from("accounts")
    .select("id, balance")
    .eq("is_system", true)
    .eq("account_type", "treasury")
    .eq("currency", "earned_gems")
    .maybeSingle();

  const { data: twinGems } = await admin
    .from("accounts")
    .select("id")
    .eq("twin_id", input.twinId)
    .eq("currency", "earned_gems")
    .maybeSingle();

  if (!treasuryGold || !commissionGold || !treasuryGems || !twinGems) {
    throw new Error("حسابات النظام/التوأم غير مكتملة للتسوية");
  }

  async function transfer(
    from: string,
    to: string,
    amount: number,
    description: string,
    referenceType: string,
  ) {
    if (amount <= 0 || from === to) return;
    const { data, error } = await admin!.rpc("transfer_funds", {
      p_from_account: from,
      p_to_account: to,
      p_amount: amount,
      p_description: description,
      p_reference_type: referenceType,
      p_reference_id: input.taskId,
    });
    if (error) throw new Error(error.message);
    if (data) ledgerIds.push(String(data));
  }

  if (input.buyerTwinId) {
    const { data: buyerGold } = await admin
      .from("accounts")
      .select("id, balance")
      .eq("twin_id", input.buyerTwinId)
      .eq("currency", "forge_gold")
      .maybeSingle();

    if (!buyerGold || Number(buyerGold.balance) < gross) {
      throw new Error("رصيد ForgeGold للمشتري غير كافٍ");
    }

    // المشتري → خزينة (الإجمالي)
    await transfer(
      buyerGold.id,
      treasuryGold.id,
      gross,
      "دفع مهمة ليلية (ForgeGold)",
      "task",
    );

    // خزينة → عمولة
    await transfer(
      treasuryGold.id,
      commissionGold.id,
      commission,
      `عمولة منصة (${Math.round(commissionRate * 100)}%)`,
      "task_commission",
    );
  } else {
    // اقتصاد ليلي بدون مشتري خارجي: موّل العمولة من خزينة الذهب
    if (Number(treasuryGold.balance) < commission) {
      await admin
        .from("accounts")
        .update({ balance: Number(treasuryGold.balance) + commission })
        .eq("id", treasuryGold.id);
    }
    await transfer(
      treasuryGold.id,
      commissionGold.id,
      commission,
      `عمولة منصة ليلية (${Math.round(commissionRate * 100)}%)`,
      "task_commission",
    );
  }

  // صافي الجواهر للتوأم
  if (Number(treasuryGems.balance) < net) {
    await admin
      .from("accounts")
      .update({ balance: Number(treasuryGems.balance) + net })
      .eq("id", treasuryGems.id);
  }

  await transfer(
    treasuryGems.id,
    twinGems.id,
    net,
    `صافي أرباح مهمة (تبريد حتى ${coolingUntil})`,
    "task_payout",
  );

  await admin.from("audit_log").insert({
    twin_id: input.twinId,
    action: "task_settlement",
    entity_type: "night_tasks",
    entity_id: input.taskId,
    new_values: {
      gross,
      commission,
      net,
      commission_rate: commissionRate,
      cooling_until: coolingUntil,
      ledger_ids: ledgerIds,
      buyer_twin_id: input.buyerTwinId || null,
    },
  });

  return {
    gross,
    commission,
    net,
    commissionRate,
    coolingUntil,
    ledgerIds,
  };
}

export async function getUserPlanName(userId: string): Promise<string | null> {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return null;
  }

  const { data } = await admin
    .from("subscriptions")
    .select("plan:subscription_plans(name)")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const plan = data?.plan as { name?: string } | { name?: string }[] | null;
  if (!plan) return null;
  return Array.isArray(plan) ? plan[0]?.name || null : plan.name || null;
}
