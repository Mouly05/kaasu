/**
 * Validated server environment. Importing this module fails fast with a
 * readable list of every bad key. Never import it from client components.
 */
import "server-only";

import { parseServerEnv, shouldSkipEnvValidation, type ServerEnv } from "./env-schema";

export const env: ServerEnv = shouldSkipEnvValidation(process.env)
  ? (process.env as unknown as ServerEnv)
  : parseServerEnv(process.env);
