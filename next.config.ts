import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/assistant": ["./docs/assistant/etax/**/*.md"],
  },
};

export default nextConfig;
