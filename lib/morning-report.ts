"use client";

import { createClient } from "@/lib/supabase/client";
import {
  buildMorningReportText,
  generateAndSaveMorningReport as saveReport,
} from "@/lib/generate-morning-report";

/**
 * Client-side helper: يفضّل استدعاء /api/morning/briefing للذكاء الاصطناعي.
 * يبقى كـ Fallback محلي سريع.
 */
export async function generateMorningReport(twinId: string) {
  const supabase = createClient();

  // Prefer latest saved briefing (seed / night shift) for instant playback
  const { data: saved } = await supabase
    .from("morning_reports")
    .select("content, created_at")
    .eq("twin_id", twinId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (saved?.content) return saved.content;

  try {
    const res = await fetch("/api/morning/briefing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ twinId }),
    });
    if (res.ok) {
      const json = (await res.json()) as { report?: string };
      if (json.report) return json.report;
    }
  } catch {
    // fall through to static
  }

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

  return buildMorningReportText(twin, tasks ?? [], memories ?? []);
}

export async function generateAndSaveMorningReport(twinId: string) {
  try {
    const res = await fetch("/api/morning/briefing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ twinId }),
    });
    if (res.ok) {
      const json = (await res.json()) as {
        saved?: { id: string; content: string; created_at: string } | null;
        report?: string;
      };
      if (json.saved) return json.saved;
      if (json.report) {
        return {
          id: "ephemeral",
          content: json.report,
          created_at: new Date().toISOString(),
        };
      }
    }
  } catch {
    // fall through
  }

  const supabase = createClient();
  return saveReport(twinId, supabase);
}
