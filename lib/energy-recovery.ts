"use server";

import { createClient } from "@/lib/supabase/server";

export async function applyEnergyRecovery(twinId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { recovered: 0, reason: "unauthorized" as const };
  }

  const { data: owned } = await supabase
    .from("twins")
    .select("id, energy")
    .eq("id", twinId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!owned) {
    return { recovered: 0, reason: "twin_not_found" as const };
  }

  const { data: rental } = await supabase
    .from("twin_property_rentals")
    .select("id, property_id, started_at, last_energy_at")
    .eq("twin_id", twinId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!rental) {
    return { recovered: 0, reason: "no_active_rental" as const };
  }

  const { data: property } = await supabase
    .from("virtual_properties")
    .select("energy_recovery_rate, daily_cost_forge_gold")
    .eq("id", rental.property_id)
    .maybeSingle();

  if (!property) {
    return { recovered: 0, reason: "property_not_found" as const };
  }

  const now = new Date();
  const cursor = new Date(rental.last_energy_at || rental.started_at);
  const hoursElapsed = Math.max(
    0,
    (now.getTime() - cursor.getTime()) / (1000 * 60 * 60),
  );

  const recoveryAmount = Math.min(
    Number(property.energy_recovery_rate) * hoursElapsed,
    100,
  );

  if (recoveryAmount <= 0) {
    return {
      recovered: 0,
      newEnergy: Number(owned.energy),
      hoursElapsed: 0,
      reason: "nothing_to_recover" as const,
    };
  }

  const newEnergy = Math.min(100, Number(owned.energy) + recoveryAmount);

  const { error: twinError } = await supabase
    .from("twins")
    .update({
      energy: newEnergy,
      updated_at: now.toISOString(),
    })
    .eq("id", twinId);

  if (twinError) {
    return { recovered: 0, reason: twinError.message };
  }

  await supabase
    .from("twin_property_rentals")
    .update({ last_energy_at: now.toISOString() })
    .eq("id", rental.id);

  return {
    recovered: Math.round(recoveryAmount * 100) / 100,
    newEnergy,
    hoursElapsed: Math.round(hoursElapsed * 10) / 10,
  };
}
