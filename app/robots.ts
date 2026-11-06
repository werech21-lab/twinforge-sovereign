import type { MetadataRoute } from "next";
import { resolveDynamicSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = await resolveDynamicSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/u/",
          "/marketplace",
          "/subscribe",
          "/about",
          "/developers",
          "/faq",
        ],
        disallow: [
          "/api/",
          "/admin/",
          "/dashboard",
          "/balances",
          "/withdraw",
          "/approvals",
          "/transactions",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
