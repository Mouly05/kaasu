import { describe, expect, it } from "vitest";

import { matchMerchantRule, nextRuleState, normaliseMerchant } from "./merchant-rules";

describe("normaliseMerchant", () => {
  it("trims, lowercases, and collapses whitespace", () => {
    expect(normaliseMerchant("  Big   Bazaar  ")).toBe("big bazaar");
  });
});

describe("matchMerchantRule", () => {
  const rules = [
    { pattern: "Swiggy", categoryId: "food", confidence: 0.8 },
    { pattern: "petrol", categoryId: "travel", confidence: 0.5 },
  ];

  it("matches the whole phrase case-insensitively", () => {
    expect(matchMerchantRule("swiggy", rules)).toEqual({ categoryId: "food", confidence: 0.8 });
    expect(matchMerchantRule("SWIGGY", rules)).toEqual({ categoryId: "food", confidence: 0.8 });
  });

  it("falls back to a per-token match", () => {
    expect(matchMerchantRule("indian oil petrol pump", rules)).toEqual({
      categoryId: "travel",
      confidence: 0.5,
    });
  });

  it("prefers the whole-phrase match over a token match", () => {
    const twoRules = [
      { pattern: "big bazaar", categoryId: "shopping", confidence: 0.9 },
      { pattern: "bazaar", categoryId: "misc", confidence: 0.3 },
    ];
    expect(matchMerchantRule("big bazaar", twoRules)).toEqual({
      categoryId: "shopping",
      confidence: 0.9,
    });
  });

  it("returns null when nothing matches", () => {
    expect(matchMerchantRule("myntra", rules)).toBeNull();
  });

  it("returns null for empty or whitespace-only text", () => {
    expect(matchMerchantRule("", rules)).toBeNull();
    expect(matchMerchantRule("   ", rules)).toBeNull();
  });

  it("returns null when there are no rules", () => {
    expect(matchMerchantRule("swiggy", [])).toBeNull();
  });
});

describe("nextRuleState", () => {
  it("starts a new rule at confidence 0.5, hits 1", () => {
    expect(nextRuleState(null, "food")).toEqual({ categoryId: "food", confidence: 0.5, hits: 1 });
  });

  it("reinforces confidence when the category is confirmed again", () => {
    expect(nextRuleState({ categoryId: "food", confidence: 0.5, hits: 1 }, "food")).toEqual({
      categoryId: "food",
      confidence: 0.6,
      hits: 2,
    });
  });

  it("caps confidence at 1", () => {
    expect(nextRuleState({ categoryId: "food", confidence: 0.95, hits: 9 }, "food")).toEqual({
      categoryId: "food",
      confidence: 1,
      hits: 10,
    });
  });

  it("resets confidence and hits when the category is corrected", () => {
    expect(nextRuleState({ categoryId: "food", confidence: 0.9, hits: 8 }, "travel")).toEqual({
      categoryId: "travel",
      confidence: 0.5,
      hits: 1,
    });
  });
});
