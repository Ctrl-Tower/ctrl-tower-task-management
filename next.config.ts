import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // Pin the tracing root to this project (a stray lockfile sits in ~/Desktop).
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
