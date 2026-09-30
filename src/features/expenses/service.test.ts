import { describe, expect, it } from "vitest";

import { computeDedupeHash } from "./service";

const base = {
  date: new Date("2026-01-01T10:00:00Z"),
  amountPaise: 45_000,
  merchant: "Big Bazaar",
  direction: "debit" as const,
};

describe("computeDedupeHash", () => {
  it("is deterministic for identical input", () => {
    expect(computeDedupeHash(base)).toBe(computeDedupeHash({ ...base }));
  });

  it("normalises merchant casing and whitespace", () => {
    const a = computeDedupeHash(base);
    const b = computeDedupeHash({ ...base, merchant: "  big   bazaar " });
    const c = computeDedupeHash({ ...base, merchant: "BIG BAZAAR" });
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it("differs when the amount differs", () => {
    expect(computeDedupeHash({ ...base, amountPaise: 45_001 })).not.toBe(computeDedupeHash(base));
  });

  it("differs when the direction differs", () => {
    expect(computeDedupeHash({ ...base, direction: "credit" })).not.toBe(computeDedupeHash(base));
  });

  it("treats different UTC instants on the same IST calendar day as identical", () => {
    // 2025-12-31T20:00:00Z is 2026-01-01 01:30 IST; 2026-01-01T10:00:00Z is
    // 2026-01-01 15:30 IST. Different UTC calendar day, same IST day.
    const a = computeDedupeHash({ ...base, date: new Date("2025-12-31T20:00:00Z") });
    const b = computeDedupeHash({ ...base, date: new Date("2026-01-01T10:00:00Z") });
    expect(a).toBe(b);
  });

  it("differs across an IST calendar-day boundary", () => {
    // 2026-01-01T10:00:00Z is 2026-01-01 15:30 IST; 2026-01-01T20:00:00Z is
    // 2026-01-02 01:30 IST — same UTC date, different IST day.
    const a = computeDedupeHash({ ...base, date: new Date("2026-01-01T10:00:00Z") });
    const b = computeDedupeHash({ ...base, date: new Date("2026-01-01T20:00:00Z") });
    expect(a).not.toBe(b);
  });

  it("hashes an empty merchant deterministically without special-casing", () => {
    const a = computeDedupeHash({ ...base, merchant: "" });
    const b = computeDedupeHash({ ...base, merchant: "  " });
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });
});
