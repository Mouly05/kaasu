import { describe, expect, it } from "vitest";

import { todayIST } from "@/lib/dates";

import { parseQuickAddText, type ParseQuickAddTextOptions } from "./parser";

const NOW = new Date("2026-09-30T10:00:00Z"); // 30 Sep 2026, 15:30 IST

const CATEGORIES = [
  { id: "cat-rent", name: "Rent" },
  { id: "cat-food", name: "Food & Groceries" },
  { id: "cat-medical", name: "Medical" },
  { id: "cat-travel", name: "Travel" },
  { id: "cat-subscriptions", name: "Subscriptions" },
  { id: "cat-shopping", name: "Shopping" },
  { id: "cat-emi", name: "EMI" },
  { id: "cat-gold", name: "Gold" },
];

const ACCOUNTS = [
  { id: "acc-cash", type: "cash" as const },
  { id: "acc-upi", type: "upi" as const },
];

function parse(input: string, overrides: Partial<ParseQuickAddTextOptions> = {}) {
  return parseQuickAddText(input, {
    categories: CATEGORIES,
    accounts: ACCOUNTS,
    now: NOW,
    ...overrides,
  });
}

describe("parseQuickAddText", () => {
  it("1. amount + category keyword + merchant", () => {
    const draft = parse("food 120 swiggy");
    expect(draft.amountPaise).toEqual({ value: 12_000, confidence: 1, source: "explicit" });
    expect(draft.categoryId).toMatchObject({ value: "cat-food", source: "keyword" });
    expect(draft.merchant.value).toBe("swiggy");
    expect(draft.date).toEqual({ value: todayIST(NOW), confidence: 1, source: "default" });
  });

  it("2. amount + category keyword, no merchant left over", () => {
    const draft = parse("120 auto");
    expect(draft.amountPaise.value).toBe(12_000);
    expect(draft.categoryId).toMatchObject({ value: "cat-travel", source: "keyword" });
    expect(draft.merchant.value).toBeNull();
  });

  it("3. amount + category + relative date", () => {
    const draft = parse("rent 7000 yesterday");
    expect(draft.amountPaise.value).toBe(700_000);
    expect(draft.categoryId).toMatchObject({ value: "cat-rent", source: "keyword" });
    expect(draft.date).toEqual({
      value: new Date("2026-09-28T18:30:00.000Z"),
      confidence: 1,
      source: "explicit",
    });
    expect(draft.merchant.value).toBeNull();
  });

  it("4. amount + category + account keyword", () => {
    const draft = parse("medical 450 upi");
    expect(draft.amountPaise.value).toBe(45_000);
    expect(draft.categoryId).toMatchObject({ value: "cat-medical" });
    expect(draft.accountId).toEqual({ value: "acc-upi", confidence: 0.9, source: "keyword" });
    expect(draft.merchant.value).toBeNull();
  });

  it("5. Tamil-English mixed keyword for Food", () => {
    const draft = parse("saapadu 150");
    expect(draft.amountPaise.value).toBe(15_000);
    expect(draft.categoryId).toMatchObject({ value: "cat-food", source: "keyword" });
  });

  it("6. account keyword 'cash'", () => {
    const draft = parse("petrol 500 cash");
    expect(draft.amountPaise.value).toBe(50_000);
    expect(draft.categoryId).toMatchObject({ value: "cat-travel" });
    expect(draft.accountId).toMatchObject({ value: "acc-cash", source: "keyword" });
  });

  it("7. shorthand amount '1.2k' + first-token-wins category", () => {
    const draft = parse("1.2k grocery shopping");
    expect(draft.amountPaise.value).toBe(120_000);
    expect(draft.categoryId).toMatchObject({ value: "cat-food" });
    expect(draft.merchant.value).toBe("shopping");
  });

  it("8. merchant-only text with no rule falls back to no category", () => {
    const draft = parse("swiggy 200");
    expect(draft.amountPaise.value).toBe(20_000);
    expect(draft.categoryId).toEqual({ value: null, confidence: 0, source: "none" });
    expect(draft.merchant.value).toBe("swiggy");
  });

  it("9. a learned MerchantRule wins over the keyword map", () => {
    const draft = parse("swiggy 200", {
      merchantRules: [{ pattern: "swiggy", categoryId: "cat-food", confidence: 0.8 }],
    });
    expect(draft.categoryId).toEqual({
      value: "cat-food",
      confidence: 0.8,
      source: "merchant_rule",
    });
    expect(draft.merchant.value).toBe("swiggy");
  });

  it("10. standalone currency marker token is stripped as noise", () => {
    const draft = parse("rs 500 medical");
    expect(draft.amountPaise.value).toBe(50_000);
    expect(draft.categoryId).toMatchObject({ value: "cat-medical" });
    expect(draft.merchant.value).toBeNull();
  });

  it("11. currency symbol + comma attached to the amount token", () => {
    const draft = parse("₹1,200 shopping myntra");
    expect(draft.amountPaise.value).toBe(120_000);
    expect(draft.categoryId).toMatchObject({ value: "cat-shopping" });
    expect(draft.merchant.value).toBe("myntra");
  });

  it("12. shorthand amount attached directly to a category keyword", () => {
    const draft = parse("1.2k medical");
    expect(draft.amountPaise.value).toBe(120_000);
    expect(draft.categoryId).toMatchObject({ value: "cat-medical" });
    expect(draft.merchant.value).toBeNull();
  });

  it("13. a bare 'lakh' word is not joined with a preceding number", () => {
    const draft = parse("2 lakh gold");
    expect(draft.amountPaise.value).toBe(200); // "2" alone, not "2 lakh"
    expect(draft.categoryId).toMatchObject({ value: "cat-gold" });
    expect(draft.merchant.value).toBe("lakh");
  });

  it("14. no recognisable amount at all", () => {
    const draft = parse("no amount at all just text");
    expect(draft.amountPaise).toEqual({ value: null, confidence: 0, source: "none" });
    expect(draft.categoryId.value).toBeNull();
    expect(draft.merchant.value).toBe("no amount at all just text");
  });

  it("15. empty input", () => {
    const draft = parse("");
    expect(draft.amountPaise).toEqual({ value: null, confidence: 0, source: "none" });
    expect(draft.categoryId).toEqual({ value: null, confidence: 0, source: "none" });
    expect(draft.merchant).toEqual({ value: null, confidence: 0, source: "none" });
    expect(draft.date.source).toBe("default");
    // accountId is a required field on Transaction, so it still defaults to the first account.
    expect(draft.accountId).toEqual({ value: "acc-cash", confidence: 0.4, source: "default" });
  });

  it("16. merchant-only text, no amount, no rule", () => {
    const draft = parse("just swiggy");
    expect(draft.amountPaise.value).toBeNull();
    expect(draft.categoryId.value).toBeNull();
    expect(draft.merchant.value).toBe("just swiggy");
  });

  it("17. a MerchantRule can resolve a category even with zero amount", () => {
    const draft = parse("swiggy", {
      merchantRules: [{ pattern: "swiggy", categoryId: "cat-food", confidence: 0.8 }],
    });
    expect(draft.amountPaise.value).toBeNull();
    expect(draft.categoryId).toEqual({
      value: "cat-food",
      confidence: 0.8,
      source: "merchant_rule",
    });
    expect(draft.merchant.value).toBe("swiggy");
  });

  it("18. only the first account keyword is consumed; a second is left as merchant text", () => {
    const draft = parse("120 cash upi");
    expect(draft.accountId).toMatchObject({ value: "acc-cash", source: "keyword" });
    expect(draft.merchant.value).toBe("upi");
  });

  it("19. a dd-mm date token with no category/amount left over", () => {
    const draft = parse("30-09 rent");
    expect(draft.date).toEqual({
      value: new Date("2026-09-29T18:30:00.000Z"),
      confidence: 1,
      source: "explicit",
    });
    expect(draft.categoryId).toMatchObject({ value: "cat-rent" });
    expect(draft.amountPaise.value).toBeNull();
    expect(draft.merchant.value).toBeNull();
  });

  it("20. dd-mm-yyyy with an explicit year", () => {
    const draft = parse("05-01-2026 subscription 299");
    expect(draft.date.value).toEqual(new Date("2026-01-04T18:30:00.000Z"));
    expect(draft.amountPaise.value).toBe(29_900);
    expect(draft.categoryId).toMatchObject({ value: "cat-subscriptions" });
  });

  it("21. a future dd-mm date is not rolled back a year", () => {
    const draft = parse("31-12 emi 5000");
    expect(draft.date.value).toEqual(new Date("2026-12-30T18:30:00.000Z"));
    expect(draft.amountPaise.value).toBe(500_000);
    expect(draft.categoryId).toMatchObject({ value: "cat-emi" });
  });

  it("22. a two-decimal amount", () => {
    const draft = parse("shopping 999.99");
    expect(draft.amountPaise.value).toBe(99_999);
    expect(draft.categoryId).toMatchObject({ value: "cat-shopping" });
    expect(draft.merchant.value).toBeNull();
  });

  it("23. Tamil keyword for Rent", () => {
    const draft = parse("vaadagai 7000");
    expect(draft.amountPaise.value).toBe(700_000);
    expect(draft.categoryId).toMatchObject({ value: "cat-rent" });
  });

  it("24. Tamil keyword for Medical, with a merchant left over", () => {
    const draft = parse("marunthu 300 apollo");
    expect(draft.amountPaise.value).toBe(30_000);
    expect(draft.categoryId).toMatchObject({ value: "cat-medical" });
    expect(draft.merchant.value).toBe("apollo");
  });

  it("25. falls back to the last-used category/account when nothing else matches", () => {
    const draft = parse("just some text", {
      lastUsedCategoryId: "cat-shopping",
      lastUsedAccountId: "acc-upi",
    });
    expect(draft.categoryId).toEqual({ value: "cat-shopping", confidence: 0.4, source: "default" });
    expect(draft.accountId).toEqual({ value: "acc-upi", confidence: 0.4, source: "default" });
  });

  it("26. an unresolvable category/account keyword (no matching user category/account) falls through to default", () => {
    const draft = parseQuickAddText("rent 500", {
      categories: [], // user has no "Rent" category
      accounts: [],
      now: NOW,
    });
    expect(draft.categoryId).toEqual({ value: null, confidence: 0, source: "none" });
    expect(draft.accountId).toEqual({ value: null, confidence: 0, source: "none" });
  });
});
