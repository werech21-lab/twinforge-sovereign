"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import SovereignReportButton from "@/components/SovereignReportButton";

const ADMIN_PASSWORD = "twinforge2026";

type AuditPayload = {
  treasury: { forge_gold: number; earned_gems: number };
  commission: { forge_gold: number; earned_gems: number };
  circulating: { forge_gold: number; earned_gems: number };
  ledger: Array<{
    id: string;
    amount: number;
    currency: string;
    description: string | null;
    reference_type: string | null;
    created_at: string;
    balanced: boolean;
    debit_account_id: string;
    credit_account_id: string;
  }>;
  payouts: Array<{
    id: string;
    created_at: string;
    amount: number;
    wise_email: string;
    status: string;
    cooling_until: string;
    cooling_passed: boolean;
    twin_id: string | null;
  }>;
  coolingDays: number;
};

export default function AdminAuditPage() {
  const { t } = useLanguage();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [data, setData] = useState<AuditPayload | null>(null);
  const [refFilter, setRefFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const getAdminKey = () =>
    sessionStorage.getItem("admin_activate_key") || password || ADMIN_PASSWORD;

  const load = useCallback(
    async (key?: string, filter?: string) => {
      setLoading(true);
      setStatus("");
      try {
        const adminKey = key || getAdminKey();
        const qs = new URLSearchParams({ adminKey });
        const f = filter ?? refFilter;
        if (f) qs.set("reference_type", f);
        const res = await fetch(`/api/admin/audit?${qs.toString()}`, {
          headers: { "x-admin-key": adminKey },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "فشل التحميل");
        setData(json as AuditPayload);
      } catch (err: unknown) {
        setStatus(err instanceof Error ? err.message : "فشل التحميل");
      } finally {
        setLoading(false);
      }
    },
    [refFilter],
  );

  const checkPassword = async () => {
    if (password !== ADMIN_PASSWORD) {
      setStatus("كلمة المرور غير صحيحة");
      return;
    }
    setAuthenticated(true);
    sessionStorage.setItem("admin_auth", "true");
    sessionStorage.setItem("admin_activate_key", password);
    await load(password);
  };

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_auth");
    if (saved === "true") {
      setAuthenticated(true);
      void load();
    }
  }, [load]);

  const actPayout = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    setStatus("");
    try {
      const res = await fetch("/api/admin/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminKey: getAdminKey(),
          id,
          action,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "فشلت العملية");
      await load();
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : "فشلت العملية");
    } finally {
      setBusyId(null);
    }
  };

  if (!authenticated) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="w-full max-w-sm space-y-4 rounded-2xl border border-[#c9a227]/30 bg-[#0d1512] p-6 shadow-[0_0_40px_rgba(61,214,140,0.08)]">
          <h1 className="text-center font-[family-name:var(--font-display)] text-xl font-bold text-[#d4af37]">
            {t("audit.title")}
          </h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("audit.password")}
            className="w-full rounded-xl border border-[#24332c] bg-[#121a17] px-3 py-2 outline-none focus:border-[#d4af37]"
          />
          {status ? <p className="text-sm text-danger">{status}</p> : null}
          <button
            type="button"
            onClick={() => void checkPassword()}
            className="w-full rounded-xl bg-gradient-to-l from-[#8a6a12] to-[#d4af37] py-2.5 font-semibold text-[#1a1408]"
          >
            {t("audit.unlock")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tf-container w-full space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-[#3dd68c]">
            TWINFORGE · SOVEREIGN
          </p>
          <h1 className="tf-title-gold text-4xl font-extrabold lg:text-5xl">
            {t("audit.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-300">{t("audit.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <SovereignReportButton mode="audit" auditData={data} />
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl border border-[#c9a227]/40 px-4 py-2 text-sm font-semibold text-[#d4af37] hover:border-[#d4af37]"
          >
            {loading ? "..." : t("audit.refresh")}
          </button>
        </div>
      </div>

      {status ? <p className="text-sm text-danger">{status}</p> : null}

      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              title="خزينة المنصة"
              lines={[
                `ForgeGold ${data.treasury.forge_gold.toFixed(2)}`,
                `Earned Gems ${data.treasury.earned_gems.toFixed(2)}`,
              ]}
            />
            <StatCard
              title="عمولات محصّلة"
              lines={[
                `ForgeGold ${data.commission.forge_gold.toFixed(2)}`,
                `Earned Gems ${data.commission.earned_gems.toFixed(2)}`,
              ]}
            />
            <StatCard
              title="متداول في النظام"
              lines={[
                `ForgeGold ${data.circulating.forge_gold.toFixed(2)}`,
                `Earned Gems ${data.circulating.earned_gems.toFixed(2)}`,
              ]}
            />
          </div>

          <section className="rounded-2xl border border-[#24332c] bg-[#0d1512] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-[#d4af37]">
                سجل القيود (Immutable Ledger)
              </h2>
              <select
                value={refFilter}
                onChange={(e) => {
                  setRefFilter(e.target.value);
                  void load(undefined, e.target.value);
                }}
                className="rounded-lg border border-white/15 bg-bg px-2 py-1 text-sm"
              >
                <option value="">كل الأنواع</option>
                <option value="task">task</option>
                <option value="task_commission">task_commission</option>
                <option value="task_payout">task_payout</option>
                <option value="subscription">subscription</option>
                <option value="rental">rental</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-right text-sm">
                <thead className="text-xs text-slate-300">
                  <tr className="border-b border-white/15">
                    <th className="py-2 font-medium">الوقت</th>
                    <th className="py-2 font-medium">النوع</th>
                    <th className="py-2 font-medium">المبلغ</th>
                    <th className="py-2 font-medium">الوصف</th>
                    <th className="py-2 font-medium">التوازن</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ledger.map((row) => (
                    <tr key={row.id} className="border-b border-white/10">
                      <td
                        className="py-2 text-xs text-slate-300"
                        suppressHydrationWarning
                      >
                        {new Date(row.created_at).toLocaleString("ar")}
                      </td>
                      <td className="py-2 text-accent">
                        {row.reference_type || "—"}
                      </td>
                      <td className="py-2 tabular-nums text-[#d4af37]">
                        {Number(row.amount).toFixed(2)} {row.currency}
                      </td>
                      <td className="max-w-[220px] truncate py-2 text-slate-300">
                        {row.description || "—"}
                      </td>
                      <td className="py-2">
                        {row.balanced ? (
                          <span className="text-accent">متوازن ✓</span>
                        ) : (
                          <span className="text-danger">خلل ✗</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.ledger.length === 0 ? (
                <p className="py-4 text-sm text-slate-300">لا قيود بعد</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-[#24332c] bg-[#0d1512] p-4">
            <h2 className="mb-1 font-semibold text-[#d4af37]">
              طلبات السحب البنكي
            </h2>
            <p className="mb-3 text-xs text-slate-300">
              فترة التبريد الافتراضية: {data.coolingDays} يوماً قبل الاعتماد
            </p>
            <div className="space-y-3">
              {data.payouts.filter((p) => p.status === "pending").length ===
              0 ? (
                <p className="text-sm text-slate-300">لا طلبات معلّقة</p>
              ) : (
                data.payouts
                  .filter((p) => p.status === "pending")
                  .map((p) => (
                    <div key={p.id} className="tf-card p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-[#d4af37]">
                            {p.amount.toFixed(2)} Earned Gems
                          </p>
                          <p className="text-sm text-slate-300">{p.wise_email}</p>
                          <p
                            className="mt-1 text-xs text-slate-300"
                            suppressHydrationWarning
                          >
                            تبريد حتى{" "}
                            {new Date(p.cooling_until).toLocaleString("ar")} ·{" "}
                            {p.cooling_passed ? (
                              <span className="text-accent">جاهز</span>
                            ) : (
                              <span className="text-warn">قيد التبريد</span>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={busyId === p.id || !p.cooling_passed}
                            onClick={() => void actPayout(p.id, "approve")}
                            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-bg disabled:opacity-40"
                          >
                            ✅ اعتماد وتحويل
                          </button>
                          <button
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() => void actPayout(p.id, "reject")}
                            className="rounded-lg bg-danger/80 px-3 py-1.5 text-xs font-medium text-fg disabled:opacity-40"
                          >
                            ❌ رفض وإرجاع الرصيد
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </section>
        </>
      ) : (
        <p className="text-slate-300">
          {loading ? "جاري التحميل..." : "لا بيانات"}
        </p>
      )}
    </div>
  );
}

function StatCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-2xl border border-[#c9a227]/25 bg-gradient-to-br from-[#121a17] to-[#0b1210] p-4">
      <p className="mb-2 text-xs text-slate-300">{title}</p>
      {lines.map((line) => (
        <p
          key={line}
          className="font-[family-name:var(--font-display)] text-lg font-semibold text-[#d4af37]"
        >
          {line}
        </p>
      ))}
    </div>
  );
}
