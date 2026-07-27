import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/assistant": ["./docs/assistant/etax/**/*.md"],
    "/api/filing/pdf": [
      "./docs/1701Q2018_chrome_fillable.pdf",
    ],
  },
};

export default nextConfig;
