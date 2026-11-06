import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/u/", "/marketplace", "/subscribe", "/about", "/developers", "/faq"],
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
