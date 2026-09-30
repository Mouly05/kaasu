/**
 * Validated public (browser-safe) environment. Keys are referenced literally
 * so Next.js can inline them into the client bundle.
 */
import { parseClientEnv, shouldSkipEnvValidation, type ClientEnv } from "./env-schema";

const raw = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
};

export const clientEnv: ClientEnv = shouldSkipEnvValidation(process.env)
  ? (raw as ClientEnv)
  : parseClientEnv(raw);
