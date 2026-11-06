"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Twin } from "@/lib/types";

const createTwinSchema = z.object({
  name: z.string().trim().min(2).max(80),
  personality_summary: z.string().trim().min(8).max(4000),
  capture_note: z.string().trim().max(2000).optional(),
});

const vitalsSchema = z.object({
  twin_id: z.string().uuid(),
  energy: z.number().min(0).max(100).optional(),
  mood: z.number().min(0).max(100).optional(),
});

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return { supabase, user: null as null, error: "يجب تسجيل الدخول أولاً" };
  }
  return { supabase, user, error: null as null };
}

/** Creates a twin + seed memory. user_id always comes from the session. */
export async function create_twin(input: {
  name: string;
  personality_summary: string;
  capture_note?: string;
  /** Ignored — kept for API compatibility; session user wins. */
  user_id?: string;
}): Promise<ActionResult<Twin>> {
  const parsed = createTwinSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }

  const { supabase, user, error: authError } = await requireUser();
  if (!user) return { ok: false, error: authError! };

  // Ensure public.users row exists (trigger usually handles this)
  await supabase.from("users").upsert(
    {
      id: user.id,
      email: user.email ?? `${user.id}@users.local`,
      full_name: (user.user_metadata?.full_name as string | undefined) ?? "",
    },
    { onConflict: "id" },
  );

  const { data: twin, error: twinError } = await supabase
    .from("twins")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      personality_summary: parsed.data.personality_summary,
      status: "active",
      energy: 100,
      mood: 55,
    })
    .select("*")
    .single();

  if (twinError || !twin) {
    return { ok: false, error: twinError?.message ?? "فشل إنشاء التوأم" };
  }

  const seedContent = [
    `بذرة الهوية: ${parsed.data.name}`,
    parsed.data.personality_summary,
    parsed.data.capture_note
      ? `ملاحظة جلسة التسجيل: ${parsed.data.capture_note}`
      : "جلسة تسجيل قصيرة (كاميرا + ميكروفون) اكتملت عند الإنشاء.",
  ].join("\n\n");

  const { error: memoryError } = await supabase.from("twin_memories").insert({
    twin_id: twin.id,
    content: seedContent,
    memory_type: "seed",
    importance: 1,
  });

  if (memoryError) {
    return {
      ok: false,
      error: `تم إنشاء التوأم لكن فشلت الذاكرة الأولية: ${memoryError.message}`,
    };
  }

  revalidatePath("/dashboard");
  return { ok: true, data: twin as Twin };
}

/** Updates energy and/or mood for an owned twin. */
export async function update_twin_vitals(input: {
  twin_id: string;
  energy?: number;
  mood?: number;
}): Promise<ActionResult<Twin>> {
  const parsed = vitalsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }
  if (parsed.data.energy === undefined && parsed.data.mood === undefined) {
    return { ok: false, error: "حدد energy أو mood على الأقل" };
  }

  const { supabase, user, error: authError } = await requireUser();
  if (!user) return { ok: false, error: authError! };

  const patch: { energy?: number; mood?: number; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.energy !== undefined) patch.energy = parsed.data.energy;
  if (parsed.data.mood !== undefined) patch.mood = parsed.data.mood;

  const { data: twin, error } = await supabase
    .from("twins")
    .update(patch)
    .eq("id", parsed.data.twin_id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !twin) {
    return { ok: false, error: error?.message ?? "تعذر تحديث الحالة" };
  }

  revalidatePath("/dashboard");
  return { ok: true, data: twin as Twin };
}

export async function get_dashboard_twin(): Promise<
  ActionResult<{
    twin: Twin | null;
    morningReport: { id: string; content: string; created_at: string } | null;
  }>
> {
  const { supabase, user, error: authError } = await requireUser();
  if (!user) return { ok: false, error: authError! };

  const { data: twin, error } = await supabase
    .from("twins")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };

  if (!twin) {
    return { ok: true, data: { twin: null, morningReport: null } };
  }

  const { data: report } = await supabase
    .from("morning_reports")
    .select("id, content, created_at")
    .eq("twin_id", twin.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    ok: true,
    data: {
      twin: twin as Twin,
      morningReport: report ?? null,
    },
  };
}
