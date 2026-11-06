import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["playwright-core", "playwright", "pg"],
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
