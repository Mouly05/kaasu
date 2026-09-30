/**
 * Request access rules for src/proxy.ts. Pure (no Next or Auth.js imports) so
 * every branch is unit-tested. Route handlers must still check their own
 * secrets/session; the proxy is the first gate, not the only one.
 */
import { createHash, timingSafeEqual } from "node:crypto";

export const LOGIN_PATH = "/login";
export const HOME_PATH = "/";

/** Pages anyone may see. Signed-in users visiting them are sent home. */
const PUBLIC_PAGES = new Set([LOGIN_PATH, `${LOGIN_PATH}/denied`]);

export type AccessDecision =
  | { type: "allow" }
  | { type: "redirect"; location: string }
  | { type: "unauthorized"; status: 401 | 404 };

export interface AccessInput {
  pathname: string;
  search?: string;
  isAuthenticated: boolean;
  headers: Headers;
  secrets: { cronSecret?: string; telegramWebhookSecret?: string };
}

/** Constant-time string comparison that does not leak length. */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function isCronAuthorized(headers: Headers, secret: string | undefined): boolean {
  if (!secret) return false;
  const header = headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;
  return safeEqual(header.slice("Bearer ".length), secret);
}

export const TELEGRAM_SECRET_HEADER = "x-telegram-bot-api-secret-token";

export function isTelegramAuthorized(headers: Headers, secret: string | undefined): boolean {
  if (!secret) return false;
  const header = headers.get(TELEGRAM_SECRET_HEADER);
  if (!header) return false;
  return safeEqual(header, secret);
}

const isUnder = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/** Only same-origin relative paths are allowed as post-login destinations. */
export function safeCallbackPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return HOME_PATH;
  }
  return value;
}

export function decideAccess({
  pathname,
  search = "",
  isAuthenticated,
  headers,
  secrets,
}: AccessInput): AccessDecision {
  if (isUnder(pathname, "/api/auth")) return { type: "allow" };

  if (pathname === "/api/telegram/webhook") {
    // 404 when the bot isn't configured, so the route isn't advertised.
    if (!secrets.telegramWebhookSecret) return { type: "unauthorized", status: 404 };
    return isTelegramAuthorized(headers, secrets.telegramWebhookSecret)
      ? { type: "allow" }
      : { type: "unauthorized", status: 401 };
  }

  if (isUnder(pathname, "/api/cron")) {
    return isCronAuthorized(headers, secrets.cronSecret)
      ? { type: "allow" }
      : { type: "unauthorized", status: 401 };
  }

  if (isUnder(pathname, "/api")) {
    return isAuthenticated ? { type: "allow" } : { type: "unauthorized", status: 401 };
  }

  if (PUBLIC_PAGES.has(pathname)) {
    return isAuthenticated ? { type: "redirect", location: HOME_PATH } : { type: "allow" };
  }

  if (isAuthenticated) return { type: "allow" };

  const callbackUrl = `${pathname}${search}`;
  const location =
    callbackUrl === HOME_PATH
      ? LOGIN_PATH
      : `${LOGIN_PATH}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  return { type: "redirect", location };
}
