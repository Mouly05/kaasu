import { describe, expect, it } from "vitest";

import { toPaise } from "@/lib/money";

import { calculateEmi } from "./emi";
import {
  buildEmiInstallments,
  computeEmiLoadPercent,
  computeMonthlyTotal,
  computeNextDueDate,
  computeYearlySubscriptionCost,
  isPaidForMonth,
  type RecurringLike,
} from "./service";

const utc = (iso: string) => new Date(iso);
const NOW_OCT_05 = utc("2026-10-05T10:00:00Z"); // 5 Oct 2026, IST afternoon

describe("computeNextDueDate", () => {
  const monthly = (dayOfMonth: number | null, endDate: Date | null = null): RecurringLike => ({
    frequency: "monthly",
    dayOfMonth,
    startDate: utc("2026-01-01T00:00:00Z"),
    endDate,
  });

  it("returns this month's occurrence when it hasn't passed yet", () => {
    expect(computeNextDueDate(monthly(15), NOW_OCT_05)!.toISOString()).toBe("2026-10-14T18:30:00.000Z");
  });

  it("rolls to next month once this month's day has passed", () => {
    expect(computeNextDueDate(monthly(1), NOW_OCT_05)!.toISOString()).toBe("2026-10-31T18:30:00.000Z");
  });

  it("returns null for monthly with no dayOfMonth set", () => {
    expect(computeNextDueDate(monthly(null), NOW_OCT_05)).toBeNull();
  });

  it("returns null once endDate has passed, regardless of frequency", () => {
    expect(computeNextDueDate(monthly(15, utc("2026-09-01T00:00:00Z")), NOW_OCT_05)).toBeNull();
  });

  it("delegates yearly to the anniversary of startDate", () => {
    const recurring: RecurringLike = {
      frequency: "yearly",
      dayOfMonth: null,
      startDate: utc("2020-10-14T18:30:00.000Z"), // 15 Oct 2020
      endDate: null,
    };
    expect(computeNextDueDate(recurring, NOW_OCT_05)!.toISOString()).toBe("2026-10-14T18:30:00.000Z");
  });

  it("delegates weekly to a 7-day cycle from startDate", () => {
    const recurring: RecurringLike = {
      frequency: "weekly",
      dayOfMonth: null,
      startDate: utc("2026-09-30T18:30:00.000Z"), // 1 Oct 2026
      endDate: null,
    };
    expect(computeNextDueDate(recurring, utc("2026-10-04T10:00:00Z"))!.toISOString()).toBe(
      "2026-10-07T18:30:00.000Z", // 8 Oct 2026
    );
  });

  it("always returns null for custom frequency", () => {
    const recurring: RecurringLike = {
      frequency: "custom",
      dayOfMonth: 15,
      startDate: utc("2026-01-01T00:00:00Z"),
      endDate: null,
    };
    expect(computeNextDueDate(recurring, NOW_OCT_05)).toBeNull();
  });
});

describe("isPaidForMonth", () => {
  it("is false when nothing has been paid", () => {
    expect(isPaidForMonth(null, "2026-10")).toBe(false);
  });

  it("is true when the last payment falls in the target month", () => {
    expect(isPaidForMonth(utc("2026-10-05T10:00:00Z"), "2026-10")).toBe(true);
  });

  it("is false when the last payment was a different month", () => {
    expect(isPaidForMonth(utc("2026-09-05T10:00:00Z"), "2026-10")).toBe(false);
  });
});

describe("computeMonthlyTotal", () => {
  it("sums amountPaise across items", () => {
    expect(computeMonthlyTotal([{ amountPaise: toPaise("7000") }, { amountPaise: toPaise("5000") }])).toBe(
      toPaise("12000"),
    );
  });

  it("returns 0 for an empty list", () => {
    expect(computeMonthlyTotal([])).toBe(0);
  });
});

describe("computeYearlySubscriptionCost", () => {
  it("only counts kind:subscription items, ×12 for the yearly figure", () => {
    // The user's real subscriptions: ₹200 + ₹130 + ₹189 = ₹519/mo.
    const result = computeYearlySubscriptionCost([
      { kind: "subscription", amountPaise: toPaise("200") },
      { kind: "subscription", amountPaise: toPaise("130") },
      { kind: "subscription", amountPaise: toPaise("189") },
      { kind: "rent", amountPaise: toPaise("7000") }, // excluded
    ]);
    expect(result.monthlyPaise).toBe(toPaise("519"));
    expect(result.yearlyPaise).toBe(toPaise("6228"));
  });

  it("returns 0/0 when there are no subscriptions", () => {
    expect(computeYearlySubscriptionCost([{ kind: "rent", amountPaise: toPaise("7000") }])).toEqual({
      monthlyPaise: 0,
      yearlyPaise: 0,
    });
  });
});

describe("computeEmiLoadPercent", () => {
  it("reports 'unknown' when no expected income is set", () => {
    expect(computeEmiLoadPercent(toPaise("5000"), null)).toEqual({ percent: 0, level: "unknown" });
    expect(computeEmiLoadPercent(toPaise("5000"), 0)).toEqual({ percent: 0, level: "unknown" });
  });

  it("is 'ok' below the warning threshold", () => {
    const result = computeEmiLoadPercent(toPaise("5000"), toPaise("100000"));
    expect(result.percent).toBeCloseTo(5, 6);
    expect(result.level).toBe("ok");
  });

  it("is 'warning' between the soft and hard thresholds", () => {
    const result = computeEmiLoadPercent(toPaise("15000"), toPaise("100000"));
    expect(result.percent).toBeCloseTo(15, 6);
    expect(result.level).toBe("warning");
  });

  it("is 'hard' at or above 20%, regardless of the soft threshold", () => {
    const result = computeEmiLoadPercent(toPaise("25000"), toPaise("100000"));
    expect(result.percent).toBeCloseTo(25, 6);
    expect(result.level).toBe("hard");
  });

  it("respects a custom warning threshold", () => {
    expect(computeEmiLoadPercent(toPaise("6000"), toPaise("100000"), 5).level).toBe("warning");
    expect(computeEmiLoadPercent(toPaise("6000"), toPaise("100000"), 10).level).toBe("ok");
  });
});

describe("buildEmiInstallments", () => {
  it("stamps calendar due dates from the pure schedule", () => {
    const calc = calculateEmi({
      pricePaise: toPaise("3000"),
      downPaymentPaise: 0,
      tenureMonths: 3,
      interestRatePct: 0,
      processingFeePaise: 0,
    });
    const startDate = utc("2026-09-30T18:30:00.000Z"); // 1 Oct 2026, 00:00 IST
    const installments = buildEmiInstallments(calc, startDate, 1);

    expect(installments).toHaveLength(3);
    expect(installments.map((i) => i.amountPaise)).toEqual([toPaise("1000"), toPaise("1000"), toPaise("1000")]);
    expect(installments.map((i) => i.dueDate.toISOString())).toEqual([
      "2026-09-30T18:30:00.000Z", // 1 Oct 2026
      "2026-10-31T18:30:00.000Z", // 1 Nov 2026
      "2026-11-30T18:30:00.000Z", // 1 Dec 2026
    ]);
  });
});
