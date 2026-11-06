"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Loading from "@/components/Loading";
import {
  BILLING_CATALOG,
  type TopupSku,
} from "@/lib/billing/catalog";

interface Account {
  id: string;
  currency: string;
  balance: number;
  account_type: string;
}

const TOPUPS: TopupSku[] = [
  "gold_100",
  "gold_500",
  "gold_1500",
  "gold_5000",
];

const currencyLabels: Record<string, string> = {
  forge_gold: "ForgeGold",
  earned_gems: "Earned Gems",
};

const currencyColors: Record<string, string> = {
  forge_gold: "text-warn",
  earned_gems: "text-accent",
};

export default function BalancesPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [busySku, setBusySku] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [mode, setMode] = useState<"stripe" | "sandbox">("sandbox");
  const router = useRouter();

  const loadBalances = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login?next=/balances");
      return;
    }

    const { data: twin } = await supabase
      .from("twins")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!twin) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("accounts")
      .select("id, currency, balance, account_type")
      .eq("twin_id", twin.id);

    setAccounts((data as Account[]) || []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadBalances();
    void fetch("/api/billing/checkout")
      .then((r) => r.json())
      .then((j: { mode?: string }) => {
        if (j.mode === "stripe") setMode("stripe");
      })
      .catch(() => undefined);

    const q = new URLSearchParams(window.location.search);
    if (q.get("billing") === "sandbox_ok" || q.get("billing") === "success") {
      setStatus("تم تحديث المحفظة بنجاح");
    }
  }, [loadBalances]);

  const topup = async (sku: TopupSku) => {
    setBusySku(sku);
    setStatus(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "فشل الشحن");

      if (json.mode === "stripe" && json.url) {
        window.location.href = json.url;
        return;
      }

      setStatus(
        `تم شحن ${json.fulfilled?.forgeGoldCredited || 0} ForgeGold (Sandbox)`,
      );
      await loadBalances();
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : "فشل الشحن");
    } finally {
      setBusySku(null);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="tf-container w-full space-y-8">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#d4af37]">
        المحفظة وشحن الذهب
      </h1>

      {status ? (
        <p className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
          {status}
        </p>
      ) : null}

      {accounts.length === 0 ? (
        <p className="text-slate-300">لا توجد حسابات — أنشئ توأماً أولاً</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="rounded-2xl border border-[#c9a227]/20 bg-[#0f1624]/90 p-5"
            >
              <p className="text-sm text-slate-300">
                {currencyLabels[account.currency] || account.currency}
              </p>
              <p
                className={`mt-1 text-4xl font-bold tabular-nums ${
                  currencyColors[account.currency] || "text-fg"
                }`}
              >
                {Number(account.balance).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}

      <section className="space-y-3 rounded-2xl border border-white/15 bg-[#0f1624]/90 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-[#d4af37]">شحن ForgeGold</h2>
          <span className="text-xs text-slate-300">
            {mode === "stripe" ? "Stripe" : "Sandbox فوري"}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {TOPUPS.map((sku) => {
            const pack = BILLING_CATALOG[sku];
            return (
              <button
                key={sku}
                type="button"
                disabled={busySku === sku}
                onClick={() => void topup(sku)}
                className="rounded-xl border border-[#c9a227]/30 bg-[#0d1512] p-4 text-right transition hover:border-[#d4af37] disabled:opacity-50"
              >
                <p className="font-medium text-fg">{pack.name}</p>
                <p className="mt-1 text-2xl font-bold text-[#d4af37]">
                  ${pack.priceUsd}
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  {busySku === sku ? "جاري..." : "اشترِ الآن"}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <div className="tf-card/50 p-4 text-sm text-slate-300">
        <p>ForgeGold: للاستهلاك الداخلي (طاقة، عقارات، استدلال)</p>
        <p className="mt-1">Earned Gems: أرباح قابلة للسحب بعد التبريد</p>
      </div>
    </div>
  );
}
