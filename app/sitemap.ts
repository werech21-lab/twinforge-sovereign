import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/i18n/translations";
import { resolveDynamicSiteUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PUBLIC_PATHS: Array<{
  path: string;
  priority: number;
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly";
}> = [
  { path: "", priority: 1.0, changeFrequency: "daily" },
  { path: "/marketplace", priority: 0.95, changeFrequency: "hourly" },
  { path: "/subscribe", priority: 0.9, changeFrequency: "weekly" },
  { path: "/login", priority: 0.85, changeFrequency: "monthly" },
  { path: "/about", priority: 0.8, changeFrequency: "monthly" },
  { path: "/developers", priority: 0.8, changeFrequency: "weekly" },
  { path: "/faq", priority: 0.75, changeFrequency: "monthly" },
  { path: "/changelog", priority: 0.7, changeFrequency: "weekly" },
  { path: "/status", priority: 0.7, changeFrequency: "hourly" },
  { path: "/contact", priority: 0.65, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.5, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.5, changeFrequency: "monthly" },
];

function build12LanguageAlternates(fullUrl: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    const sep = fullUrl.includes("?") ? "&" : "?";
    languages[locale] = `${fullUrl}${sep}hl=${locale}`;
  }
  languages["x-default"] = fullUrl;
  return languages;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = await resolveDynamicSiteUrl();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = PUBLIC_PATHS.map((item) => {
    const url = `${siteUrl}${item.path || "/"}`;
    return {
      url,
      lastModified: now,
      changeFrequency: item.changeFrequency,
      priority: item.priority,
      alternates: {
        languages: build12LanguageAlternates(url),
      },
    };
  });

  try {
    const admin = createAdminClient();
    const { data: twins } = await admin
      .from("twins")
      .select("id, updated_at")
      .eq("status", "active")
      .order("reputation", { ascending: false })
      .limit(100);

    for (const tw of twins || []) {
      const twinUrl = `${siteUrl}/u/${tw.id}`;
      entries.push({
        url: twinUrl,
        lastModified: tw.updated_at ? new Date(tw.updated_at) : now,
        changeFrequency: "daily",
        priority: 0.85,
        alternates: {
          languages: build12LanguageAlternates(twinUrl),
        },
      });
    }
  } catch {
    // Graceful static sitemap fallback if DB env is absent at build time
  }

  return entries;
}
