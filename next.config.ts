import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Enable modern features
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;

