"use server";

import { createAdminClient } from "@/lib/supabase/admin";

function assertAdminKey(adminKey: string) {
  const expected = process.env.ADMIN_ACTIVATE_KEY;
  if (!expected || adminKey !== expected) {
    throw new Error("مفتاح المشرف غير صالح");
  }
}

const COOLING_DAYS = Number(process.env.WITHDRAWAL_COOLING_DAYS || 14);

export type WithdrawalRequestRow = {
  id: string;
  created_at: string;
  user_id: string | null;
  twin_id: string | null;
  new_values: {
    amount: number;
    wise_email: string;
    status: string;
    requested_at?: string;
    processed_at?: string;
    rejected_at?: string;
    cooling_until?: string;
    held?: boolean;
    account_id?: string;
  };
};

export async function listPendingWithdrawalsAction(adminKey: string) {
  assertAdminKey(adminKey);
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("audit_log")
    .select("id, created_at, user_id, twin_id, new_values")
    .eq("action", "withdrawal_request")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  const pending = ((data || []) as WithdrawalRequestRow[]).filter(
    (r) => r.new_values?.status === "pending",
  );

  return pending;
}

/** توافق خلفي مع الصفحة القديمة */
export async function markWithdrawalProcessedAction(input: {
  adminKey: string;
  id: string;
  newValues: WithdrawalRequestRow["new_values"];
}) {
  return approveWithdrawalAction({ adminKey: input.adminKey, id: input.id });
}

export async function approveWithdrawalAction(input: {
  adminKey: string;
  id: string;
}) {
  assertAdminKey(input.adminKey);
  const admin = createAdminClient();

  const { data: row, error } = await admin
    .from("audit_log")
    .select("id, created_at, twin_id, new_values")
    .eq("id", input.id)
    .eq("action", "withdrawal_request")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) throw new Error("طلب السحب غير موجود");

  const nv = (row.new_values || {}) as WithdrawalRequestRow["new_values"];
  if (nv.status !== "pending") throw new Error("الطلب ليس معلّقاً");

  const requestedAt = new Date(nv.requested_at || row.created_at);
  const coolingUntil = nv.cooling_until
    ? new Date(nv.cooling_until)
    : new Date(requestedAt.getTime() + COOLING_DAYS * 24 * 60 * 60 * 1000);

  if (Date.now() < coolingUntil.getTime()) {
    throw new Error(
      `فترة التبريد لم تنتهِ بعد (حتى ${coolingUntil.toLocaleString("ar")})`,
    );
  }

  // التحقق من آخر تسوية مهام إن وُجدت فترة تبريد أرباح
  if (row.twin_id) {
    const { data: settlements } = await admin
      .from("audit_log")
      .select("new_values, created_at")
      .eq("twin_id", row.twin_id)
      .eq("action", "task_settlement")
      .order("created_at", { ascending: false })
      .limit(5);

    for (const s of settlements || []) {
      const cool = (s.new_values as { cooling_until?: string } | null)
        ?.cooling_until;
      if (cool && Date.now() < new Date(cool).getTime()) {
        throw new Error(
          `أرباح التوأم ما زالت في فترة تبريد حتى ${new Date(cool).toLocaleString("ar")}`,
        );
      }
    }
  }

  const { error: updErr } = await admin
    .from("audit_log")
    .update({
      new_values: {
        ...nv,
        status: "processed",
        processed_at: new Date().toISOString(),
        cooling_until: coolingUntil.toISOString(),
      },
    })
    .eq("id", input.id)
    .eq("action", "withdrawal_request");

  if (updErr) throw new Error(updErr.message);
  return { ok: true as const, status: "processed" as const };
}

export async function rejectWithdrawalAction(input: {
  adminKey: string;
  id: string;
}) {
  assertAdminKey(input.adminKey);
  const admin = createAdminClient();

  const { data: row, error } = await admin
    .from("audit_log")
    .select("id, twin_id, new_values")
    .eq("id", input.id)
    .eq("action", "withdrawal_request")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) throw new Error("طلب السحب غير موجود");

  const nv = (row.new_values || {}) as WithdrawalRequestRow["new_values"];
  if (nv.status !== "pending") throw new Error("الطلب ليس معلّقاً");

  // إرجاع الرصيد إن كان محجوزاً
  if (nv.held && row.twin_id && Number(nv.amount) > 0) {
    const { data: gems } = await admin
      .from("accounts")
      .select("id, balance")
      .eq("twin_id", row.twin_id)
      .eq("currency", "earned_gems")
      .maybeSingle();

    if (gems) {
      await admin
        .from("accounts")
        .update({ balance: Number(gems.balance) + Number(nv.amount) })
        .eq("id", gems.id);
    }
  }

  const { error: updErr } = await admin
    .from("audit_log")
    .update({
      new_values: {
        ...nv,
        status: "rejected",
        rejected_at: new Date().toISOString(),
        held: false,
      },
    })
    .eq("id", input.id)
    .eq("action", "withdrawal_request");

  if (updErr) throw new Error(updErr.message);
  return { ok: true as const, status: "rejected" as const };
}
