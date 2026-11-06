"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function deductPropertyCost(twinId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { deducted: 0, reason: "unauthorized" as const };
  }

  const { data: owned } = await supabase
    .from("twins")
    .select("id")
    .eq("id", twinId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!owned) {
    return { deducted: 0, reason: "twin_not_found" as const };
  }

  const { data: rental } = await supabase
    .from("twin_property_rentals")
    .select("id, property_id, started_at, last_billed_at, total_cost")
    .eq("twin_id", twinId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!rental) {
    return { deducted: 0, reason: "no_active_rental" as const };
  }

  const { data: property } = await supabase
    .from("virtual_properties")
    .select("daily_cost_forge_gold, name")
    .eq("id", rental.property_id)
    .maybeSingle();

  if (!property) {
    return { deducted: 0, reason: "property_not_found" as const };
  }

  const now = new Date();
  const cursor = new Date(rental.last_billed_at || rental.started_at);
  const daysElapsed = Math.floor(
    (now.getTime() - cursor.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysElapsed < 1) {
    return { deducted: 0, reason: "less_than_one_day" as const };
  }

  const totalCost = Number(property.daily_cost_forge_gold) * daysElapsed;

  const { data: twinAccount } = await supabase
    .from("accounts")
    .select("id, balance")
    .eq("twin_id", twinId)
    .eq("currency", "forge_gold")
    .maybeSingle();

  if (!twinAccount) {
    return { deducted: 0, reason: "no_forge_account" as const };
  }

  if (Number(twinAccount.balance) < totalCost) {
    await supabase
      .from("twin_property_rentals")
      .update({
        status: "ended",
        ends_at: now.toISOString(),
      })
      .eq("id", rental.id);

    return { deducted: 0, reason: "insufficient_balance_ended" as const };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { deducted: 0, reason: "admin_not_configured" as const };
  }

  const { data: treasury } = await admin
    .from("accounts")
    .select("id")
    .eq("account_type", "treasury")
    .eq("currency", "forge_gold")
    .eq("is_system", true)
    .limit(1)
    .maybeSingle();

  if (!treasury) {
    return { deducted: 0, reason: "no_treasury" as const };
  }

  const { error } = await admin.rpc("transfer_funds", {
    p_from_account: twinAccount.id,
    p_to_account: treasury.id,
    p_amount: totalCost,
    p_description: `تكلفة استئجار: ${property.name} (${daysElapsed} أيام)`,
    p_reference_type: "property_rental",
    p_reference_id: rental.id,
  });

  if (error) {
    return { deducted: 0, reason: "transfer_failed" as const, detail: error.message };
  }

  await supabase
    .from("twin_property_rentals")
    .update({
      total_cost: Number(rental.total_cost || 0) + totalCost,
      last_billed_at: now.toISOString(),
    })
    .eq("id", rental.id);

  return { deducted: totalCost, daysElapsed };
}
