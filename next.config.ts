import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { parseClientEnv, parseServerEnv, shouldSkipEnvValidation } from "./src/lib/env-schema";
import { buildSecurityHeaders } from "./src/lib/security-headers";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

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

export default withNextIntl(nextConfig);
