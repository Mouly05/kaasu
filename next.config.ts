import type { NextConfig } from "next";

import { parseClientEnv, parseServerEnv, shouldSkipEnvValidation } from "./src/lib/env-schema";
import { buildSecurityHeaders } from "./src/lib/security-headers";

// Fail fast: `pnpm dev` and `pnpm build` refuse to start with an invalid env (ADR-002).
if (!shouldSkipEnvValidation(process.env)) {
  parseServerEnv(process.env);
  parseClientEnv(process.env);
}

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "avatars.githubusercontent.com" }],
  },
  async headers() {
    return [{ source: "/(.*)", headers: buildSecurityHeaders({ isDev }) }];
  },
};

export default nextConfig;
