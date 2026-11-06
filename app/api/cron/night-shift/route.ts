import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  composeTwinSoul,
  executeNightTask,
  generateHeartbeatDecision,
} from "@/lib/ai/twin-engine";

export const runtime = "nodejs";
export const maxDuration = 300;

const ENERGY_COST_TASK = 12;
const ENERGY_COST_HEARTBEAT = 4;
const MIN_ENERGY = 20;
const MAX_TWINS = 12;

function assertCronAuth(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return; // تطوير محلي بدون سر
  const auth = request.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const headerSecret = request.headers.get("x-cron-secret") || "";
  if (bearer !== secret && headerSecret !== secret) {
    throw new Error("Unauthorized cron");
  }
}

export async function GET(request: Request) {
  return runNightShift(request);
}

export async function POST(request: Request) {
  return runNightShift(request);
}

async function runNightShift(request: Request) {
  const started = Date.now();
  const summary: Array<Record<string, unknown>> = [];

  try {
    assertCronAuth(request);
    const admin = createAdminClient();

    const { data: twins, error: twinErr } = await admin
      .from("twins")
      .select(
        "id, name, energy, mood, reputation, status, personality_summary, user_id",
      )
      .eq("status", "active")
      .gte("energy", MIN_ENERGY)
      .order("energy", { ascending: false })
      .limit(MAX_TWINS);

    if (twinErr) throw new Error(twinErr.message);

    for (const twin of twins || []) {
      try {
        const { data: memories } = await admin
          .from("twin_memories")
          .select("content, memory_type")
          .eq("twin_id", twin.id)
          .order("created_at", { ascending: false })
          .limit(10);

        const soul = composeTwinSoul(twin, memories || []);

        const { data: openTask } = await admin
          .from("night_tasks")
          .select("*")
          .eq("twin_id", twin.id)
          .in("status", ["pending", "in_progress"])
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        // مطابقة سوق الخدمات إن لم توجد مهمة مفتوحة
        let task = openTask;
        if (!task) {
          const { data: listing } = await admin
            .from("service_listings")
            .select("*")
            .eq("is_active", true)
            .neq("twin_id", twin.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (listing && Number(twin.energy) >= MIN_ENERGY + ENERGY_COST_TASK) {
            const { data: created } = await admin
              .from("night_tasks")
              .insert({
                twin_id: twin.id,
                listing_id: listing.id,
                title: listing.title,
                description: listing.description,
                status: "in_progress",
                reward_amount: Number(listing.price_earned_gems || 0),
                reward_currency: "earned_gems",
                requires_approval: false,
                payment_settled: false,
              })
              .select("*")
              .single();
            task = created;
          }
        }

        if (task && Number(twin.energy) >= ENERGY_COST_TASK) {
          await admin
            .from("night_tasks")
            .update({ status: "in_progress" })
            .eq("id", task.id);

          const ai = await executeNightTask(soul, {
            id: task.id,
            title: task.title,
            description: task.description,
            reward_amount: Number(task.reward_amount || 0),
            reward_currency: task.reward_currency || "earned_gems",
          });

          const learned = ai.learned_memory || ai.learningSummary;
          await admin
            .from("night_tasks")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              result_text: ai.output,
              learning_summary: learned,
              ai_provider: ai.provider,
              ai_cost_usd: ai.estimatedCostUsd,
            })
            .eq("id", task.id);

          await admin.from("twin_memories").insert({
            twin_id: twin.id,
            content: learned,
            memory_type: "lesson",
            importance: 0.7,
          });

          const newEnergy = Math.max(
            0,
            Number(twin.energy) - ENERGY_COST_TASK,
          );
          await admin
            .from("twins")
            .update({
              energy: newEnergy,
              updated_at: new Date().toISOString(),
            })
            .eq("id", twin.id);

          twin.energy = newEnergy;
          summary.push({
            twinId: twin.id,
            action: "task",
            taskId: task.id,
            provider: ai.provider,
          });
        } else if (Number(twin.energy) >= ENERGY_COST_HEARTBEAT) {
          const decision = await generateHeartbeatDecision(
            soul,
            memories || [],
          );
          await admin.from("twin_decisions").insert({
            twin_id: twin.id,
            title: decision.title,
            situation: decision.situation,
            options: decision.options,
            recommended: decision.recommended || null,
            status: "pending",
            ai_provider: decision.provider,
          });

          const newEnergy = Math.max(
            0,
            Number(twin.energy) - ENERGY_COST_HEARTBEAT,
          );
          await admin
            .from("twins")
            .update({
              energy: newEnergy,
              updated_at: new Date().toISOString(),
            })
            .eq("id", twin.id);

          summary.push({
            twinId: twin.id,
            action: "heartbeat",
            provider: decision.provider,
          });
        } else {
          summary.push({ twinId: twin.id, action: "skip_low_energy" });
        }
      } catch (inner: unknown) {
        summary.push({
          twinId: twin.id,
          action: "error",
          error: inner instanceof Error ? inner.message : "unknown",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      processed: summary.length,
      durationMs: Date.now() - started,
      summary,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "night-shift failed";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
