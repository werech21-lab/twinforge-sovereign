export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit && /^https?:\/\//i.test(explicit) && !explicit.includes("localhost")) {
    return explicit.replace(/\/+$/, "");
  }

  const prodDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (prodDomain) {
    return `https://${prodDomain.replace(/^https?:\/\//i, "").replace(/\/+$/, "")}`;
  }

  const previewDomain = process.env.VERCEL_URL?.trim();
  if (previewDomain) {
    return `https://${previewDomain.replace(/^https?:\/\//i, "").replace(/\/+$/, "")}`;
  }

  if (explicit && /^https?:\/\//i.test(explicit)) {
    return explicit.replace(/\/+$/, "");
  }

  return "https://twinforge.vercel.app";
}
