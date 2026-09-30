/**
 * Environment variable schemas. They are kept free of `server-only` so that
 * next.config.ts, tests and env.ts can share them. Import `env` from
 * `@/lib/env` (server) or `clientEnv` from `@/lib/env.client` (browser).
 */
import { z } from "zod";

const commaList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const isBase64Of32Bytes = (value: string) => {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;
  try {
    return atob(value).length === 32;
  } catch {
    return false;
  }
};

export const AI_PROVIDERS = ["anthropic", "google", "openai"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Database
  MONGODB_URI: z
    .string({ error: "is required" })
    .regex(/^mongodb(\+srv)?:\/\//, "must start with mongodb:// or mongodb+srv://"),
  MONGODB_DB: z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,38}$/, "must be a plain database name")
    .default("kaasu"),

  // Auth.js
  AUTH_SECRET: z.string({ error: "is required" }).min(32, "must be at least 32 characters"),
  AUTH_GITHUB_ID: z.string({ error: "is required" }).min(1, "is required"),
  AUTH_GITHUB_SECRET: z.string({ error: "is required" }).min(1, "is required"),
  AUTH_URL: z.url("must be a URL").optional(),
  ALLOWED_EMAILS: z
    .string({ error: "is required" })
    .transform((value) => commaList(value).map((email) => email.toLowerCase()))
    .pipe(
      z.array(z.email("must contain only valid emails")).min(1, "must list at least one email"),
    ),

  // Crypto: AES-256-GCM key for third-party tokens stored in the DB
  ENCRYPTION_KEY: z
    .string({ error: "is required" })
    .refine(isBase64Of32Bytes, "must be base64 of 32 bytes (openssl rand -base64 32)"),

  // AI. Provider keys are optional here; the AI module checks the selected one when it runs.
  AI_PROVIDER: z
    .enum(AI_PROVIDERS, `must be one of ${AI_PROVIDERS.join(", ")}`)
    .default("anthropic"),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),

  // Telegram (optional)
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(16, "must be at least 16 characters").optional(),
  TELEGRAM_ALLOWED_CHAT_IDS: z
    .string()
    .transform(commaList)
    .pipe(z.array(z.string().regex(/^-?\d+$/, "must be numeric chat ids")))
    .optional(),

  // Vercel Cron
  CRON_SECRET: z.string({ error: "is required" }).min(16, "must be at least 16 characters"),
});

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url("must be a URL").optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

type RawEnv = Record<string, string | undefined>;

/** An empty `KEY=` in .env means "unset", so optional keys stay optional. */
function dropEmpty(raw: RawEnv): RawEnv {
  return Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== ""));
}

export class EnvValidationError extends Error {
  constructor(scope: string, issues: z.core.$ZodIssue[]) {
    const lines = issues.map(
      (issue) => `  ✗ ${issue.path.join(".") || "(root)"}: ${issue.message}`,
    );
    super(
      `Invalid ${scope} environment variables:\n${lines.join("\n")}\n` +
        `See .env.example for every key and how to generate it.`,
    );
    this.name = "EnvValidationError";
  }
}

function parseWith<T extends z.ZodType>(schema: T, scope: string, raw: RawEnv): z.infer<T> {
  const result = schema.safeParse(dropEmpty(raw));
  if (!result.success) {
    // Messages name keys and rules only; values are never included.
    throw new EnvValidationError(scope, result.error.issues);
  }
  return result.data;
}

export const parseServerEnv = (raw: RawEnv): ServerEnv => parseWith(serverEnvSchema, "server", raw);
export const parseClientEnv = (raw: RawEnv): ClientEnv => parseWith(clientEnvSchema, "client", raw);

export const shouldSkipEnvValidation = (raw: RawEnv): boolean =>
  raw.SKIP_ENV_VALIDATION === "1" || raw.SKIP_ENV_VALIDATION === "true";
