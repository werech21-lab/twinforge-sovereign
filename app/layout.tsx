import type { Metadata, Viewport } from "next";
import { Cairo, Readex_Pro } from "next/font/google";
import { cookies } from "next/headers";
import NavBar from "@/components/NavBar";
import ReferralCapture from "@/components/ReferralCapture";
import { LanguageProvider } from "@/components/LanguageProvider";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_META,
  LOCALES,
  normalizeLocale,
} from "@/lib/i18n/translations";
import { resolveDynamicSiteUrl } from "@/lib/site-url";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
});

const readex = Readex_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-readex",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#d4af37",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = await resolveDynamicSiteUrl();
  const languageAlternates: Record<string, string> = {};
  for (const code of LOCALES) {
    languageAlternates[code] = `${siteUrl}/?hl=${code}`;
  }
  languageAlternates["x-default"] = siteUrl;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: "TwinForge — المنصة السيادية للتوائم الرقمية والاقتصاد الليلي",
      template: "%s | TwinForge",
    },
    description:
      "اصنع توأمك الرقمي السيادي بالذكاء الاصطناعي ليعمل ويكسب ليلاً أثناء نومك — اقتصاد ثنائي العملة و12 لغة عالمية مع مكافأة +500 ForgeGold فورية.",
    keywords: [
      "TwinForge",
      "توأم رقمي",
      "AI Digital Twin",
      "Autonomous AI Agent",
      "Night Economy",
      "ForgeGold",
      "Earned Gems",
      "ذكاء اصطناعي سيادي",
      "أتمتة الأعمال",
      "AI Marketplace",
    ],
    manifest: "/manifest.json",
    alternates: {
      canonical: siteUrl,
      languages: languageAlternates,
    },
    openGraph: {
      type: "website",
      url: siteUrl,
      siteName: "TwinForge",
      title: "TwinForge — اصنع توأمك الرقمي ليعمل ويكسب ليلاً أثناء نومك ⚡",
      description:
        "المنصة السيادية للتوائم الرقمية بـ 12 لغة عالمية: تخاطب صوتي، مجلس التوأمين المشترك، ورادار فرص ذكي مع +500 ForgeGold هدية انضمام فورية.",
      locale: "ar_SA",
      alternateLocale: [
        "en_US",
        "zh_CN",
        "hi_IN",
        "es_ES",
        "fr_FR",
        "de_DE",
        "ru_RU",
        "ja_JP",
        "ko_KR",
        "tr_TR",
        "pt_BR",
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "TwinForge — Your Sovereign AI Twin Works & Earns While You Sleep ⚡",
      description:
        "Create your autonomous AI Digital Twin in 60 seconds & claim +500 ForgeGold + 10 Energy free on TwinForge.",
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "TwinForge",
    },
    icons: {
      icon: [
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        { url: "/icons/icon-512.svg", type: "image/svg+xml" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jar = await cookies();
  const locale =
    normalizeLocale(jar.get(LOCALE_COOKIE)?.value) || DEFAULT_LOCALE;
  const dir = LOCALE_META[locale].dir;

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${cairo.variable} ${readex.variable} h-full w-full overflow-x-hidden`}
      suppressHydrationWarning
    >
      <body className="min-h-screen w-full overflow-x-hidden font-[family-name:var(--font-cairo)] antialiased">
        <LanguageProvider initialLocale={locale}>
          <ReferralCapture />
          <NavBar />
          <main className="min-h-screen w-full overflow-x-hidden py-8 lg:py-12">
            {children}
          </main>
        </LanguageProvider>
      </body>
    </html>
  );
}
