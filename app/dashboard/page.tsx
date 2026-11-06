"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Loading from "@/components/Loading";
import {
  generateAndSaveMorningReport,
  generateMorningReport,
} from "@/lib/morning-report";
import {
  pulseHeartbeatAction,
  resolveDecisionAction,
} from "@/app/actions/heartbeat";
import BriefingAudioPlayer from "@/components/BriefingAudioPlayer";
import { useLanguage } from "@/components/LanguageProvider";
import TwinSwitcher from "@/components/TwinSwitcher";
import TwinCommandConsole from "@/components/TwinCommandConsole";
import OpportunityRadar from "@/components/OpportunityRadar";
import SovereignReportButton from "@/components/SovereignReportButton";
import ViralReferralHub from "@/components/ViralReferralHub";
import {
  pickActiveTwin,
  readActiveTwinId,
  writeActiveTwinId,
} from "@/lib/active-twin";

interface Twin {
  id: string;
  name: string;
  energy: number;
  mood: number;
  reputation: number;
  status: string;
  personality_summary: string | null;
  daily_inference_limit?: number | null;
}

interface Memory {
  id: string;
  content: string;
  memory_type: string;
  created_at: string;
}

interface TwinDecision {
  id: string;
  title: string;
  situation: string;
  options: string[] | unknown;
  recommended: string | null;
  status: string;
  ai_provider?: string | null;
  created_at?: string;
}

interface ActivityNotification {
  type: string;
  text: string;
  time: string;
}

const DEFAULT_DAILY_LIMIT_USD = 50.0;

