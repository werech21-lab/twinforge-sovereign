"use server";

import { createClient } from "@/lib/supabase/server";
import {
  composeTwinSoul,
  generateMorningBriefing,
} from "@/lib/ai/twin-engine";
import { getRequestLocale } from "@/lib/i18n/server";

export async function generateMorningBriefingAction(twinId: string) {
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

  const since = new Date();
  since.setHours(since.getHours() - 18);

  const [
    { data: memories },
    { data: completedTasks },
    { data: accounts },
    { data: pending },
    { data: pendingDecisions },
  ] = await Promise.all([
    supabase
      .from("twin_memories")
      .select("content, memory_type")
      .eq("twin_id", twinId)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("night_tasks")
      .select("title, reward_amount, result_text, completed_at")
      .eq("twin_id", twinId)
      .eq("status", "completed")
      .gte("completed_at", since.toISOString())
      .order("completed_at", { ascending: false })
      .limit(10),
    supabase
      .from("accounts")
      .select("currency, balance")
      .eq("twin_id", twinId),
    supabase
      .from("owner_approvals")
      .select("approval_type, details, status")
      .eq("twin_id", twinId)
      .eq("status", "pending")
      .order("requested_at", { ascending: false })
      .limit(5),
    supabase
      .from("twin_decisions")
      .select("title, status")
      .eq("twin_id", twinId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const earnedGems = Number(
    accounts?.find((a) => a.currency === "earned_gems")?.balance || 0,
  );
  const forgeGold = Number(
    accounts?.find((a) => a.currency === "forge_gold")?.balance || 0,
  );
  const tonightEarnings = (completedTasks || []).reduce(
    (sum, t) => sum + Number(t.reward_amount || 0),
    0,
  );

  const soul = composeTwinSoul(twin, memories || []);
  const briefing = await generateMorningBriefing(
    soul,
    (completedTasks || []).map((t) => ({
      title: t.title,
      reward_amount: t.reward_amount,
      output: t.result_text,
    })),
    { earnedGems, forgeGold, tonightEarnings },
    [
      ...(pending || []).map((p) => ({
        approval_type: p.approval_type,
        details: (p.details as Record<string, unknown>) || {},
      })),
      ...(pendingDecisions || []).map((d) => ({
        approval_type: `sovereign:${d.title}`,
        details: {},
      })),
    ],
    locale,
  );

  const { data: saved, error } = await supabase
    .from("morning_reports")
    .insert({ twin_id: twinId, content: briefing.report })
    .select("id, content, created_at")
    .single();

  if (error) {
    // قد تفشل الإضافة إن لم تُطبَّق سياسة الإدراج — نرجع النص فقط
    return {
      report: briefing.report,
      provider: briefing.provider,
      usedFallback: briefing.usedFallback,
      saved: null,
    };
  }

  return {
    report: briefing.report,
    provider: briefing.provider,
    usedFallback: briefing.usedFallback,
    saved,
  };
}
