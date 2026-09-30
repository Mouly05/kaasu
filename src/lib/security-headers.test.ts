import { describe, expect, it } from "vitest";

import { buildCsp, buildSecurityHeaders } from "./security-headers";

const header = (headers: { key: string; value: string }[], key: string) =>
  headers.find((h) => h.key === key)?.value;

describe("buildCsp", () => {
  it("locks down framing, plugins and base URIs", () => {
    const csp = buildCsp({ isDev: false });
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("allows GitHub avatars and the OAuth form target", () => {
    const csp = buildCsp({ isDev: false });
    expect(csp).toMatch(/img-src [^;]*https:\/\/avatars\.githubusercontent\.com/);
    expect(csp).toMatch(/form-action 'self' https:\/\/github\.com/);
  });

  it("only allows eval and websockets in development", () => {
    expect(buildCsp({ isDev: false })).not.toContain("unsafe-eval");
    expect(buildCsp({ isDev: false })).not.toContain("ws:");
    expect(buildCsp({ isDev: true })).toContain("'unsafe-eval'");
    expect(buildCsp({ isDev: true })).toContain("connect-src 'self' ws:");
    expect(buildCsp({ isDev: true })).not.toContain("upgrade-insecure-requests");
  });
});

describe("buildSecurityHeaders", () => {
  it("sets the required headers", () => {
    const headers = buildSecurityHeaders({ isDev: false });
    expect(header(headers, "X-Frame-Options")).toBe("DENY");
    expect(header(headers, "X-Content-Type-Options")).toBe("nosniff");
    expect(header(headers, "Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(header(headers, "Permissions-Policy")).toContain("camera=()");
    expect(header(headers, "Strict-Transport-Security")).toContain("max-age=");
  });

  it("skips HSTS in development", () => {
    expect(
      header(buildSecurityHeaders({ isDev: true }), "Strict-Transport-Security"),
    ).toBeUndefined();
  });
});