export default function DashboardPage() {
  const [twins, setTwins] = useState<Twin[]>([]);
  const [twin, setTwin] = useState<Twin | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [report, setReport] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
  const [budget, setBudget] = useState<{
    remaining: number;
    dailyLimit: number;
  }>({
    remaining: DEFAULT_DAILY_LIMIT_USD,
    dailyLimit: DEFAULT_DAILY_LIMIT_USD,
  });
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [decisions, setDecisions] = useState<TwinDecision[]>([]);
  const [pulseBusy, setPulseBusy] = useState(false);
  const [radarRefreshTick, setRadarRefreshTick] = useState(0);
  const router = useRouter();
  const { t } = useLanguage();

  const loadReport = async (twinId: string) => {
    const text = await generateMorningReport(twinId);
    setReport(text);
  };

  const loadBudget = async (userId: string) => {
    try {
      const { checkInferenceBudget } = await import("@/lib/inference-budget");
      const result = await checkInferenceBudget(userId, 0);
      const limit =
        "dailyLimit" in result &&
        typeof result.dailyLimit === "number" &&
        result.dailyLimit > 0
          ? result.dailyLimit
          : DEFAULT_DAILY_LIMIT_USD;
      const rem =
        typeof result.remaining === "number" && result.remaining >= 0
          ? result.remaining
          : limit;
      setBudget({
        remaining: rem,
        dailyLimit: limit,
      });
    } catch {
      setBudget({
        remaining: DEFAULT_DAILY_LIMIT_USD,
        dailyLimit: DEFAULT_DAILY_LIMIT_USD,
      });
    }
  };

  const refreshMemories = useCallback(async (twinId: string) => {
    const supabase = createClient();
    const { data: memData } = await supabase
      .from("twin_memories")
      .select("id, content, memory_type, created_at")
      .eq("twin_id", twinId)
      .order("created_at", { ascending: false })
      .limit(10);
    setMemories((memData as Memory[]) || []);
  }, []);

  const handleMemoryAdded = useCallback((mem: Memory) => {
    setMemories((prev) => [mem, ...prev.filter((x) => x.id !== mem.id)].slice(0, 12));
  }, []);

  const loadNotifications = async (twinId: string) => {
    const supabase = createClient();

    const { data: completedTasks } = await supabase
      .from("night_tasks")
      .select("id, title, reward_amount, completed_at")
      .eq("twin_id", twinId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(3);

    const { data: withdrawals } = await supabase
      .from("audit_log")
      .select("id, created_at, new_values")
      .eq("action", "withdrawal_request")
      .eq("twin_id", twinId)
      .order("created_at", { ascending: false })
      .limit(3);

    const notifs: ActivityNotification[] = [];

    (completedTasks || []).forEach((task) => {
      notifs.push({
        type: "task",
        text: `أكملت مهمة: ${task.title} (+${task.reward_amount} Gems)`,
        time: String(task.completed_at || new Date().toISOString()),
      });
    });

    (withdrawals || []).forEach((w) => {
      notifs.push({
        type: "withdrawal",
        text: `طلب سحب: ${(w.new_values as { amount?: number } | null)?.amount ?? 0} Gems`,
        time: String(w.created_at || new Date().toISOString()),
      });
    });

    notifs.sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
    );
    setNotifications(notifs.slice(0, 5));
  };

  const hydrateTwin = useCallback(
    async (finalTwin: Twin) => {
      const supabase = createClient();
      setTwin(finalTwin);
      writeActiveTwinId(finalTwin.id);
      setReport(null);

      void (async () => {
        try {
          const { applyEnergyRecovery } = await import("@/lib/energy-recovery");
          await applyEnergyRecovery(finalTwin.id);
        } catch {
          // Graceful background recovery
        }
        try {
          const { deductPropertyCost } = await import("@/lib/property-cost");
          await deductPropertyCost(finalTwin.id);
        } catch {
          // Graceful background billing
        }
        const { data: updatedTwin } = await supabase
          .from("twins")
          .select(
            "id, name, energy, mood, reputation, status, personality_summary, daily_inference_limit",
          )
          .eq("id", finalTwin.id)
          .maybeSingle();
        if (updatedTwin) {
          setTwin(updatedTwin as Twin);
          setTwins((prev) =>
            prev.map((x) =>
              x.id === updatedTwin.id ? (updatedTwin as Twin) : x,
            ),
          );
        }
      })();

      void (async () => {
        try {
          const { generateMorningReport: genReport } = await import(
            "@/lib/morning-report"
          );
          const reportText = await genReport(finalTwin.id);
          setReport(reportText);
        } catch {
          // Graceful fallback if morning report is unavailable
        }
      })();

      await refreshMemories(finalTwin.id);

      const { data: decisionData } = await supabase
        .from("twin_decisions")
        .select("*")
        .eq("twin_id", finalTwin.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);
      setDecisions((decisionData as TwinDecision[]) || []);

      await loadNotifications(finalTwin.id);
    },
    [refreshMemories],
  );

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login?next=/dashboard");
      return;
    }

    void loadBudget(user.id);

    const { data: twinRows, error: twinErr } = await supabase
      .from("twins")
      .select(
        "id, name, energy, mood, reputation, status, personality_summary, daily_inference_limit, user_id, created_at, updated_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (twinErr) {
      setStatusMsg(twinErr.message);
      setLoading(false);
      return;
    }

    const list = (twinRows as Twin[]) || [];
    setTwins(list);

    if (list.length) {
      const preferred = readActiveTwinId();
      const finalTwin = pickActiveTwin(list, preferred)!;
      setLoading(false);
      await hydrateTwin(finalTwin);
    } else {
      setTwin(null);
      setMemories([]);
      setReport(null);
      setNotifications([]);
      setDecisions([]);
      setLoading(false);
    }
  }, [hydrateTwin, router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const onSwitch = (e: Event) => {
      const detail = (e as CustomEvent<{ twinId: string }>).detail;
      if (!detail?.twinId) return;
      const next = twins.find((x) => x.id === detail.twinId);
      if (next && next.id !== twin?.id) void hydrateTwin(next);
    };
    window.addEventListener("tf-active-twin", onSwitch);
    return () => window.removeEventListener("tf-active-twin", onSwitch);
  }, [hydrateTwin, twin?.id, twins]);

  const selectTwin = (id: string) => {
    const next = twins.find((x) => x.id === id);
    if (!next || next.id === twin?.id) {
      writeActiveTwinId(id);
      return;
    }
    writeActiveTwinId(id);
    void hydrateTwin(next);
  };

  const updateVitals = async (energyDelta: number, moodDelta: number) => {
    if (!twin) return;
    const supabase = createClient();

    const newEnergy = Math.max(
      0,
      Math.min(100, Number(twin.energy) + energyDelta),
    );
    const newMood = Math.max(0, Math.min(100, Number(twin.mood) + moodDelta));

    const { error } = await supabase
      .from("twins")
      .update({
        energy: newEnergy,
        mood: newMood,
        updated_at: new Date().toISOString(),
      })
      .eq("id", twin.id);

    if (error) {
      setStatusMsg(error.message);
      return;
    }

    setTwin({ ...twin, energy: newEnergy, mood: newMood });
    setStatusMsg(null);
  };

  const runMorningReport = async () => {
    if (!twin) return;
    setReportBusy(true);
    setStatusMsg(null);
    try {
      await generateAndSaveMorningReport(twin.id);
      await loadReport(twin.id);
    } catch (err: unknown) {
      setStatusMsg(err instanceof Error ? err.message : "فشل توليد التقرير");
    } finally {
      setReportBusy(false);
    }
  };

  const runHeartbeat = async () => {
    if (!twin) return;
    setPulseBusy(true);
    setStatusMsg(null);
    try {
      const result = await pulseHeartbeatAction(twin.id);
      const d = result.decision as TwinDecision;
      setDecisions((prev) => [d, ...prev.filter((x) => x.id !== d.id)]);
    } catch (err: unknown) {
      setStatusMsg(err instanceof Error ? err.message : "فشل نبضة الحياة");
    } finally {
      setPulseBusy(false);
    }
  };

  const resolveDecision = async (id: string, option: string) => {
    if (String(id).startsWith("ephemeral-")) {
      setDecisions((prev) => prev.filter((d) => d.id !== id));
      return;
    }
    try {
      await resolveDecisionAction(id, option, "accepted");
      setDecisions((prev) => prev.filter((d) => d.id !== id));
      if (twin) {
        await refreshMemories(twin.id);
      }
    } catch (err: unknown) {
      setStatusMsg(err instanceof Error ? err.message : "فشل حفظ القرار");
    }
  };

  const decisionOptions = (d: TwinDecision): string[] => {
    if (Array.isArray(d.options)) return d.options.map(String);
    return [];
  };

  if (loading) {
    return <Loading />;
  }

  if (!twin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-slate-300">{t("dash.noTwin")}</p>
        <button
          type="button"
          onClick={() => router.push("/twin/create")}
          className="rounded-xl bg-accent px-6 py-3 font-medium text-bg"
        >
          {t("dash.createTwin")}
        </button>
      </div>
    );
  }

  const effectiveLimit =
    Number(twin.daily_inference_limit) > 0
      ? Math.max(budget.dailyLimit, Number(twin.daily_inference_limit))
      : budget.dailyLimit || DEFAULT_DAILY_LIMIT_USD;

  return (
    <div className="tf-container w-full space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold tracking-[0.2em] text-emerald-400">
            TWIN COMMAND · FLEET {twins.length}
          </p>
          <h1 className="tf-title-gold mt-1 text-4xl font-extrabold lg:text-5xl">
            {twin.name}
          </h1>
          <p className="mt-2 text-base font-medium text-slate-300">
            {t("dash.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SovereignReportButton
            mode="dashboard"
            twin={twin}
            dailyLimitUsd={effectiveLimit}
            remainingUsd={budget.remaining}
            morningReport={report}
            memories={memories}
          />
          <TwinSwitcher
            twins={twins}
            activeId={twin.id}
            onSelect={selectTwin}
          />
          <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-base font-bold text-emerald-300">
            {twin.status}
          </span>
        </div>
      </div>

      {twins.length > 1 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#0f1624]/80 p-3">
          <span className="text-sm font-bold tracking-widest text-amber-300">
            🔄 QUICK SWITCH
          </span>
          {twins.map((tw) => {
            const isFounder = /مؤسس|قائد|founder/i.test(tw.name);
            const isSon = /ابن|مبتكر|son/i.test(tw.name);
            const label = isFounder
              ? t("dash.switchFounder")
              : isSon
                ? t("dash.switchSon")
                : tw.name;
            const active = tw.id === twin.id;
            return (
              <button
                key={tw.id}
                type="button"
                onClick={() => selectTwin(tw.id)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                  active
                    ? "bg-emerald-500/25 text-emerald-200 ring-1 ring-emerald-400/50"
                    : "border border-white/15 text-slate-200 hover:border-amber-400/50 hover:text-amber-200"
                }`}
              >
                {isFounder ? "👑 " : isSon ? "🚀 " : "◈ "}
                {label}
                <span className="ms-2 opacity-80">
                  ⚡{Math.round(Number(tw.energy))}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2">
        <VitalCard
          label={t("dash.energy")}
          value={Number(twin.energy)}
          suffix="/ 100"
        />
        <VitalCard
          label={t("dash.mood")}
          value={Number(twin.mood)}
          suffix="/ 100"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => updateVitals(-5, 0)}
          className="rounded-xl border border-white/20 px-4 py-2.5 text-base font-semibold text-white hover:border-amber-400"
        >
          طاقة −5
        </button>
        <button
          type="button"
          onClick={() => updateVitals(5, 0)}
          className="rounded-xl border border-white/20 px-4 py-2.5 text-base font-semibold text-white hover:border-amber-400"
        >
          طاقة +5
        </button>
        <button
          type="button"
          onClick={() => updateVitals(0, -5)}
          className="rounded-xl border border-white/20 px-4 py-2.5 text-base font-semibold text-white hover:border-amber-400"
        >
          مزاج −5
        </button>
        <button
          type="button"
          onClick={() => updateVitals(0, 5)}
          className="rounded-xl border border-white/20 px-4 py-2.5 text-base font-semibold text-white hover:border-amber-400"
        >
          مزاج +5
        </button>
      </div>

      {statusMsg ? <p className="text-sm text-danger">{statusMsg}</p> : null}

      {/* حد الاستدلال اليومي ($50.00) */}
      <div className="tf-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">حد الاستدلال اليومي</h2>
          <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-300">
            باقة السيادة · ${effectiveLimit.toFixed(2)}/يوم
          </span>
        </div>
        <div className="flex items-end justify-between">
          <span className="text-2xl font-bold text-accent">
            ${budget.remaining.toFixed(2)}
          </span>
          <span className="text-sm text-slate-300">
            من ${effectiveLimit.toFixed(2)}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
          <div
            className="h-full bg-accent"
            style={{
              width: `${
                effectiveLimit > 0
                  ? Math.min(100, (budget.remaining / effectiveLimit) * 100)
                  : 100
              }%`,
            }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-300">
          يُعاد تعيينه يومياً عند منتصف الليل
        </p>
      </div>

      {/* 1. غرفة التخاطب الصوتي ومجلس التوأمين المشترك */}
      <TwinCommandConsole
        activeTwin={{
          id: twin.id,
          name: twin.name,
          energy: Number(twin.energy),
          mood: Number(twin.mood),
        }}
        onMemoryAdded={handleMemoryAdded}
        onMissionCommissioned={() => {
          setRadarRefreshTick((n) => n + 1);
          void refreshMemories(twin.id);
        }}
      />

      {/* 2. رادار الفرص السيادية والتعلم الذاتي */}
      <OpportunityRadar
        twinId={twin.id}
        twinName={twin.name}
        refreshSignal={radarRefreshTick}
        onMemoryAdded={handleMemoryAdded}
      />

      {/* 3. محرك الإحالة والانتشار الفيروسي */}
      <ViralReferralHub
        mode="dashboard"
        twinId={twin.id}
        twinName={twin.name}
        reputation={Number(twin.reputation)}
      />

      <section className="tf-card p-4">
        <p className="mb-1 text-sm text-slate-300">السمعة</p>
        <p className="text-2xl font-semibold tabular-nums">
          {Number(twin.reputation).toFixed(1)}
        </p>
      </section>

      <section className="tf-card p-4">
        <h2 className="mb-2 font-[family-name:var(--font-display)] text-lg font-semibold">
          ملخص الشخصية
        </h2>
        <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
          {twin.personality_summary || "لا يوجد ملخص بعد."}
        </p>
      </section>

      {/* تقرير الصباح */}
      <div className="tf-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">{t("dash.morningReport")}</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => twin && loadReport(twin.id)}
              className="rounded bg-accent/20 px-3 py-1 text-xs text-accent"
            >
              تحديث
            </button>
            <button
              type="button"
              disabled={reportBusy}
              onClick={runMorningReport}
              className="rounded border border-white/15 px-3 py-1 text-xs text-slate-300 disabled:opacity-50"
            >
              {reportBusy ? "..." : "حفظ"}
            </button>
          </div>
        </div>
        {report ? (
          <>
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-300">
              {report}
            </pre>
            <BriefingAudioPlayer text={report} voice="onyx" />
          </>
        ) : (
          <p className="text-sm text-slate-300">اضغط تحديث لعرض التقرير</p>
        )}
      </div>

      {/* صندوق القرارات السيادية */}
      <div className="tf-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-semibold">القرارات السيادية</h2>
          <button
            type="button"
            disabled={pulseBusy}
            onClick={runHeartbeat}
            className="rounded bg-accent px-3 py-1 text-xs font-medium text-bg disabled:opacity-50"
          >
            {pulseBusy ? t("common.loading") : t("dash.heartbeat")}
          </button>
        </div>
        {decisions.length === 0 ? (
          <p className="text-sm text-slate-300">
            لا قرارات معلّقة. اضغط «نبضة حياة» لتوليد موقف جديد.
          </p>
        ) : (
          <div className="space-y-4">
            {decisions.map((d) => (
              <div
                key={d.id}
                className="border-t border-white/15 pt-3 first:border-0 first:pt-0"
              >
                <p className="font-medium">{d.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  {d.situation}
                </p>
                {d.recommended ? (
                  <p className="mt-1 text-xs text-accent">
                    اقتراح التوأم: {d.recommended}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  {decisionOptions(d).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => resolveDecision(d.id, opt)}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-xs hover:border-accent"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* الإشعارات */}
      {notifications.length > 0 && (
        <div className="tf-card p-4">
          <h2 className="mb-3 font-semibold">آخر النشاطات</h2>
          <div className="space-y-2">
            {notifications.map((n, i) => (
              <div
                key={`${n.type}-${n.time}-${i}`}
                className="flex items-start gap-2 text-sm"
              >
                <span className="text-accent">•</span>
                <div>
                  <p>{n.text}</p>
                  <p
                    className="text-xs text-slate-300"
                    suppressHydrationWarning
                  >
                    {new Date(n.time).toLocaleString("ar")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <section className="tf-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            آخر الذكريات والتعلم الذاتي
          </h2>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
            {memories.length} سجل ذاكرة
          </span>
        </div>
        {memories.length === 0 ? (
          <p className="text-sm text-slate-300">لا ذكريات بعد.</p>
        ) : (
          <ul className="space-y-3">
            {memories.map((m) => (
              <li
                key={m.id}
                className="border-t border-white/15 pt-3 first:border-0 first:pt-0"
              >
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-slate-300">
                  <span className="rounded bg-white/10 px-2 py-0.5 text-amber-300">
                    {m.memory_type}
                  </span>
                  <span suppressHydrationWarning>
                    {new Date(m.created_at).toLocaleString("ar")}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6">
                  {m.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        type="button"
        onClick={() => router.push("/twin/create")}
        className="w-full rounded-xl border border-white/15 py-3 text-sm text-slate-300 hover:border-accent hover:text-fg"
      >
        إنشاء توأم آخر
      </button>
    </div>
  );
}

function VitalCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix: string;
}) {
  return (
    <div className="tf-card tf-card-gold">
      <p className="mb-2 text-base font-semibold text-slate-300">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <span className="tf-title-gold text-5xl font-extrabold tabular-nums">
          {value.toFixed(0)}
        </span>
        <span className="text-base font-semibold text-slate-300">{suffix}</span>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-l from-emerald-600 to-emerald-300"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}
