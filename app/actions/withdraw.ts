"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MIN_WITHDRAW = 10;
const COOLING_DAYS = Number(process.env.WITHDRAWAL_COOLING_DAYS || 14);

export async function requestWithdrawalAction(input: {
  amount: number;
  wiseEmail: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("يجب تسجيل الدخول أولاً");

  const amount = Number(input.amount);
  const wiseEmail = input.wiseEmail.trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("أدخل مبلغاً صحيحاً");
  }
  if (amount < MIN_WITHDRAW) {
    throw new Error(`الحد الأدنى للسحب: ${MIN_WITHDRAW} Gems`);
  }
  if (!wiseEmail) {
    throw new Error("أدخل بريد Wise");
  }

  const { data: twin } = await supabase
    .from("twins")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!twin) throw new Error("لا يوجد توأم");

  const admin = createAdminClient();

  const { data: account } = await admin
    .from("accounts")
    .select("id, balance")
    .eq("twin_id", twin.id)
    .eq("currency", "earned_gems")
    .maybeSingle();

  if (!account) throw new Error("لا يوجد حساب أرباح");
  if (amount > Number(account.balance)) {
    throw new Error("الرصيد غير كافٍ");
  }

  // حجز المبلغ فوراً (يُعاد عند الرفض)
  const { error: holdErr } = await admin
    .from("accounts")
    .update({ balance: Number(account.balance) - amount })
    .eq("id", account.id)
    .gte("balance", amount);

  if (holdErr) throw new Error(holdErr.message);

  const requestedAt = new Date();
  const coolingUntil = new Date(
    requestedAt.getTime() + COOLING_DAYS * 24 * 60 * 60 * 1000,
  );

  const { error } = await admin.from("audit_log").insert({
    user_id: user.id,
    twin_id: twin.id,
    action: "withdrawal_request",
    entity_type: "account",
    entity_id: account.id,
    new_values: {
      amount,
      wise_email: wiseEmail,
      status: "pending",
      held: true,
      account_id: account.id,
      requested_at: requestedAt.toISOString(),
      cooling_until: coolingUntil.toISOString(),
    },
  });

  if (error) {
    // rollback hold
    await admin
      .from("accounts")
      .update({ balance: Number(account.balance) })
      .eq("id", account.id);
    throw new Error(error.message);
  }

  return {
    ok: true as const,
    coolingUntil: coolingUntil.toISOString(),
    coolingDays: COOLING_DAYS,
  };
}
