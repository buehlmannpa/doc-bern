import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
