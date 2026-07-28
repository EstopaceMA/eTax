import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "staging-files.oueg.info" },
      { protocol: "https", hostname: "egov-cdn.e.gov.ph" },
      { protocol: "https", hostname: "egov-cdn-stg.oueg.info" },
    ],
  },
  outputFileTracingIncludes: {
    "/api/assistant": ["./docs/assistant/etax/**/*.md"],
    "/api/filing/pdf": [
      "./docs/1701Q2018_chrome_fillable.pdf",
    ],
  },
};

export default nextConfig;
