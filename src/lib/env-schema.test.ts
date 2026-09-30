import { describe, expect, it } from "vitest";

import {
  EnvValidationError,
  parseClientEnv,
  parseServerEnv,
  shouldSkipEnvValidation,
} from "./env-schema";

// Fake values only.
const valid = {
  MONGODB_URI: "mongodb+srv://user:pass@cluster0.example.mongodb.net/kaasu",
  AUTH_SECRET: "a".repeat(32),
  AUTH_GITHUB_ID: "gh-id",
  AUTH_GITHUB_SECRET: "gh-secret",
  ALLOWED_EMAILS: " Owner@Example.com, second@example.com ,",
  ENCRYPTION_KEY: btoa("x".repeat(32)),
  CRON_SECRET: "c".repeat(16),
};

const messageOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("expected function to throw");
};

describe("parseServerEnv", () => {
  it("parses a valid env and applies defaults and transforms", () => {
    const env = parseServerEnv(valid);
    expect(env.ALLOWED_EMAILS).toEqual(["owner@example.com", "second@example.com"]);
    expect(env.AI_PROVIDER).toBe("anthropic");
    expect(env.NODE_ENV).toBe("development");
    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
  });

  it("treats empty strings as unset", () => {
    const env = parseServerEnv({ ...valid, OPENAI_API_KEY: "", TELEGRAM_BOT_TOKEN: "" });
    expect(env.OPENAI_API_KEY).toBeUndefined();
    expect(env.TELEGRAM_BOT_TOKEN).toBeUndefined();
  });

  it("parses Telegram chat ids", () => {
    const env = parseServerEnv({ ...valid, TELEGRAM_ALLOWED_CHAT_IDS: "123, -100456" });
    expect(env.TELEGRAM_ALLOWED_CHAT_IDS).toEqual(["123", "-100456"]);
  });

  it("lists every missing required key in one readable error", () => {
    const message = messageOf(() => parseServerEnv({}));
    for (const key of [
      "MONGODB_URI",
      "AUTH_SECRET",
      "AUTH_GITHUB_ID",
      "AUTH_GITHUB_SECRET",
      "ALLOWED_EMAILS",
      "ENCRYPTION_KEY",
      "CRON_SECRET",
    ]) {
      expect(message).toContain(`✗ ${key}:`);
    }
    expect(message).toContain(".env.example");
  });

  it.each([
    ["ENCRYPTION_KEY", "not-base64!!"],
    ["ENCRYPTION_KEY", btoa("too-short")],
    ["ENCRYPTION_KEY", "%%%%"],
    ["ENCRYPTION_KEY", "abcde"],
    ["MONGODB_URI", "postgres://localhost"],
    ["ALLOWED_EMAILS", "not-an-email"],
    ["ALLOWED_EMAILS", " , "],
    ["AI_PROVIDER", "cohere"],
    ["CRON_SECRET", "short"],
  ])("rejects a bad %s without leaking its value", (key, value) => {
    const error = (() => {
      try {
        parseServerEnv({ ...valid, [key]: value });
      } catch (e) {
        return e;
      }
    })();
    expect(error).toBeInstanceOf(EnvValidationError);
    const { message } = error as Error;
    expect(message).toContain(key);
    if (value.trim().length >= 4) expect(message).not.toContain(value);
  });
});

describe("parseClientEnv", () => {
  it("accepts an optional app URL", () => {
    expect(parseClientEnv({})).toEqual({});
    expect(
      parseClientEnv({ NEXT_PUBLIC_APP_URL: "https://kaasu.example.com" }).NEXT_PUBLIC_APP_URL,
    ).toBe("https://kaasu.example.com");
    expect(() => parseClientEnv({ NEXT_PUBLIC_APP_URL: "nope" })).toThrow(EnvValidationError);
  });
});

describe("shouldSkipEnvValidation", () => {
  it.each([
    ["1", true],
    ["true", true],
    ["0", false],
    [undefined, false],
  ])("SKIP_ENV_VALIDATION=%s → %s", (value, expected) => {
    expect(shouldSkipEnvValidation({ SKIP_ENV_VALIDATION: value })).toBe(expected);
  });
});
