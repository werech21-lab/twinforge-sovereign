"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

type RadarOpportunity = {
  id: string;
  title: string;
  description: string;
  category: string;
  expectedSuccessRate: number;
  estimatedGems: number;
  whyMatched: string;
  aiStrategy: string;
};

type MarketplaceTaskRow = {
  id: string;
  title: string;
  category: string;
  expected_success_rate: number;
  reward_gems: number;
  status: string;
  created_at: string;
};

type LearnedMemoryItem = {
  id: string;
  content: string;
  memory_type: string;
  created_at: string;
};

type Props = {
  twinId: string;
  twinName: string;
  refreshSignal?: number;
  onMemoryAdded?: (memory: LearnedMemoryItem) => void;
};

export default function OpportunityRadar({
  twinId,
  twinName,
  refreshSignal = 0,
  onMemoryAdded,
}: Props) {
  const { locale } = useLanguage();
  const [opportunities, setOpportunities] = useState<RadarOpportunity[]>([]);
  const [activeTasks, setActiveTasks] = useState<MarketplaceTaskRow[]>([]);
  const [learnedCount, setLearnedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [deployingId, setDeployingId] = useState<string | null>(null);
  const [deployedIds, setDeployedIds] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const fetchRadar = useCallback(
    async (forceRefresh = false) => {
      if (!twinId) return;
      if (forceRefresh) setScanning(true);
      else setLoading(true);
      setNotice(null);

      try {
        const qs = new URLSearchParams({
          twinId,
          locale,
          ...(forceRefresh ? { refresh: "1" } : {}),
        });
        const res = await fetch(`/api/twin/radar?${qs.toString()}`);
        const json = await res.json();
        if (res.ok && json.ok) {
          setOpportunities((json.opportunities as RadarOpportunity[]) || []);
          setActiveTasks((json.activeTasks as MarketplaceTaskRow[]) || []);
          setLearnedCount(Number(json.learnedPreferencesCount || 0));
          if (forceRefresh) setDeployedIds({});
        }
      } catch {
        setNotice("تعذر تحديث الرادار حالياً");
      } finally {
        setLoading(false);
        setScanning(false);
      }
    },
    [locale, twinId],
  );

  useEffect(() => {
    void fetchRadar(false);
  }, [fetchRadar, refreshSignal]);

  const deployOpportunity = async (opp: RadarOpportunity) => {
    setDeployingId(opp.id);
    setNotice(null);
    try {
      const res = await fetch("/api/twin/radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deploy",
          twinId,
          opportunity: opp,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "فشل تكليف التوأم");

      setDeployedIds((prev) => ({ ...prev, [opp.id]: true }));
      if (json.marketplaceTask) {
        setActiveTasks((prev) => [
          json.marketplaceTask as MarketplaceTaskRow,
          ...prev,
        ]);
      }
      if (json.learnedMemory && onMemoryAdded) {
        onMemoryAdded(json.learnedMemory as LearnedMemoryItem);
      }
      setLearnedCount((c) => c + 1);
      setNotice(`✓ تم تحويل «${opp.title}» إلى مهمة نشطة في marketplace_tasks وتحديث ذاكرة التعلم!`);
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : "فشل تكليف التوأم");
    } finally {
      setDeployingId(null);
    }
  };

  const dismissOpportunity = async (opp: RadarOpportunity) => {
    setOpportunities((prev) => prev.filter((item) => item.id !== opp.id));
    try {
      const res = await fetch("/api/twin/radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dismiss",
          twinId,
          opportunity: { title: opp.title, category: opp.category },
        }),
      });
      const json = await res.json();
      if (json.learnedMemory && onMemoryAdded) {
        onMemoryAdded(json.learnedMemory as LearnedMemoryItem);
      }
      setLearnedCount((c) => c + 1);
    } catch {
      // silent
    }
  };

  return (
    <section className="tf-card space-y-5 border-emerald-400/30">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-0.5 text-xs font-extrabold text-emerald-300">
              📡 SOVEREIGN OPPORTUNITY RADAR
            </span>
            <span className="rounded-full border border-amber-400/35 bg-amber-500/10 px-3 py-0.5 text-xs font-bold text-amber-300">
              🧠 بصمات أسلوبك المتعلمة: {learnedCount}
            </span>
          </div>
          <h2 className="mt-1.5 font-[family-name:var(--font-display)] text-2xl font-extrabold text-white">
            رادار الفرص السيادية والتعلم الذاتي
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            يبتكر «{twinName}» 3 فرص يومية مخصصة لأسلوبك في القرارات مع تحويل فوري إلى مهام نشطة.
          </p>
        </div>

        <button
          type="button"
          disabled={scanning || loading}
          onClick={() => void fetchRadar(true)}
          className="rounded-xl border border-amber-400/45 bg-amber-500/10 px-4 py-2.5 text-xs font-bold text-amber-200 transition hover:border-amber-300 disabled:opacity-50"
        >
          {scanning ? "جاري مسح السوق..." : "🔄 مسح فرص ذكية جديدة"}
        </button>
      </div>

      {notice ? (
        <div className="rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-4 py-2.5 text-xs font-bold text-emerald-200">
          {notice}
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-56 animate-pulse rounded-2xl border border-white/10 bg-[#0b1220]"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {opportunities.map((opp) => {
            const isDeployed = Boolean(deployedIds[opp.id]);
            const isBusy = deployingId === opp.id;
            return (
              <div
                key={opp.id}
                className="flex flex-col justify-between rounded-2xl border border-white/15 bg-gradient-to-b from-[#10192b] to-[#0a101c] p-5 shadow-xl transition hover:border-amber-400/45"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-extrabold text-emerald-300">
                      نجاح متوقع {opp.expectedSuccessRate}%
                    </span>
                    <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-0.5 text-xs font-extrabold text-amber-300">
                      +{opp.estimatedGems} Earned Gems
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-l from-amber-400 to-emerald-400"
                      style={{ width: `${opp.expectedSuccessRate}%` }}
                    />
                  </div>

                  <h3 className="text-base font-extrabold leading-snug text-white">
                    {opp.title}
                  </h3>
                  <p className="text-xs leading-6 text-slate-300">
                    {opp.description}
                  </p>

                  <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-2.5 text-[11px] leading-5 text-amber-100">
                    <strong className="text-amber-300">🧠 تطابق التعلم الذاتي: </strong>
                    {opp.whyMatched}
                  </div>
                </div>

                <div className="mt-4 space-y-2 pt-2">
                  <button
                    type="button"
                    disabled={isBusy || isDeployed}
                    onClick={() => void deployOpportunity(opp)}
                    className={`w-full rounded-xl py-2.5 text-xs font-extrabold transition ${
                      isDeployed
                        ? "border border-emerald-400/40 bg-emerald-500/20 text-emerald-200"
                        : "bg-gradient-to-l from-[#8a6a12] via-[#d4af37] to-[#f5d061] text-[#1a1408] hover:brightness-105"
                    } disabled:opacity-60`}
                  >
                    {isDeployed
                      ? "✓ قيد التنفيذ في marketplace_tasks"
                      : isBusy
                        ? "جاري التكليف..."
                        : "🚀 تكليف التوأم بالتنفيذ الفوري"}
                  </button>

                  {!isDeployed ? (
                    <button
                      type="button"
                      onClick={() => void dismissOpportunity(opp)}
                      className="w-full rounded-lg py-1 text-[11px] text-slate-400 hover:text-slate-200"
                    >
                      تخطي هذه الفرصة (تحديث تفضيلاتي)
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active marketplace_tasks feed */}
      {activeTasks.length > 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#080d17]/90 p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-amber-300">
              ⚡ المهام المفعّلة في سجل الفرص (`marketplace_tasks`)
            </h3>
            <span className="text-xs text-slate-400">
              {activeTasks.length} مهام نشطة
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {activeTasks.slice(0, 6).map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0e1626] px-3.5 py-2.5 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-100">
                    {task.title}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    نجاح {task.expected_success_rate}% · الحالة: {task.status}
                  </p>
                </div>
                <span className="shrink-0 font-extrabold text-emerald-400">
                  +{Number(task.reward_gems).toFixed(0)} Gems
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
