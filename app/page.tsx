"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BILLING_CATALOG, type PlanSku } from "@/lib/billing/catalog";
import { useLanguage } from "@/components/LanguageProvider";
import {
  FEATURE_KEYS,
  TICKER_KEYS,
  getPlanFeatureKeys,
  type MessageKey,
} from "@/lib/i18n/translations";

const PLAN_DISPLAY: Record<PlanSku, string> = {
  starter: "Starter",
  pro: "Gold Pro",
  vip: "Emerald VIP",
  syndicate: "Syndicate",
};

export default function HomePage() {
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    void (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: twin } = await supabase
            .from("twins")
            .select("id")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();
          if (twin) {
            router.replace("/twin/dashboard");
            return;
          }
        }
      } catch {
        // continue landing
      }
      setChecking(false);
    })();
  }, [router]);

  if (checking) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-lg font-medium text-slate-300">
        {t("home.preparing")}
      </div>
    );
  }

  const ticker = TICKER_KEYS.map((k) => t(k));

  return (
    <div className="w-full">
      <div className="w-full overflow-hidden border-y border-amber-500/20 bg-[#0a101c]">
        <div className="tf-ticker-track gap-10 whitespace-nowrap py-3 text-lg font-semibold text-amber-200">
          {[...ticker, ...ticker].map((item, i) => (
            <span key={`${item}-${i}`} className="inline-block px-4">
              {item}
            </span>
          ))}
        </div>
      </div>

      <section className="tf-container relative w-full py-14 lg:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,208,97,0.12),transparent_50%)]" />
        <div className="relative grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <p className="mb-4 text-sm font-bold tracking-[0.3em] text-emerald-400">
              {t("home.eyebrow")}
            </p>
            <h1 className="tf-title-gold text-5xl font-black leading-tight lg:text-7xl">
              {t("home.heroTitle1")}
              <br />
              {t("home.heroTitle2")}
            </h1>
            <p className="mt-6 w-full text-xl font-medium leading-9 text-slate-100">
              {t("home.heroSub")}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/login" className="tf-btn-gold px-8 py-4 text-lg">
                {t("home.ctaStart")}
              </Link>
              <Link href="/subscribe" className="tf-btn-ghost px-8 py-4 text-lg">
                {t("home.ctaPlans")}
              </Link>
            </div>

            <div className="mt-10 grid w-full grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { k: "6.4%", l: "home.statYield" as MessageKey },
                { k: "100%", l: "home.statSecurity" as MessageKey },
                { k: "128+", l: "home.statTwins" as MessageKey },
                { k: "AES", l: "home.statSessions" as MessageKey },
              ].map((s) => (
                <div key={s.l} className="tf-card p-8">
                  <p className="tf-title-gold text-3xl font-extrabold">{s.k}</p>
                  <p className="mt-2 text-base font-semibold text-slate-300">
                    {t(s.l)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="tf-card tf-card-gold tf-live-glow min-h-[520px] w-full space-y-6 p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold tracking-widest text-emerald-400">
                    {t("home.previewLabel")}
                  </p>
                  <h2 className="mt-1 text-3xl font-extrabold text-white">
                    {t("home.previewName")}
                  </h2>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-base font-bold text-emerald-300">
                  {t("home.previewLive")}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Vital label={t("home.vitalEnergy")} value={92} color="bg-emerald-400" />
                <Vital label={t("home.vitalMood")} value={78} color="bg-amber-400" />
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
                <p className="text-base font-bold text-amber-300">
                  {t("home.morningTitle")}
                </p>
                <p className="mt-3 text-lg font-semibold leading-8 text-slate-100">
                  {t("home.morningBody")}
                </p>
                <button type="button" className="tf-btn-gold mt-5 w-full py-4 text-lg">
                  {t("home.morningListen")}
                </button>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-4">
                <span className="text-lg font-semibold text-slate-200">
                  {t("home.lastDeposit")}
                </span>
                <span className="text-2xl font-extrabold text-emerald-300">
                  +185 Gems
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full border-t border-white/10 py-16">
        <div className="tf-container w-full">
          <div className="mb-10 text-center">
            <h2 className="tf-title-gold text-4xl font-extrabold lg:text-5xl">
              {t("home.plansTitle")}
            </h2>
            <p className="mx-auto mt-3 w-full max-w-none text-xl font-medium text-slate-200">
              {t("home.plansSub")}
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {(["starter", "pro", "vip", "syndicate"] as PlanSku[]).map((sku) => {
              const c = BILLING_CATALOG[sku];
              const featured = sku === "vip";
              const features = getPlanFeatureKeys(sku);
              return (
                <div
                  key={sku}
                  className={`tf-card flex w-full flex-col p-8 ${
                    featured ? "tf-card-gold relative scale-[1.02]" : ""
                  }`}
                >
                  {featured ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-l from-amber-600 to-amber-300 px-4 py-1 text-xs font-extrabold text-[#1a1408]">
                      {t("common.mostPopular")}
                    </span>
                  ) : null}
                  <span className="inline-flex w-fit rounded-full border border-white/20 px-3 py-1 text-sm font-bold text-amber-300">
                    {t(`plan.${sku}.badge`)}
                  </span>
                  <h3 className="mt-4 text-2xl font-extrabold text-white">
                    {PLAN_DISPLAY[sku]}
                  </h3>
                  <p className="mt-1 text-lg font-semibold text-slate-300">{c.name}</p>
                  <p className="mt-5 text-4xl font-extrabold text-amber-300">
                    ${c.priceUsd}
                    <span className="text-base font-semibold text-slate-400">
                      {t("common.month")}
                    </span>
                  </p>
                  <ul className="mt-6 flex-1 space-y-3">
                    {features.map((f) => (
                      <li
                        key={f}
                        className="flex gap-2 text-base font-semibold text-slate-100 lg:text-lg"
                      >
                        <span className="font-extrabold text-emerald-400">✓</span>
                        <span>{t(f)}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/subscribe"
                    className={`mt-8 w-full py-3.5 text-center ${
                      featured ? "tf-btn-gold" : "tf-btn-ghost"
                    }`}
                  >
                    {t("home.subscribeNow")}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="w-full border-t border-white/10 bg-[#0a101c] py-16">
        <div className="tf-container w-full">
          <h2 className="tf-title-gold mb-3 text-center text-4xl font-extrabold lg:text-5xl">
            {t("home.featuresTitle")}
          </h2>
          <p className="mx-auto mb-10 w-full max-w-none text-center text-xl font-medium text-slate-200">
            {t("home.featuresSub")}
          </p>
          <div className="grid w-full gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURE_KEYS.map((f) => (
              <div key={f.t} className="tf-card p-8">
                <h3 className="text-2xl font-extrabold text-amber-300">{t(f.t)}</h3>
                <p className="mt-3 text-base font-semibold leading-8 text-slate-100 lg:text-lg">
                  {t(f.d)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="w-full border-t border-white/10 py-10 text-center">
        <div className="tf-container flex w-full flex-wrap justify-center gap-6 text-lg font-semibold text-slate-200">
          <Link href="/about" className="hover:text-amber-300">
            {t("home.footerAbout")}
          </Link>
          <Link href="/terms" className="hover:text-amber-300">
            {t("home.footerTerms")}
          </Link>
          <Link href="/privacy" className="hover:text-amber-300">
            {t("home.footerPrivacy")}
          </Link>
          <Link href="/admin/audit" className="hover:text-amber-300">
            {t("home.footerAudit")}
          </Link>
        </div>
        <p className="mt-4 text-base font-medium text-slate-400">
          {t("home.footerCopy")}
        </p>
      </footer>
    </div>
  );
}

function Vital({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
      <div className="mb-2 flex justify-between text-sm font-bold text-slate-200">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
