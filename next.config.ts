import type { NextConfig } from "next";

import { parseClientEnv, parseServerEnv, shouldSkipEnvValidation } from "./src/lib/env-schema";

// Fail fast: `pnpm dev` and `pnpm build` refuse to start with an invalid env (ADR-002).
if (!shouldSkipEnvValidation(process.env)) {
  parseServerEnv(process.env);
  parseClientEnv(process.env);
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
};

export default nextConfig;
