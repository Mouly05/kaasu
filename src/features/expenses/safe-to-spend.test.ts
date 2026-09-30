import { describe, expect, it } from "vitest";

import { computeSafeToSpendNoPlan, computeSafeToSpendWithPlan } from "./safe-to-spend";

describe("computeSafeToSpendNoPlan", () => {
  it("is on_track when the daily allowance is a healthy share of income", () => {
    const result = computeSafeToSpendNoPlan({
      expectedIncomePaise: 100_00_00, // ₹1,00,000
      fixedRecurringDuePaise: 20_00_00,
      variableSpendSoFarPaise: 10_00_00,
      daysLeftInMonth: 10,
    });
    expect(result.rawPaise).toBe(70_00_00);
    expect(result.safeTodayPaise).toBe(7_00_00);
    expect(result.status).toBe("on_track");
  });

  it("is tight when the daily allowance drops below 20% of income", () => {
    const result = computeSafeToSpendNoPlan({
      expectedIncomePaise: 100_000,
      fixedRecurringDuePaise: 70_000,
      variableSpendSoFarPaise: 15_000,
      daysLeftInMonth: 10,
    });
    // raw = 15,000; ratio = 0.15 < 0.2
    expect(result.rawPaise).toBe(15_000);
    expect(result.status).toBe("tight");
  });

  it("is over when spend has already exceeded income minus obligations", () => {
    const result = computeSafeToSpendNoPlan({
      expectedIncomePaise: 50_000,
      fixedRecurringDuePaise: 20_000,
      variableSpendSoFarPaise: 40_000,
      daysLeftInMonth: 5,
    });
    expect(result.rawPaise).toBe(-10_000);
    expect(result.safeTodayPaise).toBe(0);
    expect(result.status).toBe("over");
  });

  it("treats the all-zero-input boundary as over, not a crash", () => {
    const result = computeSafeToSpendNoPlan({
      expectedIncomePaise: 0,
      fixedRecurringDuePaise: 0,
      variableSpendSoFarPaise: 0,
      daysLeftInMonth: 5,
    });
    expect(result.rawPaise).toBe(0);
    expect(result.safeTodayPaise).toBe(0);
    expect(result.status).toBe("over");
  });

  it("floors the per-day amount to the paisa rather than rounding", () => {
    const result = computeSafeToSpendNoPlan({
      expectedIncomePaise: 100,
      fixedRecurringDuePaise: 0,
      variableSpendSoFarPaise: 0,
      daysLeftInMonth: 3,
    });
    expect(result.rawPaise).toBe(100);
    expect(result.safeTodayPaise).toBe(33); // not 33.33
  });

  it("is on_track exactly at the 0.2 ratio boundary (inclusive)", () => {
    const result = computeSafeToSpendNoPlan({
      expectedIncomePaise: 100_000,
      fixedRecurringDuePaise: 0,
      variableSpendSoFarPaise: 80_000, // raw = 20,000, ratio = 0.2 exactly
      daysLeftInMonth: 10,
    });
    expect(result.status).toBe("on_track");
  });

  it("is tight just below the 0.2 ratio boundary", () => {
    const result = computeSafeToSpendNoPlan({
      expectedIncomePaise: 100_000,
      fixedRecurringDuePaise: 0,
      variableSpendSoFarPaise: 80_001, // ratio just under 0.2
      daysLeftInMonth: 10,
    });
    expect(result.status).toBe("tight");
  });

  it("gives the full raw amount as the daily allowance when only 1 day is left", () => {
    const result = computeSafeToSpendNoPlan({
      expectedIncomePaise: 10_000,
      fixedRecurringDuePaise: 0,
      variableSpendSoFarPaise: 0,
      daysLeftInMonth: 1,
    });
    expect(result.safeTodayPaise).toBe(10_000);
  });

  it("is over by exactly ₹0.01 at the raw = -1 boundary", () => {
    const result = computeSafeToSpendNoPlan({
      expectedIncomePaise: 1_000,
      fixedRecurringDuePaise: 0,
      variableSpendSoFarPaise: 1_001,
      daysLeftInMonth: 5,
    });
    expect(result.rawPaise).toBe(-1);
    expect(result.status).toBe("over");
  });

  it.each([0, -1])("throws when daysLeftInMonth is %d", (daysLeftInMonth) => {
    expect(() =>
      computeSafeToSpendNoPlan({
        expectedIncomePaise: 1_000,
        fixedRecurringDuePaise: 0,
        variableSpendSoFarPaise: 0,
        daysLeftInMonth,
      }),
    ).toThrow(RangeError);
  });
});

describe("computeSafeToSpendWithPlan", () => {
  it("is on_track with healthy discretionary budget remaining", () => {
    const result = computeSafeToSpendWithPlan({
      variableBudgetPlannedPaise: 50_000,
      variableSpendSoFarPaise: 10_000,
      upcomingMustDebtEmiPaise: 5_000,
      daysLeftInMonth: 10,
    });
    expect(result.rawPaise).toBe(35_000);
    expect(result.safeTodayPaise).toBe(3_500);
    expect(result.status).toBe("on_track");
  });

  it("is tight when little discretionary budget remains", () => {
    const result = computeSafeToSpendWithPlan({
      variableBudgetPlannedPaise: 50_000,
      variableSpendSoFarPaise: 40_000,
      upcomingMustDebtEmiPaise: 3_000,
      daysLeftInMonth: 10,
    });
    // raw = 7,000; ratio = 0.14 < 0.2
    expect(result.rawPaise).toBe(7_000);
    expect(result.status).toBe("tight");
  });

  it("is over once upcoming must/debt/emi obligations exceed what's left", () => {
    const result = computeSafeToSpendWithPlan({
      variableBudgetPlannedPaise: 50_000,
      variableSpendSoFarPaise: 30_000,
      upcomingMustDebtEmiPaise: 25_000,
      daysLeftInMonth: 10,
    });
    expect(result.rawPaise).toBe(-5_000);
    expect(result.status).toBe("over");
  });

  it("clamps an overspent discretionary budget to 0 before subtracting obligations", () => {
    const result = computeSafeToSpendWithPlan({
      variableBudgetPlannedPaise: 1_000,
      variableSpendSoFarPaise: 5_000, // already overspent by 4,000
      upcomingMustDebtEmiPaise: 200,
      daysLeftInMonth: 5,
    });
    // Without the clamp this would be 1,000 - 5,000 - 200 = -4,200.
    expect(result.rawPaise).toBe(-200);
    expect(result.status).toBe("over");
  });

  it("treats a zero-basis-but-positive-raw edge case as on_track, not a divide-by-zero", () => {
    // Not expected with real data (an empty plan has no discretionary budget to
    // be "left over" from), but the calculator must not crash on it.
    const result = computeSafeToSpendWithPlan({
      variableBudgetPlannedPaise: 0,
      variableSpendSoFarPaise: -100,
      upcomingMustDebtEmiPaise: 0,
      daysLeftInMonth: 5,
    });
    expect(result.rawPaise).toBe(100);
    expect(result.status).toBe("on_track");
  });

  it("throws when daysLeftInMonth is less than 1", () => {
    expect(() =>
      computeSafeToSpendWithPlan({
        variableBudgetPlannedPaise: 1_000,
        variableSpendSoFarPaise: 0,
        upcomingMustDebtEmiPaise: 0,
        daysLeftInMonth: 0,
      }),
    ).toThrow(RangeError);
  });
});
