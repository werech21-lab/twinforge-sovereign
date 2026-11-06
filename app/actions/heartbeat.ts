"use server";

import { createClient } from "@/lib/supabase/server";
import {
  composeTwinSoul,
  generateHeartbeatDecision,
} from "@/lib/ai/twin-engine";
import { getRequestLocale } from "@/lib/i18n/server";

export async function pulseHeartbeatAction(twinId: string) {
  const locale = await getRequestLocale();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("يجب تسجيل الدخول أولاً");

  const { data: twin } = await supabase
    .from("twins")
    .select("*")
    .eq("id", twinId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!twin) throw new Error("التوأم غير موجود");

  const { data: memories } = await supabase
    .from("twin_memories")
    .select("content, memory_type")
    .eq("twin_id", twinId)
    .order("created_at", { ascending: false })
    .limit(10);

  const soul = composeTwinSoul(twin, memories || []);
  const decision = await generateHeartbeatDecision(
    soul,
    memories || [],
    locale,
  );

  const { data: saved, error } = await supabase
    .from("twin_decisions")
    .insert({
      twin_id: twinId,
      title: decision.title,
      situation: decision.situation,
      options: decision.options,
      recommended: decision.recommended || null,
      status: "pending",
      ai_provider: decision.provider,
    })
    .select("*")
    .single();

  if (error) {
    return {
      decision: {
        ...decision,
        id: `ephemeral-${Date.now()}`,
        status: "pending" as const,
      },
      saved: false as const,
      error: error.message,
    };
  }

  return { decision: saved, saved: true as const };
}

export async function resolveDecisionAction(
  decisionId: string,
  chosenOption: string,
  status: "accepted" | "rejected" | "deferred" = "accepted",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("يجب تسجيل الدخول أولاً");

  const { data: row } = await supabase
    .from("twin_decisions")
    .select("id, twin_id, title, situation, recommended")
    .eq("id", decisionId)
    .maybeSingle();

  if (!row) throw new Error("القرار غير موجود");

  const { data: twin } = await supabase
    .from("twins")
    .select("id")
    .eq("id", row.twin_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!twin) throw new Error("غير مصرح");

  const { data, error } = await supabase
    .from("twin_decisions")
    .update({
      status,
      chosen_option: chosenOption,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", decisionId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  // تعلم ذاتي عميق من أسلوب قرارات المالك
  const alignedWithRec =
    row.recommended && row.recommended.trim() === chosenOption.trim();
  const learnedPreference = `بصمة أسلوب المالك في «${row.title}»: اختار «${chosenOption}»${
    alignedWithRec
      ? " (توافق مع توصيتي التحليلية)"
      : row.recommended
        ? ` بدلاً من «${row.recommended}»`
        : ""
  } — السياق: ${String(row.situation || "").slice(0, 180)}`;

  await supabase.from("twin_memories").insert({
    twin_id: row.twin_id,
    content: learnedPreference,
    memory_type: "preference",
    importance: 0.88,
  });

  return data;
}
