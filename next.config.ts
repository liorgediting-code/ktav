import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // מאפשר קבצים גדולים (תכניות PDF)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
