// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  decideAccess,
  isCronAuthorized,
  isTelegramAuthorized,
  safeCallbackPath,
  safeEqual,
  type AccessInput,
} from "./access";

const secrets = {
  cronSecret: "cron-secret-0123456789",
  telegramWebhookSecret: "tg-secret-0123456789",
};

function input(overrides: Partial<AccessInput>): AccessInput {
  return {
    pathname: "/",
    isAuthenticated: false,
    headers: new Headers(),
    secrets,
    ...overrides,
  };
}

describe("safeEqual", () => {
  it("compares strings of any length", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});

describe("isCronAuthorized", () => {
  it("accepts the exact bearer secret only", () => {
    const ok = new Headers({ authorization: `Bearer ${secrets.cronSecret}` });
    expect(isCronAuthorized(ok, secrets.cronSecret)).toBe(true);
    expect(
      isCronAuthorized(new Headers({ authorization: "Bearer nope" }), secrets.cronSecret),
    ).toBe(false);
    expect(
      isCronAuthorized(new Headers({ authorization: secrets.cronSecret }), secrets.cronSecret),
    ).toBe(false);
    expect(isCronAuthorized(new Headers(), secrets.cronSecret)).toBe(false);
  });

  it("rejects everything when no secret is configured", () => {
    expect(isCronAuthorized(new Headers({ authorization: "Bearer " }), undefined)).toBe(false);
    expect(isCronAuthorized(new Headers({ authorization: "Bearer " }), "")).toBe(false);
  });
});

describe("isTelegramAuthorized", () => {
  it("checks the secret-token header", () => {
    const ok = new Headers({ "x-telegram-bot-api-secret-token": secrets.telegramWebhookSecret });
    expect(isTelegramAuthorized(ok, secrets.telegramWebhookSecret)).toBe(true);
    const bad = new Headers({ "x-telegram-bot-api-secret-token": "wrong" });
    expect(isTelegramAuthorized(bad, secrets.telegramWebhookSecret)).toBe(false);
    expect(isTelegramAuthorized(new Headers(), secrets.telegramWebhookSecret)).toBe(false);
    expect(isTelegramAuthorized(ok, undefined)).toBe(false);
  });
});

describe("safeCallbackPath", () => {
  it.each([
    ["/expenses?month=2026-09", "/expenses?month=2026-09"],
    ["/", "/"],
    [null, "/"],
    ["", "/"],
    ["https://evil.example", "/"],
    ["//evil.example", "/"],
    ["/\\evil.example", "/"],
    ["javascript:alert(1)", "/"],
  ])("%j → %j", (value, expected) => {
    expect(safeCallbackPath(value)).toBe(expected);
  });
});

describe("decideAccess", () => {
  it("always allows Auth.js routes", () => {
    expect(decideAccess(input({ pathname: "/api/auth/callback/github" }))).toEqual({
      type: "allow",
    });
    expect(decideAccess(input({ pathname: "/api/auth" }))).toEqual({ type: "allow" });
  });

  it("does not treat look-alike prefixes as public", () => {
    expect(decideAccess(input({ pathname: "/api/authx" }))).toEqual({
      type: "unauthorized",
      status: 401,
    });
    expect(decideAccess(input({ pathname: "/api/cronjob" }))).toEqual({
      type: "unauthorized",
      status: 401,
    });
  });

  describe("telegram webhook", () => {
    const pathname = "/api/telegram/webhook";

    it("allows the correct secret header without a session", () => {
      const headers = new Headers({
        "x-telegram-bot-api-secret-token": secrets.telegramWebhookSecret,
      });
      expect(decideAccess(input({ pathname, headers }))).toEqual({ type: "allow" });
    });

    it("rejects a missing or wrong header, even with a session", () => {
      expect(decideAccess(input({ pathname, isAuthenticated: true }))).toEqual({
        type: "unauthorized",
        status: 401,
      });
    });

    it("404s when the bot is not configured", () => {
      expect(decideAccess(input({ pathname, secrets: { cronSecret: "x" } }))).toEqual({
        type: "unauthorized",
        status: 404,
      });
    });
  });

  describe("cron", () => {
    it("allows the bearer secret without a session", () => {
      const headers = new Headers({ authorization: `Bearer ${secrets.cronSecret}` });
      expect(decideAccess(input({ pathname: "/api/cron/daily", headers }))).toEqual({
        type: "allow",
      });
    });

    it("rejects a session without the bearer secret", () => {
      expect(decideAccess(input({ pathname: "/api/cron/daily", isAuthenticated: true }))).toEqual({
        type: "unauthorized",
        status: 401,
      });
    });
  });

  describe("other API routes", () => {
    it("401s without a session instead of redirecting", () => {
      expect(decideAccess(input({ pathname: "/api/ai/chat" }))).toEqual({
        type: "unauthorized",
        status: 401,
      });
    });

    it("allows with a session", () => {
      expect(decideAccess(input({ pathname: "/api/ai/chat", isAuthenticated: true }))).toEqual({
        type: "allow",
      });
    });
  });

  describe("pages", () => {
    it("shows public pages to guests and sends signed-in users home", () => {
      expect(decideAccess(input({ pathname: "/login" }))).toEqual({ type: "allow" });
      expect(decideAccess(input({ pathname: "/login/denied" }))).toEqual({ type: "allow" });
      expect(decideAccess(input({ pathname: "/login", isAuthenticated: true }))).toEqual({
        type: "redirect",
        location: "/",
      });
    });

    it("redirects guests to /login with a callbackUrl", () => {
      expect(decideAccess(input({ pathname: "/settings", search: "?tab=data" }))).toEqual({
        type: "redirect",
        location: "/login?callbackUrl=%2Fsettings%3Ftab%3Ddata",
      });
    });

    it("omits the callbackUrl for the home page", () => {
      expect(decideAccess(input({ pathname: "/" }))).toEqual({
        type: "redirect",
        location: "/login",
      });
    });

    it("allows signed-in users", () => {
      expect(decideAccess(input({ pathname: "/settings", isAuthenticated: true }))).toEqual({
        type: "allow",
      });
    });
  });
});
