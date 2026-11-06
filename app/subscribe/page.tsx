"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Loading from "@/components/Loading";
import { BILLING_CATALOG, type PlanSku } from "@/lib/billing/catalog";

interface Plan {
  id: string;
  name: string;
  display_name: string;
  price_usd: number;
  night_work_hours: number;
  max_daily_inference_usd: number;
}

const FALLBACK_PLANS: Plan[] = (
  ["starter", "pro", "vip", "syndicate"] as PlanSku[]
).map((name) => {
  const c = BILLING_CATALOG[name];
  return {
    id: name,
    name,
    display_name: c.name,
    price_usd: c.priceUsd,
    night_work_hours:
      name === "starter" ? 2 : name === "pro" ? 6 : name === "vip" ? 12 : 24,
    max_daily_inference_usd:
      name === "starter"
        ? 0.3
        : name === "pro"
          ? 1
          : name === "vip"
            ? 2.5
            : 10,
  };
});

export default function SubscribePage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busySku, setBusySku] = useState<string | null>(null);
  const [mode, setMode] = useState<"stripe" | "sandbox">("sandbox");
  const [status, setStatus] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price_usd");
      setPlans((data as Plan[])?.length ? (data as Plan[]) : FALLBACK_PLANS);
    } catch {
      setPlans(FALLBACK_PLANS);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadPlans();
    void fetch("/api/billing/checkout")
      .then((r) => r.json())
      .then((j: { mode?: string }) => {
        if (j.mode === "stripe") setMode("stripe");
      })
      .catch(() => undefined);

    const q = new URLSearchParams(window.location.search);
    if (q.get("billing") === "sandbox_ok") {
      setStatus("تم تفعيل الباقة فوراً (وضع التجربة Sandbox)");
    }
    if (q.get("billing") === "cancel") {
      setStatus("تم إلغاء الدفع");
    }
  }, [loadPlans]);

  const checkout = async (sku: string) => {
    setBusySku(sku);
    setStatus(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "فشل الدفع");

      if (json.mode === "stripe" && json.url) {
        window.location.href = json.url;
        return;
      }

      setStatus(
        `Sandbox: تم تفعيل «${sku}» + ${json.fulfilled?.forgeGoldCredited || 0} ForgeGold`,
      );
      if (json.redirect) {
        window.history.replaceState({}, "", json.redirect);
      }
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : "فشل الدفع");
    } finally {
      setBusySku(null);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="tf-container w-full space-y-8">
      <div className="text-center">
        <p className="text-xs tracking-[0.25em] text-[#d4af37]">SUBSCRIPTIONS</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[#d4af37]">
          اختر باقتك السيادية
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          الوضع الحالي:{" "}
          <span className="text-accent">
            {mode === "stripe" ? "Stripe Checkout" : "Instant Sandbox"}
          </span>
        </p>
      </div>

      {status ? (
        <p className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-center text-sm text-accent">
          {status}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => {
          const catalog = BILLING_CATALOG[plan.name as PlanSku];
          return (
            <div
              key={plan.id}
              className="rounded-2xl border border-[#c9a227]/25 bg-gradient-to-br from-[#121a17] to-[#0b1210] p-5"
            >
              <h2 className="text-xl font-semibold text-fg">
                {plan.display_name}
              </h2>
              <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-[#d4af37]">
                ${Number(plan.price_usd)}
                <span className="text-sm text-slate-300">/شهر</span>
              </p>
              <ul className="mt-4 space-y-1 text-sm text-slate-300">
                <li>ساعات العمل الليلي: {plan.night_work_hours}</li>
                <li>
                  حد الاستدلال اليومي: ${Number(plan.max_daily_inference_usd)}
                </li>
                {catalog ? (
                  <li className="text-accent">
                    مكافأة تفعيل: +{catalog.forgeGold} ForgeGold
                  </li>
                ) : null}
              </ul>

              <button
                type="button"
                disabled={busySku === plan.name}
                onClick={() => void checkout(plan.name)}
                className="mt-4 w-full rounded-xl bg-gradient-to-l from-[#8a6a12] via-[#d4af37] to-[#f0d878] py-3 font-semibold text-[#1a1408] disabled:opacity-50"
              >
                {busySku === plan.name
                  ? "جاري المعالجة..."
                  : mode === "stripe"
                    ? "ادفع عبر Stripe"
                    : "تفعيل فوري (Sandbox)"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
