"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/LanguageProvider";
import TwinSwitcher from "@/components/TwinSwitcher";
import PwaInstallButton from "@/components/PwaInstallButton";
import {
  pickActiveTwin,
  readActiveTwinId,
  writeActiveTwinId,
  type TwinBrief,
} from "@/lib/active-twin";
import type { Locale } from "@/lib/i18n/translations";

const linkDefs = [
  { href: "/twin/dashboard", key: "nav.dashboard" as const, icon: "◈" },
  { href: "/marketplace", key: "nav.marketplace" as const, icon: "☾" },
  { href: "/properties", key: "nav.properties" as const, icon: "⌂" },
  { href: "/balances", key: "nav.wallet" as const, icon: "◈" },
  { href: "/subscribe", key: "nav.subscribe" as const, icon: "★" },
  { href: "/approvals", key: "nav.approvals" as const, icon: "✓" },
  { href: "/withdraw", key: "nav.withdraw" as const, icon: "⇓" },
  { href: "/admin/audit", key: "nav.audit" as const, icon: "▣" },
];

export default function NavBar() {
  const pathname = usePathname();
  const { t, locale, setLocale, locales, meta } = useLanguage();
  const [email, setEmail] = useState<string | null>(null);
  const [gold, setGold] = useState<number | null>(null);
  const [gems, setGems] = useState<number | null>(null);
  const [twins, setTwins] = useState<TwinBrief[]>([]);
  const [activeTwinId, setActiveTwinId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement | null>(null);

  const loadBalances = useCallback(async (twinId: string) => {
    const supabase = createClient();
    const { data: accounts } = await supabase
      .from("accounts")
      .select("currency, balance")
      .eq("twin_id", twinId);
    setGold(
      Number(accounts?.find((a) => a.currency === "forge_gold")?.balance || 0),
    );
    setGems(
      Number(accounts?.find((a) => a.currency === "earned_gems")?.balance || 0),
    );
  }, []);

  const refreshTwins = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setEmail(null);
        setGold(null);
        setGems(null);
        setTwins([]);
        setActiveTwinId(null);
        return;
      }
      setEmail(user.email || t("nav.user"));
      const { data: twinRows } = await supabase
        .from("twins")
        .select("id, name, energy, mood, reputation, status, personality_summary")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      const list = (twinRows as TwinBrief[]) || [];
      setTwins(list);
      const preferred = readActiveTwinId();
      const active = pickActiveTwin(list, preferred);
      if (active) {
        setActiveTwinId(active.id);
        writeActiveTwinId(active.id);
        await loadBalances(active.id);
      }
    } catch {
      setEmail(null);
    }
  }, [loadBalances, t]);

  useEffect(() => {
    void refreshTwins();
  }, [pathname, refreshTwins]);

  useEffect(() => {
    const onSwitch = (e: Event) => {
      const detail = (e as CustomEvent<{ twinId: string }>).detail;
      if (!detail?.twinId) return;
      setActiveTwinId(detail.twinId);
      void loadBalances(detail.twinId);
    };
    window.addEventListener("tf-active-twin", onSwitch);
    return () => window.removeEventListener("tf-active-twin", onSwitch);
  }, [loadBalances]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!langRef.current?.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const isActive = (href: string) =>
    pathname === href ||
    pathname.startsWith(`${href}/`) ||
    (href === "/twin/dashboard" && pathname === "/dashboard");

  const pickLang = (code: Locale) => {
    setLocale(code);
    setLangOpen(false);
  };

  const onSelectTwin = (id: string) => {
    writeActiveTwinId(id);
    setActiveTwinId(id);
    void loadBalances(id);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-amber-500/20 bg-[#070a10]/90 backdrop-blur-xl">
      <div className="tf-container flex h-20 w-full items-center justify-between gap-3">
        <Link href="/" className="shrink-0">
          <span className="tf-title-gold block text-2xl font-extrabold tracking-tight lg:text-3xl">
            TwinForge
          </span>
          <span className="mt-0.5 inline-flex rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold tracking-widest text-amber-300">
            V1.0 SOVEREIGN
          </span>
        </Link>

        <nav className="hidden items-center gap-1 2xl:flex">
          {linkDefs.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap rounded-xl px-2.5 py-2 text-base font-bold transition ${
                isActive(link.href)
                  ? "bg-white/10 text-amber-300"
                  : "text-white hover:text-amber-400"
              }`}
            >
              <span className="mx-1 opacity-80">{link.icon}</span>
              {t(link.key)}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="rounded-xl border border-white/20 px-3 py-2 text-sm font-semibold text-white 2xl:hidden"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {t("nav.menu")}
        </button>

        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <div className="hidden sm:block">
            <PwaInstallButton />
          </div>

          {email ? (
            <div className="hidden lg:block">
              <TwinSwitcher
                twins={twins}
                activeId={activeTwinId}
                onSelect={onSelectTwin}
                compact
              />
            </div>
          ) : null}

          <div className="relative" ref={langRef}>
            <button
              type="button"
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-2 rounded-2xl border border-amber-400/35 bg-[#0f1624]/95 px-3 py-2 text-sm font-bold text-amber-100 shadow-lg transition hover:border-amber-300"
              aria-expanded={langOpen}
              aria-haspopup="listbox"
            >
              <span className="text-base">🌐</span>
              <span className="hidden sm:inline">{t("nav.language")}</span>
              <span className="text-lg">{meta[locale].flag}</span>
              <span className="hidden md:inline">{meta[locale].nativeName}</span>
              <span className="text-xs opacity-70">▾</span>
            </button>

            {langOpen ? (
              <div
                role="listbox"
                className="absolute end-0 z-[60] mt-2 max-h-[70vh] w-[min(92vw,320px)] overflow-y-auto rounded-2xl border border-amber-400/30 bg-[#0b1220] p-2 shadow-2xl"
              >
                {locales.map((code) => {
                  const m = meta[code];
                  const active = code === locale;
                  return (
                    <button
                      key={code}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => pickLang(code)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-base font-semibold transition ${
                        active
                          ? "bg-amber-500/20 text-amber-200"
                          : "text-slate-100 hover:bg-white/10"
                      }`}
                    >
                      <span className="text-xl">{m.flag}</span>
                      <span className="flex-1">
                        <span className="block leading-tight">{m.nativeName}</span>
                        <span className="block text-xs font-medium text-slate-400">
                          {m.englishName}
                        </span>
                      </span>
                      {active ? (
                        <span className="text-amber-300">✓</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          {email ? (
            <>
              <div className="hidden items-center gap-3 rounded-2xl border border-white/15 bg-[#0f1624]/95 px-4 py-2 shadow-xl md:flex">
                <div className="text-start">
                  <p className="text-xs font-semibold text-slate-300">ForgeGold</p>
                  <p className="text-base font-extrabold text-amber-300">
                    {gold !== null ? gold.toLocaleString(locale) : "—"}
                  </p>
                </div>
                <div className="h-8 w-px bg-white/15" />
                <div className="text-start">
                  <p className="text-xs font-semibold text-slate-300">Earned Gems</p>
                  <p className="text-base font-extrabold text-emerald-400">
                    {gems !== null ? gems.toLocaleString(locale) : "—"}
                  </p>
                </div>
              </div>
              <Link
                href="/twin/dashboard"
                className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-white hover:border-emerald-300"
              >
                <span className="block max-w-[140px] truncate text-xs text-slate-300">
                  {email}
                </span>
                {t("nav.controlPanel")}
              </Link>
            </>
          ) : (
            <Link href="/login" className="tf-btn-gold px-6 py-2.5 text-base">
              {t("nav.login")}
            </Link>
          )}
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-white/10 bg-[#070a10] 2xl:hidden">
          <div className="tf-container grid w-full gap-1.5 py-3">
            <div className="mb-1 px-1">
              <PwaInstallButton fullWidth />
            </div>
            {email ? (
              <div className="mb-2 px-1">
                <TwinSwitcher
                  twins={twins}
                  activeId={activeTwinId}
                  onSelect={(id) => {
                    onSelectTwin(id);
                    setMenuOpen(false);
                  }}
                />
              </div>
            ) : null}
            {linkDefs.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`rounded-xl px-4 py-3 text-lg font-bold ${
                  isActive(link.href)
                    ? "bg-white/10 text-amber-300"
                    : "text-white"
                }`}
              >
                {link.icon} {t(link.key)}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
