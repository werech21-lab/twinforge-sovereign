import { createAdminClient } from "@/lib/supabase/admin";
import { getCatalogItem, type CatalogItem } from "@/lib/billing/catalog";

export type FulfillInput = {
  userId: string;
  twinId?: string | null;
  sku: string;
  sessionId: string;
  source: "stripe" | "sandbox";
};

export type FulfillResult = {
  ok: true;
  duplicate?: boolean;
  sku: string;
  forgeGoldCredited: number;
  subscriptionActivated: boolean;
  ledgerIds: string[];
};

/**
 * تنفيذ الدفع مرة واحدة فقط (Idempotent عبر session_id في audit_log).
 */
export async function fulfillCheckout(
  input: FulfillInput,
): Promise<FulfillResult> {
  const item = getCatalogItem(input.sku);
  if (!item) throw new Error(`SKU غير معروف: ${input.sku}`);

  const admin = createAdminClient();

  const { data: prior } = await admin
    .from("audit_log")
    .select("id, new_values")
    .eq("action", "billing_fulfillment")
    .contains("new_values", { session_id: input.sessionId })
    .limit(1)
    .maybeSingle();

  if (prior) {
    return {
      ok: true,
      duplicate: true,
      sku: item.sku,
      forgeGoldCredited: 0,
      subscriptionActivated: false,
      ledgerIds: [],
    };
  }

  let twinId = input.twinId || null;
  if (!twinId) {
    const { data: twin } = await admin
      .from("twins")
      .select("id")
      .eq("user_id", input.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    twinId = twin?.id || null;
  }

  const ledgerIds: string[] = [];
  let subscriptionActivated = false;

  if (item.kind === "subscription" && item.planName) {
    await activatePlan(admin, input.userId, item.planName, input.sessionId);
    subscriptionActivated = true;
  }

  if (item.forgeGold > 0) {
    if (!twinId) {
      throw new Error("أنشئ توأماً أولاً لاستلام ForgeGold");
    }
    const ids = await creditForgeGold(
      admin,
      twinId,
      item.forgeGold,
      input.sessionId,
      item,
    );
    ledgerIds.push(...ids);
  }

  await admin.from("audit_log").insert({
    user_id: input.userId,
    twin_id: twinId,
    action: "billing_fulfillment",
    entity_type: "checkout_session",
    new_values: {
      session_id: input.sessionId,
      sku: item.sku,
      kind: item.kind,
      price_usd: item.priceUsd,
      forge_gold: item.forgeGold,
      source: input.source,
      ledger_ids: ledgerIds,
      subscription_activated: subscriptionActivated,
    },
  });

  return {
    ok: true,
    sku: item.sku,
    forgeGoldCredited: item.forgeGold,
    subscriptionActivated,
    ledgerIds,
  };
}

async function activatePlan(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  planName: string,
  sessionId: string,
) {
  const { data: plan } = await admin
    .from("subscription_plans")
    .select("id")
    .eq("name", planName)
    .eq("is_active", true)
    .maybeSingle();

  if (!plan) {
    console.warn("plan missing in DB:", planName);
    return;
  }

  const now = new Date();
  const end = new Date();
  end.setMonth(end.getMonth() + 1);

  await admin
    .from("subscriptions")
    .update({ status: "canceled", updated_at: now.toISOString() })
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"]);

  await admin.from("subscriptions").insert({
    user_id: userId,
    plan_id: plan.id,
    status: "active",
    current_period_start: now.toISOString(),
    current_period_end: end.toISOString(),
    stripe_subscription_id: sessionId.startsWith("cs_") ? sessionId : null,
  });
}

async function creditForgeGold(
  admin: ReturnType<typeof createAdminClient>,
  twinId: string,
  amount: number,
  sessionId: string,
  item: CatalogItem,
): Promise<string[]> {
  const ledgerIds: string[] = [];

  const { data: treasury } = await admin
    .from("accounts")
    .select("id, balance")
    .eq("is_system", true)
    .eq("account_type", "treasury")
    .eq("currency", "forge_gold")
    .maybeSingle();

  const { data: twinGold } = await admin
    .from("accounts")
    .select("id, balance")
    .eq("twin_id", twinId)
    .eq("currency", "forge_gold")
    .maybeSingle();

  if (!treasury || !twinGold) {
    throw new Error("حسابات ForgeGold غير مكتملة");
  }

  if (Number(treasury.balance) < amount) {
    await admin
      .from("accounts")
      .update({ balance: Number(treasury.balance) + amount })
      .eq("id", treasury.id);
  }

  const { data: ledgerId, error } = await admin.rpc("transfer_funds", {
    p_from_account: treasury.id,
    p_to_account: twinGold.id,
    p_amount: amount,
    p_description: `شحن/مكافأة ${item.name}`,
    p_reference_type: "billing_topup",
    p_reference_id: null,
  });

  if (!error && ledgerId) {
    ledgerIds.push(String(ledgerId));
    return ledgerIds;
  }

  // Fallback: قيد + أرصدة مباشرة
  console.warn("transfer_funds failed, using direct credit:", error?.message);

  const { data: refreshedTreasury } = await admin
    .from("accounts")
    .select("id, balance")
    .eq("id", treasury.id)
    .maybeSingle();
  const { data: refreshedTwin } = await admin
    .from("accounts")
    .select("id, balance")
    .eq("id", twinGold.id)
    .maybeSingle();

  if (!refreshedTreasury || !refreshedTwin) {
    throw new Error("تعذر تحديث أرصدة ForgeGold");
  }

  if (Number(refreshedTreasury.balance) < amount) {
    await admin
      .from("accounts")
      .update({ balance: Number(refreshedTreasury.balance) + amount })
      .eq("id", refreshedTreasury.id);
  }

  const { data: entry } = await admin
    .from("ledger_entries")
    .insert({
      debit_account_id: refreshedTreasury.id,
      credit_account_id: refreshedTwin.id,
      amount,
      currency: "forge_gold",
      description: `شحن/مكافأة ${item.name} (${sessionId})`,
      reference_type: "billing_topup",
      metadata: { session_id: sessionId, sku: item.sku },
    })
    .select("id")
    .maybeSingle();

  await admin
    .from("accounts")
    .update({
      balance: Math.max(0, Number(refreshedTreasury.balance) - amount),
    })
    .eq("id", refreshedTreasury.id);
  await admin
    .from("accounts")
    .update({ balance: Number(refreshedTwin.balance) + amount })
    .eq("id", refreshedTwin.id);

  if (entry?.id) ledgerIds.push(String(entry.id));
  return ledgerIds;
}
