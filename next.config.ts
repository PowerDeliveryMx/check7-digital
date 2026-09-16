import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // @sparticuz/chromium resolves its binary via a relative path at runtime,
  // which Vercel's file tracer doesn't pick up on its own — force it in.
  outputFileTracingIncludes: {
    "/api/submit": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
