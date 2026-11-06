"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_META,
  LOCALE_STORAGE,
  LOCALES,
  type Locale,
  type MessageKey,
  normalizeLocale,
  translate,
} from "@/lib/i18n/translations";

type LanguageContextValue = {
  locale: Locale;
  dir: "rtl" | "ltr";
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey | string, vars?: Record<string, string | number>) => string;
  locales: typeof LOCALES;
  meta: typeof LOCALE_META;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readInitialLocale(serverLocale?: Locale): Locale {
  if (typeof window === "undefined") {
    return serverLocale || DEFAULT_LOCALE;
  }
  try {
    const hl = new URLSearchParams(window.location.search).get("hl")?.trim();
    if (hl && (LOCALES as readonly string[]).includes(hl)) {
      return hl as Locale;
    }
    const stored = window.localStorage.getItem(LOCALE_STORAGE);
    if (stored) return normalizeLocale(stored);
  } catch {
    // ignore
  }
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`),
  );
  if (match?.[1]) return normalizeLocale(decodeURIComponent(match[1]));
  return serverLocale || DEFAULT_LOCALE;
}

function persistLocale(locale: Locale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE, locale);
  } catch {
    // ignore
  }
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function applyDocumentLocale(locale: Locale) {
  const meta = LOCALE_META[locale];
  const root = document.documentElement;
  root.lang = locale;
  root.dir = meta.dir;
  root.setAttribute("data-locale", locale);
}

export function LanguageProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(
    () => initialLocale || DEFAULT_LOCALE,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const resolved = readInitialLocale(initialLocale);
    setLocaleState(resolved);
    applyDocumentLocale(resolved);
    persistLocale(resolved);
    setHydrated(true);
  }, [initialLocale]);

  const setLocale = useCallback((next: Locale) => {
    const locale = normalizeLocale(next);
    setLocaleState(locale);
    persistLocale(locale);
    applyDocumentLocale(locale);
  }, []);

  const t = useCallback(
    (key: MessageKey | string, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    [locale],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      dir: LOCALE_META[locale].dir,
      setLocale,
      t,
      locales: LOCALES,
      meta: LOCALE_META,
    }),
    [locale, setLocale, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      <div
        lang={locale}
        dir={LOCALE_META[locale].dir}
        data-hydrated={hydrated ? "1" : "0"}
        className="min-h-screen w-full"
      >
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}

/** Safe hook for optional usage — falls back to Arabic dictionary */
export function useT() {
  const ctx = useContext(LanguageContext);
  return (
    key: MessageKey | string,
    vars?: Record<string, string | number>,
  ) => translate(ctx?.locale || DEFAULT_LOCALE, key, vars);
}
