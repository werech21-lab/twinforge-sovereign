import type { SupabaseClient } from "@supabase/supabase-js";

type TwinVitals = {
  name: string;
  energy: number;
  mood: number;
  reputation: number;
};

export async function generateMorningReport(
  twinId: string,
  supabase: SupabaseClient,
) {
  const { data: twin } = await supabase
    .from("twins")
    .select("name, energy, mood, reputation")
    .eq("id", twinId)
    .maybeSingle();

  if (!twin) return null;

  const { data: tasks } = await supabase
    .from("night_tasks")
    .select("title, status, reward_amount")
    .eq("twin_id", twinId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(5);

  const { data: memories } = await supabase
    .from("twin_memories")
    .select("content, memory_type")
    .eq("twin_id", twinId)
    .order("created_at", { ascending: false })
    .limit(3);

  return buildMorningReportText(twin as TwinVitals, tasks ?? [], memories ?? []);
}

export function buildMorningReportText(
  twin: TwinVitals,
  tasks: { title?: string; reward_amount?: number | null }[],
  memories: { content: string; memory_type?: string }[],
) {
  const completedCount = tasks.length;
  const totalReward = tasks.reduce(
    (sum, t) => sum + Number(t.reward_amount || 0),
    0,
  );

  const memoryBlock =
    memories.length > 0
      ? `آخر ما تعلمته:\n${memories.map((m) => `- ${m.content}`).join("\n")}`
      : "لا توجد ذكريات جديدة.";

  return `
صباح الخير، أنا ${twin.name}.

حالة اليوم:
- الطاقة: ${Number(twin.energy).toFixed(0)}%
- المزاج: ${Number(twin.mood).toFixed(0)}%
- السمعة: ${Number(twin.reputation)}

ملخص الوردية السابقة:
- المهام المنجزة: ${completedCount}
- الأرباح المحققة: ${totalReward} Earned Gems

${memoryBlock}

جاهز للعمل.
  `.trim();
}

/** Generate report text and persist it for the dashboard. */
export async function generateAndSaveMorningReport(
  twinId: string,
  supabase: SupabaseClient,
) {
  const report = await generateMorningReport(twinId, supabase);
  if (!report) return null;

  const { data, error } = await supabase
    .from("morning_reports")
    .insert({ twin_id: twinId, content: report })
    .select("id, content, created_at")
    .single();

  if (error) throw error;
  return data;
}
