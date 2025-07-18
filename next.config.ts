import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['openai'],
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
