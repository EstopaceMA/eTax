import type { NextConfig } from "next";

const ssoImageHosts = (process.env.EGOV_SSO_IMAGE_HOSTS ?? "")
  .split(",")
  .map((hostname) => hostname.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: ssoImageHosts.map((hostname) => ({
      protocol: "https",
      hostname,
    })),
  },
  outputFileTracingIncludes: {
    "/api/assistant": ["./docs/assistant/etax/**/*.md"],
    "/api/filing/pdf": [
      "./docs/1701Q2018_chrome_fillable.pdf",
    ],
  },
};

export default nextConfig;
