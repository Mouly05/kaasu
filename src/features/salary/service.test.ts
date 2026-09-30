import { describe, expect, it } from "vitest";

import { toPaise } from "@/lib/money";

import {
  compareToTarget,
  computeBudgetSplit,
  computeFixedCostRatio,
  computeRunwayMonths,
  generateTrendInsights,
  type MonthlyTrendPoint,
} from "./service";

describe("computeBudgetSplit", () => {
  it("splits actual spend by group as a percentage of income", () => {
    const split = computeBudgetSplit(
      {
        needsPaise: toPaise("25000"),
        wantsPaise: toPaise("10000"),
        savingsPaise: toPaise("7500"),
        debtPaise: toPaise("7840"),
      },
      toPaise("50000"),
    );
    expect(split.needsPercent).toBeCloseTo(50);
    expect(split.wantsPercent).toBeCloseTo(20);
    expect(split.savingsPercent).toBeCloseTo(15);
    expect(split.debtPercent).toBeCloseTo(15.68, 2);
  });

  it("computes the true savings rate as leftover after needs/wants/debt, not the savings-category spend", () => {
    const split = computeBudgetSplit(
      {
        needsPaise: toPaise("20000"),
        wantsPaise: toPaise("10000"),
        savingsPaise: 0, // nothing formally saved, but money is still left over
        debtPaise: 0,
      },
      toPaise("50000"),
    );
    expect(split.savingsPercent).toBe(0);
    expect(split.savingsRatePercent).toBeCloseTo(40);
  });

  it("goes negative when needs+wants+debt exceed income (deficit spending)", () => {
    const split = computeBudgetSplit(
      { needsPaise: toPaise("40000"), wantsPaise: toPaise("15000"), savingsPaise: 0, debtPaise: 0 },
      toPaise("50000"),
    );
    expect(split.savingsRatePercent).toBeCloseTo(-10);
  });

  it("is all-zero with no income rather than dividing by zero", () => {
    const split = computeBudgetSplit(
      { needsPaise: toPaise("100"), wantsPaise: 0, savingsPaise: 0, debtPaise: 0 },
      0,
    );
    expect(split).toEqual({
      needsPercent: 0,
      wantsPercent: 0,
      savingsPercent: 0,
      debtPercent: 0,
      savingsRatePercent: 0,
    });
  });
});

describe("compareToTarget", () => {
  it("is the actual split minus target, positive meaning over target", () => {
    const diff = compareToTarget(
      { needsPercent: 55, wantsPercent: 25, savingsPercent: 15, debtPercent: 5, savingsRatePercent: 20 },
      { needsTargetPct: 50, wantsTargetPct: 30, savingsTargetPct: 20, debtTargetPct: 0 },
    );
    expect(diff).toEqual({ needsDiffPct: 5, wantsDiffPct: -5, savingsDiffPct: -5, debtDiffPct: 5 });
  });
});

describe("computeFixedCostRatio", () => {
  it("is fixed spend as a percentage of income", () => {
    expect(computeFixedCostRatio(toPaise("26000"), toPaise("50000"))).toBeCloseTo(52);
  });
});

describe("computeRunwayMonths", () => {
  it("divides the emergency fund by essential monthly spend, to one decimal", () => {
    expect(computeRunwayMonths(toPaise("130000"), toPaise("26000"))).toBe(5);
    expect(computeRunwayMonths(toPaise("100000"), toPaise("30000"))).toBeCloseTo(3.3, 1);
  });

  it("is 0 with no essential spend to measure against", () => {
    expect(computeRunwayMonths(toPaise("100000"), 0)).toBe(0);
  });
});

describe("generateTrendInsights", () => {
  it("is empty with fewer than 2 months of history", () => {
    expect(generateTrendInsights([])).toEqual([]);
    expect(generateTrendInsights([{ monthKey: "2026-10", savingsRatePercent: 10, fixedCostRatioPercent: 40 }])).toEqual(
      [],
    );
  });

  it("flags an improved savings rate vs last month", () => {
    const history: MonthlyTrendPoint[] = [
      { monthKey: "2026-09", savingsRatePercent: 10, fixedCostRatioPercent: 40 },
      { monthKey: "2026-10", savingsRatePercent: 18, fixedCostRatioPercent: 40 },
    ];
    const insights = generateTrendInsights(history);
    expect(insights.some((i) => i.includes("improved"))).toBe(true);
  });

  it("flags a dropped savings rate vs last month", () => {
    const history: MonthlyTrendPoint[] = [
      { monthKey: "2026-09", savingsRatePercent: 18, fixedCostRatioPercent: 40 },
      { monthKey: "2026-10", savingsRatePercent: 10, fixedCostRatioPercent: 40 },
    ];
    const insights = generateTrendInsights(history);
    expect(insights.some((i) => i.includes("dropped"))).toBe(true);
  });

  it("says nothing about the savings rate when the change is within the noise threshold", () => {
    const history: MonthlyTrendPoint[] = [
      { monthKey: "2026-09", savingsRatePercent: 20, fixedCostRatioPercent: 40 },
      { monthKey: "2026-10", savingsRatePercent: 21, fixedCostRatioPercent: 40 },
    ];
    expect(generateTrendInsights(history)).toEqual([]);
  });

  it("warns when fixed costs are above the 50% guideline", () => {
    const history: MonthlyTrendPoint[] = [
      { monthKey: "2026-09", savingsRatePercent: 20, fixedCostRatioPercent: 55 },
      { monthKey: "2026-10", savingsRatePercent: 20, fixedCostRatioPercent: 55 },
    ];
    const insights = generateTrendInsights(history);
    expect(insights.some((i) => i.includes("Fixed costs"))).toBe(true);
  });

  it("compares this month against the recent average once there are 3+ months", () => {
    const history: MonthlyTrendPoint[] = [
      { monthKey: "2026-08", savingsRatePercent: 10, fixedCostRatioPercent: 40 },
      { monthKey: "2026-09", savingsRatePercent: 10, fixedCostRatioPercent: 40 },
      { monthKey: "2026-10", savingsRatePercent: 25, fixedCostRatioPercent: 40 },
    ];
    const insights = generateTrendInsights(history);
    expect(insights.some((i) => i.includes("above your recent average"))).toBe(true);
  });
});
