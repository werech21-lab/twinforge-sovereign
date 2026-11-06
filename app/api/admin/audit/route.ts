import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function assertAdmin(request: Request) {
  const expected = process.env.ADMIN_ACTIVATE_KEY;
  const key =
    request.headers.get("x-admin-key") ||
    new URL(request.url).searchParams.get("adminKey") ||
    "";
  if (!expected || key !== expected) {
    throw new Error("مفتاح المشرف غير صالح");
  }
}

export async function GET(request: Request) {
  try {
    assertAdmin(request);
    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const refType = searchParams.get("reference_type");

    const { data: systemAccounts, error: accErr } = await admin
      .from("accounts")
      .select("id, account_type, currency, balance, is_system");

    if (accErr) throw new Error(accErr.message);

    const accounts = systemAccounts || [];
    const sum = (pred: (a: (typeof accounts)[number]) => boolean) =>
      accounts.filter(pred).reduce((n, a) => n + Number(a.balance || 0), 0);

    const treasury = {
      forge_gold: sum(
        (a) =>
          a.is_system &&
          a.account_type === "treasury" &&
          a.currency === "forge_gold",
      ),
      earned_gems: sum(
        (a) =>
          a.is_system &&
          a.account_type === "treasury" &&
          a.currency === "earned_gems",
      ),
    };

    const commission = {
      forge_gold: sum(
        (a) =>
          a.is_system &&
          a.account_type === "commission" &&
          a.currency === "forge_gold",
      ),
      earned_gems: sum(
        (a) =>
          a.is_system &&
          a.account_type === "commission" &&
          a.currency === "earned_gems",
      ),
    };

    const circulating = {
      forge_gold: sum(
        (a) => !a.is_system && a.currency === "forge_gold",
      ),
      earned_gems: sum(
        (a) => !a.is_system && a.currency === "earned_gems",
      ),
    };

    let ledgerQuery = admin
      .from("ledger_entries")
      .select(
        "id, debit_account_id, credit_account_id, amount, currency, description, reference_type, reference_id, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(80);

    if (refType) {
      ledgerQuery = ledgerQuery.eq("reference_type", refType);
    }

    const { data: ledger, error: ledErr } = await ledgerQuery;
    if (ledErr) throw new Error(ledErr.message);

    const entries = (ledger || []).map((row) => ({
      ...row,
      balanced:
        Boolean(row.debit_account_id) &&
        Boolean(row.credit_account_id) &&
        row.debit_account_id !== row.credit_account_id &&
        Number(row.amount) > 0,
    }));

    const { data: withdrawals, error: wErr } = await admin
      .from("audit_log")
      .select("id, created_at, user_id, twin_id, new_values")
      .eq("action", "withdrawal_request")
      .order("created_at", { ascending: false })
      .limit(40);

    if (wErr) throw new Error(wErr.message);

    const coolingDays = Number(process.env.WITHDRAWAL_COOLING_DAYS || 14);

    const payouts = (withdrawals || []).map((w) => {
      const nv = (w.new_values || {}) as {
        amount?: number;
        wise_email?: string;
        status?: string;
        requested_at?: string;
        cooling_until?: string;
      };
      const requestedAt = new Date(
        nv.requested_at || w.created_at || Date.now(),
      );
      const coolingUntil = nv.cooling_until
        ? new Date(nv.cooling_until)
        : new Date(requestedAt.getTime() + coolingDays * 24 * 60 * 60 * 1000);
      const coolingPassed = Date.now() >= coolingUntil.getTime();
      return {
        id: w.id,
        created_at: w.created_at,
        user_id: w.user_id,
        twin_id: w.twin_id,
        amount: Number(nv.amount || 0),
        wise_email: nv.wise_email || "",
        status: nv.status || "pending",
        cooling_until: coolingUntil.toISOString(),
        cooling_passed: coolingPassed,
        new_values: nv,
      };
    });

    return NextResponse.json({
      treasury,
      commission,
      circulating,
      ledger: entries,
      payouts,
      coolingDays,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "فشل تحميل التدقيق";
    const status = message.includes("مشرف") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
