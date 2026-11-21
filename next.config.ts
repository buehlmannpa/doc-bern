import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Nur im Testbau (E2E_PG=1): normale PostgreSQL-Datenbank statt Neon-Treiber. In Produktion ohne Wirkung.
  webpack: (config) => {
    if (process.env.E2E_PG === "1") {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@vercel/postgres": path.resolve(__dirname, "tests/support/pg-shim.ts"),
      };
    }
    return config;
  },
  // Reine Lint-Warnungen sollen das Production-Deployment nicht blockieren.
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
