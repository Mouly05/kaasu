import { describe, expect, it } from "vitest";

import { computeDailyGuidance, type CategoryProgress, type DailyGuidanceInput } from "./guidance";
import type { SafeToSpendResult } from "./safe-to-spend";

const ON_TRACK: SafeToSpendResult = { rawPaise: 50_000, safeTodayPaise: 5_000, status: "on_track" };
const TIGHT: SafeToSpendResult = { rawPaise: 5_000, safeTodayPaise: 500, status: "tight" };
const OVER: SafeToSpendResult = { rawPaise: -1_000, safeTodayPaise: 0, status: "over" };

function baseInput(overrides: Partial<DailyGuidanceInput> = {}): DailyGuidanceInput {
  return {
    hasPlan: false,
    daysLeftInMonth: 12,
    safeToSpend: ON_TRACK,
    categories: [],
    thisWeekSpendPaise: 0,
    sameWeekLastMonthSpendPaise: 0,
    hasIncomeData: true,
    ...overrides,
  };
}

describe("computeDailyGuidance", () => {
  it("matches the brief's exact example wording for an 82%-of-plan category", () => {
    const category: CategoryProgress = {
      categoryId: "cat-food",
      categoryName: "food",
      plannedPaise: 500_000, // ₹5,000
      spentPaise: 410_000, // ₹4,100 → 82%
    };
    const nudges = computeDailyGuidance(
      baseInput({ hasPlan: true, categories: [category], daysLeftInMonth: 12, safeToSpend: TIGHT }),
    );
    expect(nudges[0]!.message).toBe(
      "food is at 82% of plan with 12 days left — about ₹75/day remains for food.",
    );
  });

  it("degrades to only the safe-to-spend nudge with no plan and no week data", () => {
    const nudges = computeDailyGuidance(baseInput());
    expect(nudges).toHaveLength(1);
    expect(nudges[0]!.id).toBe("safe-to-spend");
    expect(nudges[0]!.severity).toBe("info");
  });

  it("reflects a tight safe-to-spend status", () => {
    const nudges = computeDailyGuidance(baseInput({ safeToSpend: TIGHT }));
    expect(nudges[0]).toMatchObject({ id: "safe-to-spend", severity: "warning" });
    expect(nudges[0]!.message).toContain("₹5");
  });

  it("reflects an over safe-to-spend status", () => {
    const nudges = computeDailyGuidance(baseInput({ safeToSpend: OVER }));
    expect(nudges[0]).toMatchObject({ id: "safe-to-spend", severity: "critical" });
  });

  it("softens to an info nudge with no income data, even though the math computes 'over'", () => {
    const zeroData: SafeToSpendResult = { rawPaise: 0, safeTodayPaise: 0, status: "over" };
    const nudges = computeDailyGuidance(baseInput({ safeToSpend: zeroData, hasIncomeData: false }));
    expect(nudges[0]).toMatchObject({ id: "safe-to-spend", severity: "info" });
    expect(nudges[0]!.message).not.toMatch(/over|used up/i);
  });

  it("is inclusive at the 80% category boundary", () => {
    const category: CategoryProgress = {
      categoryId: "cat-x",
      categoryName: "X",
      plannedPaise: 1_000,
      spentPaise: 800, // exactly 80%
    };
    const nudges = computeDailyGuidance(baseInput({ hasPlan: true, categories: [category] }));
    expect(nudges.some((n) => n.id === "plan-cat-x" && n.severity === "warning")).toBe(true);
  });

  it("excludes a category just below the 80% boundary", () => {
    const category: CategoryProgress = {
      categoryId: "cat-x",
      categoryName: "X",
      plannedPaise: 1_000,
      spentPaise: 799, // 79.9%
    };
    const nudges = computeDailyGuidance(baseInput({ hasPlan: true, categories: [category] }));
    expect(nudges.some((n) => n.id === "plan-cat-x")).toBe(false);
  });

  it("is inclusive at the 100% category boundary (critical, not warning)", () => {
    const category: CategoryProgress = {
      categoryId: "cat-x",
      categoryName: "X",
      plannedPaise: 1_000,
      spentPaise: 1_000, // exactly 100%
    };
    const nudges = computeDailyGuidance(baseInput({ hasPlan: true, categories: [category] }));
    expect(nudges.find((n) => n.id === "plan-cat-x")).toMatchObject({ severity: "critical" });
  });

  it("orders multiple categories by percent used, and caps at 3 total nudges", () => {
    const categories: CategoryProgress[] = [
      { categoryId: "a", categoryName: "A", plannedPaise: 1_000, spentPaise: 850 }, // 85%
      { categoryId: "b", categoryName: "B", plannedPaise: 1_000, spentPaise: 1_200 }, // 120%, critical
      { categoryId: "c", categoryName: "C", plannedPaise: 1_000, spentPaise: 950 }, // 95%
      { categoryId: "d", categoryName: "D", plannedPaise: 1_000, spentPaise: 900 }, // 90%
    ];
    const nudges = computeDailyGuidance(baseInput({ hasPlan: true, categories }));
    expect(nudges).toHaveLength(3);
    // Critical category first, then the two next-highest warnings by percentUsed.
    expect(nudges[0]!.id).toBe("plan-b");
    expect(nudges[1]!.id).toBe("plan-c");
    expect(nudges[2]!.id).toBe("plan-d");
  });

  it("flags a week-over-week spend spike strictly above 1.2x", () => {
    const nudges = computeDailyGuidance(
      baseInput({ thisWeekSpendPaise: 1_201, sameWeekLastMonthSpendPaise: 1_000 }),
    );
    expect(nudges.some((n) => n.id === "week-pace" && n.severity === "warning")).toBe(true);
  });

  it("does not flag a spike at exactly 1.2x", () => {
    const nudges = computeDailyGuidance(
      baseInput({ thisWeekSpendPaise: 1_200, sameWeekLastMonthSpendPaise: 1_000 }),
    );
    expect(nudges.some((n) => n.id === "week-pace")).toBe(false);
  });

  it("flags an improvement below 0.8x", () => {
    const nudges = computeDailyGuidance(
      baseInput({ thisWeekSpendPaise: 799, sameWeekLastMonthSpendPaise: 1_000 }),
    );
    expect(nudges.some((n) => n.id === "week-pace" && n.severity === "info")).toBe(true);
  });

  it("skips the week-pace rule when there is no prior-month data", () => {
    const nudges = computeDailyGuidance(
      baseInput({ thisWeekSpendPaise: 5_000, sameWeekLastMonthSpendPaise: 0 }),
    );
    expect(nudges.some((n) => n.id === "week-pace")).toBe(false);
  });
});
