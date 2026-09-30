import { describe, expect, it } from "vitest";

import { isEmailAllowed, parseAllowlist } from "./allowlist";

describe("parseAllowlist", () => {
  it("returns an empty list for missing or blank input", () => {
    expect(parseAllowlist(undefined)).toEqual([]);
    expect(parseAllowlist(null)).toEqual([]);
    expect(parseAllowlist("")).toEqual([]);
    expect(parseAllowlist(" , ,")).toEqual([]);
  });

  it("trims, lower-cases and de-duplicates", () => {
    expect(parseAllowlist(" Asha@Example.com,bala@example.com , ASHA@example.com")).toEqual([
      "asha@example.com",
      "bala@example.com",
    ]);
  });
});

describe("isEmailAllowed", () => {
  const allowlist = parseAllowlist("asha@example.com,bala@example.org");

  it("allows listed emails regardless of case and surrounding whitespace", () => {
    expect(isEmailAllowed("asha@example.com", allowlist)).toBe(true);
    expect(isEmailAllowed("ASHA@Example.COM", allowlist)).toBe(true);
    expect(isEmailAllowed("  bala@example.org ", allowlist)).toBe(true);
  });

  it("rejects unlisted, missing and empty emails", () => {
    expect(isEmailAllowed("mallory@example.com", allowlist)).toBe(false);
    expect(isEmailAllowed(undefined, allowlist)).toBe(false);
    expect(isEmailAllowed(null, allowlist)).toBe(false);
    expect(isEmailAllowed("   ", allowlist)).toBe(false);
  });

  it("does not match on substrings or look-alike domains", () => {
    expect(isEmailAllowed("sha@example.com", allowlist)).toBe(false);
    expect(isEmailAllowed("asha@example.com.evil.io", allowlist)).toBe(false);
    expect(isEmailAllowed("asha@example.co", allowlist)).toBe(false);
  });

  it("rejects everyone when the allowlist is empty", () => {
    expect(isEmailAllowed("asha@example.com", [])).toBe(false);
  });
});
