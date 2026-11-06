import { headers } from "next/headers";

/**
 * Synchronous environment-based canonical URL resolver.
 * Works seamlessly across Render (`RENDER_EXTERNAL_URL`), Vercel
 * (`VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL`), and custom domains (`NEXT_PUBLIC_APP_URL`).
 */
export function getSiteUrl(): string {
  // 1. Render automatic external URL (e.g. https://arqavora-review.onrender.com or custom domain on Render)
  const renderUrl = process.env.RENDER_EXTERNAL_URL?.trim();
  if (renderUrl && /^https?:\/\//i.test(renderUrl)) {
    return renderUrl.replace(/\/+$/, "");
  }

  // 2. Explicit non-localhost NEXT_PUBLIC_APP_URL
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (
    explicit &&
    /^https?:\/\//i.test(explicit) &&
    !explicit.includes("localhost") &&
    !explicit.includes("127.0.0.1")
  ) {
    return explicit.replace(/\/+$/, "");
  }

  // 3. Vercel Production Domain
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProd) {
    return `https://${vercelProd.replace(/^https?:\/\//i, "").replace(/\/+$/, "")}`;
  }

  // 4. Vercel Preview / Deployment Domain
  const vercelPreview = process.env.VERCEL_URL?.trim();
  if (vercelPreview) {
    return `https://${vercelPreview.replace(/^https?:\/\//i, "").replace(/\/+$/, "")}`;
  }

  // 5. Fallback to Render target URL
  return "https://arqavora-review.onrender.com";
}

/**
 * Request-aware dynamic URL resolver for SEO routes (sitemap, robots, metadata, OG).
 * Automatically adapts to whichever live domain served the request (Render, Vercel, or Custom Domain).
 */
export async function resolveDynamicSiteUrl(): Promise<string> {
  try {
    const h = await headers();
    const rawHost =
      h.get("x-forwarded-host")?.split(",")[0]?.trim() ||
      h.get("host")?.trim();
    if (
      rawHost &&
      !rawHost.includes("localhost") &&
      !rawHost.startsWith("127.0.0.1")
    ) {
      const proto =
        h.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
      return `${proto}://${rawHost}`.replace(/\/+$/, "");
    }
  } catch {
    // Static generation context — fall back to environment variables
  }
  return getSiteUrl();
}
