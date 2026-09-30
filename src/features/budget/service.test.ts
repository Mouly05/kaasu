import { describe, expect, it } from "vitest";

import { toPaise } from "@/lib/money";

import {
  bucketForCategoryGroup,
  bucketForGoalKind,
  bucketForRecurringKind,
  buildDraftLines,
  computeBucketTotals,
  computeBudgetVsActual,
  computeCategoryAverage,
  computePlanSummary,
  computeRolloverCandidates,
  computeSuggestedDebtRepayment,
  computeSuggestedGoalContribution,
  computeTotalRollover,
  computeWhatIfFunding,
  copyPlanLines,
  deferLineToNextMonth,
  swapLinePriority,
  type PlanLine,
} from "./service";

function line(overrides: Partial<PlanLine> = {}): PlanLine {
  return {
    categoryId: null,
    label: "Line",
    plannedPaise: toPaise("1000"),
    priority: 3,
    bucket: "must",
    status: "planned",
    ...overrides,
  };
}

describe("bucketForRecurringKind", () => {
  it("buckets obligations, savings, subscriptions and EMIs distinctly", () => {
    expect(bucketForRecurringKind("rent")).toBe("must");
    expect(bucketForRecurringKind("support")).toBe("must");
    expect(bucketForRecurringKind("fixed")).toBe("must");
    expect(bucketForRecurringKind("sip")).toBe("save");
    expect(bucketForRecurringKind("subscription")).toBe("want");
    expect(bucketForRecurringKind("emi")).toBe("emi");
  });
});

describe("bucketForGoalKind", () => {
  it("treats a purchase wishlist as discretionary, everything else as saving", () => {
    expect(bucketForGoalKind("purchase")).toBe("want");
    expect(bucketForGoalKind("emergency_fund")).toBe("save");
    expect(bucketForGoalKind("investment")).toBe("save");
    expect(bucketForGoalKind("custom")).toBe("save");
  });
});

describe("bucketForCategoryGroup", () => {
  it("mirrors the needs/wants/savings/debt groups onto plan buckets", () => {
    expect(bucketForCategoryGroup("needs")).toBe("must");
    expect(bucketForCategoryGroup("wants")).toBe("want");
    expect(bucketForCategoryGroup("savings")).toBe("save");
    expect(bucketForCategoryGroup("debt")).toBe("debt");
  });
});

describe("computeSuggestedDebtRepayment", () => {
  it("repeats the most recent repayment, clamped to what's outstanding", () => {
    const outstanding = toPaise("5000");
    const repayments = [{ amountPaise: toPaise("1000") }, { amountPaise: toPaise("2500") }];
    expect(computeSuggestedDebtRepayment(outstanding, repayments)).toBe(toPaise("2500"));
  });

  it("clamps a last-repayment larger than what remains", () => {
    const outstanding = toPaise("500");
    expect(computeSuggestedDebtRepayment(outstanding, [{ amountPaise: toPaise("2500") }])).toBe(
      toPaise("500"),
    );
  });

  it("suggests the full outstanding balance with no repayment history", () => {
    expect(computeSuggestedDebtRepayment(toPaise("7840"), [])).toBe(toPaise("7840"));
  });

  it("suggests nothing once the debt is fully repaid", () => {
    expect(computeSuggestedDebtRepayment(0, [{ amountPaise: toPaise("500") }])).toBe(0);
  });
});

describe("computeSuggestedGoalContribution", () => {
  it("paces evenly to a target date", () => {
    const now = new Date("2026-10-01T00:00:00Z");
    const targetDate = new Date("2027-01-01T00:00:00Z"); // 3 calendar months out
    const result = computeSuggestedGoalContribution({
      targetPaise: toPaise("30000"),
      savedPaise: toPaise("0"),
      targetDate,
      now,
      avgPastContributionPaise: 0,
    });
    expect(result).toBe(toPaise("10000"));
  });

  it("floors the pace at 1 month when the target date is this month or overdue", () => {
    const now = new Date("2026-10-15T00:00:00Z");
    const targetDate = new Date("2026-10-20T00:00:00Z");
    const result = computeSuggestedGoalContribution({
      targetPaise: toPaise("5000"),
      savedPaise: toPaise("0"),
      targetDate,
      now,
      avgPastContributionPaise: 0,
    });
    expect(result).toBe(toPaise("5000"));
  });

  it("falls back to the recent contribution average with no target date", () => {
    const result = computeSuggestedGoalContribution({
      targetPaise: toPaise("100000"),
      savedPaise: toPaise("10000"),
      targetDate: null,
      avgPastContributionPaise: toPaise("2000"),
    });
    expect(result).toBe(toPaise("2000"));
  });

  it("never suggests more than remains, even if the average overshoots", () => {
    const result = computeSuggestedGoalContribution({
      targetPaise: toPaise("2000"),
      savedPaise: toPaise("1500"),
      targetDate: null,
      avgPastContributionPaise: toPaise("2000"),
    });
    expect(result).toBe(toPaise("500"));
  });

  it("suggests nothing once the goal is fully funded", () => {
    const result = computeSuggestedGoalContribution({
      targetPaise: toPaise("1000"),
      savedPaise: toPaise("1000"),
      targetDate: null,
      avgPastContributionPaise: toPaise("500"),
    });
    expect(result).toBe(0);
  });
});

describe("computeCategoryAverage", () => {
  it("averages past monthly totals, rounded to the nearest paisa", () => {
    expect(computeCategoryAverage([toPaise("100"), toPaise("100"), toPaise("103")])).toBe(
      toPaise("101"),
    );
  });

  it("is 0 with no history", () => {
    expect(computeCategoryAverage([])).toBe(0);
  });
});

describe("buildDraftLines", () => {
  it("composes recurring, debt, goal and category-average lines, dropping zero suggestions", () => {
    const now = new Date("2026-10-01T00:00:00Z");
    const lines = buildDraftLines({
      now,
      recurringItems: [
        { id: "r1", title: "Rent", amountPaise: toPaise("7000"), categoryId: "cat-rent", kind: "rent" },
        { id: "r2", title: "SIP", amountPaise: toPaise("3500"), categoryId: "cat-sip", kind: "sip" },
        {
          id: "r3",
          title: "Netflix",
          amountPaise: toPaise("199"),
          categoryId: "cat-subs",
          kind: "subscription",
        },
      ],
      debts: [
        {
          id: "d1",
          counterparty: "Slice",
          outstandingPaise: toPaise("20000"),
          repayments: [{ amountPaise: toPaise("2600") }],
        },
      ],
      goals: [
        {
          id: "g1",
          title: "Emergency fund",
          kind: "emergency_fund",
          targetPaise: toPaise("50000"),
          savedPaise: toPaise("50000"),
          targetDate: null,
          avgPastContributionPaise: toPaise("2000"),
          linkedCategoryId: null,
        },
      ],
      categoryAverages: [
        { categoryId: "cat-food", categoryName: "Food & Groceries", group: "needs", avgPaise: toPaise("5000") },
        { categoryId: "cat-emi", categoryName: "EMI", group: "debt", avgPaise: toPaise("4000") },
      ],
    });

    expect(lines).toHaveLength(5); // achieved goal (0 remaining) and the debt-group average are both dropped
    expect(lines.find((l) => l.recurringId === "r1")).toMatchObject({ bucket: "must", plannedPaise: toPaise("7000") });
    expect(lines.find((l) => l.recurringId === "r2")).toMatchObject({ bucket: "save" });
    expect(lines.find((l) => l.recurringId === "r3")).toMatchObject({ bucket: "want" });
    expect(lines.find((l) => l.debtId === "d1")).toMatchObject({ bucket: "debt", plannedPaise: toPaise("2600") });
    expect(lines.find((l) => l.categoryId === "cat-food")).toMatchObject({ bucket: "must", plannedPaise: toPaise("5000") });
    expect(lines.some((l) => l.goalId === "g1")).toBe(false);
    expect(lines.some((l) => l.categoryId === "cat-emi")).toBe(false);
  });
});

describe("computeBucketTotals / computePlanSummary — over-allocation", () => {
  it("sums planned amounts per bucket, excluding deferred lines", () => {
    const lines = [
      line({ bucket: "must", plannedPaise: toPaise("7000") }),
      line({ bucket: "must", plannedPaise: toPaise("5000") }),
      line({ bucket: "want", plannedPaise: toPaise("3000"), status: "deferred", deferredTo: "2026-11" }),
    ];
    const totals = computeBucketTotals(lines);
    expect(totals.must).toBe(toPaise("12000"));
    expect(totals.want).toBe(0);
  });

  it("is balanced when planned lines exactly exhaust income", () => {
    const lines = [line({ bucket: "must", plannedPaise: toPaise("50000") })];
    const summary = computePlanSummary(lines, toPaise("50000"));
    expect(summary.unallocatedPaise).toBe(0);
    expect(summary.status).toBe("balanced");
  });

  it("flags over-allocation when planned lines exceed income", () => {
    const lines = [
      line({ bucket: "must", plannedPaise: toPaise("30000") }),
      line({ bucket: "debt", plannedPaise: toPaise("25000") }),
    ];
    const summary = computePlanSummary(lines, toPaise("50000"));
    expect(summary.totalPlannedPaise).toBe(toPaise("55000"));
    expect(summary.unallocatedPaise).toBe(toPaise("-5000"));
    expect(summary.status).toBe("over");
  });

  it("is under-allocated with room left, e.g. the real October plan against the minimum salary", () => {
    const lines = [
      line({ bucket: "must", plannedPaise: toPaise("7000") }), // rent
      line({ bucket: "must", plannedPaise: toPaise("6000") }), // medical
      line({ bucket: "must", plannedPaise: toPaise("5000") }), // food
      line({ bucket: "must", plannedPaise: toPaise("5000") }), // mom
      line({ bucket: "must", plannedPaise: toPaise("3000") }), // glass
      line({ bucket: "want", plannedPaise: toPaise("2000") }), // small expenses
      line({ bucket: "want", plannedPaise: toPaise("1000") }), // travel
      line({ bucket: "want", plannedPaise: toPaise("1000") }), // entertainment
      line({ bucket: "want", plannedPaise: toPaise("519") }), // subscriptions
      line({ bucket: "save", plannedPaise: toPaise("3500") }), // SIP
      line({ bucket: "save", plannedPaise: toPaise("2000") }), // emergency fund
      line({ bucket: "save", plannedPaise: toPaise("2000") }), // gold
      line({ bucket: "debt", plannedPaise: toPaise("7840") }), // debts paid this month
      line({ bucket: "emi", plannedPaise: toPaise("4000") }), // EMI + down payment
    ];
    const summary = computePlanSummary(lines, toPaise("50000"));
    expect(summary.totalPlannedPaise).toBe(toPaise("49859"));
    expect(summary.unallocatedPaise).toBe(toPaise("141"));
    expect(summary.status).toBe("under");
  });
});

describe("swapLinePriority", () => {
  it("swaps two lines' priorities", () => {
    const lines = [line({ label: "A", priority: 1 }), line({ label: "B", priority: 2 })];
    const next = swapLinePriority(lines, 0, 1);
    expect(next[0]).toMatchObject({ label: "A", priority: 2 });
    expect(next[1]).toMatchObject({ label: "B", priority: 1 });
  });

  it("is a no-op for an out-of-range or identical index", () => {
    const lines = [line({ priority: 1 }), line({ priority: 2 })];
    expect(swapLinePriority(lines, 0, 0)).toBe(lines);
    expect(swapLinePriority(lines, 0, 5)).toBe(lines);
  });
});

describe("deferLineToNextMonth — deferral chains", () => {
  it("marks the current line deferred and hands back a fresh next-month line with a trail", () => {
    const original = line({ label: "Air fryer", bucket: "want", plannedPaise: toPaise("3000") });
    const { updatedCurrentLine, newNextMonthLine } = deferLineToNextMonth(
      original,
      "2026-10",
      "2026-11",
    );
    expect(updatedCurrentLine).toMatchObject({ status: "deferred", deferredTo: "2026-11" });
    expect(newNextMonthLine).toMatchObject({
      status: "planned",
      deferredFrom: "2026-10",
      label: "Air fryer",
      plannedPaise: toPaise("3000"),
    });
    expect(newNextMonthLine.deferredTo).toBeUndefined();
  });

  it("carries only the immediate hop when deferred a second time, not the full chain", () => {
    const original = line({ label: "Air fryer", bucket: "want" });
    const { newNextMonthLine: novemberLine } = deferLineToNextMonth(original, "2026-10", "2026-11");
    const { updatedCurrentLine: novemberUpdated, newNextMonthLine: decemberLine } = deferLineToNextMonth(
      novemberLine,
      "2026-11",
      "2026-12",
    );
    expect(novemberUpdated).toMatchObject({ status: "deferred", deferredTo: "2026-12", deferredFrom: "2026-10" });
    expect(decemberLine).toMatchObject({ status: "planned", deferredFrom: "2026-11" });
    expect(decemberLine.deferredTo).toBeUndefined();
  });
});

describe("computeWhatIfFunding — funding order", () => {
  it("funds candidates fully in priority order until the extra runs out", () => {
    const extra = toPaise("4000"); // salary max (54,000) − min (50,000)
    const candidates = [
      { id: "air-fryer", plannedPaise: toPaise("3000"), priority: 2 },
      { id: "extra-gold", plannedPaise: toPaise("3000"), priority: 1 },
    ];
    const result = computeWhatIfFunding(candidates, extra);
    expect(result).toEqual([
      { id: "air-fryer", fundedPaise: toPaise("1000"), fullyFunded: false },
      { id: "extra-gold", fundedPaise: toPaise("3000"), fullyFunded: true },
    ]);
  });

  it("fully funds every candidate when the extra comfortably covers them all", () => {
    const candidates = [
      { id: "a", plannedPaise: toPaise("500"), priority: 3 },
      { id: "b", plannedPaise: toPaise("500"), priority: 1 },
    ];
    const result = computeWhatIfFunding(candidates, toPaise("2000"));
    expect(result.every((r) => r.fullyFunded)).toBe(true);
    expect(result.map((r) => r.fundedPaise)).toEqual([toPaise("500"), toPaise("500")]);
  });

  it("funds nothing when there's no extra", () => {
    const candidates = [{ id: "a", plannedPaise: toPaise("500"), priority: 1 }];
    const result = computeWhatIfFunding(candidates, 0);
    expect(result).toEqual([{ id: "a", fundedPaise: 0, fullyFunded: false }]);
  });

  it("breaks priority ties by original order", () => {
    const candidates = [
      { id: "first", plannedPaise: toPaise("100"), priority: 2 },
      { id: "second", plannedPaise: toPaise("100"), priority: 2 },
    ];
    const result = computeWhatIfFunding(candidates, toPaise("100"));
    expect(result.find((r) => r.id === "first")!.fullyFunded).toBe(true);
    expect(result.find((r) => r.id === "second")!.fundedPaise).toBe(0);
  });
});

describe("computeRolloverCandidates / computeTotalRollover", () => {
  it("offers only the lines that came in under budget, never a deferred one", () => {
    const rows = [
      { label: "Travel", plannedPaise: toPaise("1000"), actualPaise: toPaise("400"), status: "planned" as const },
      { label: "Food", plannedPaise: toPaise("5000"), actualPaise: toPaise("5200"), status: "paid" as const },
      { label: "Air fryer", plannedPaise: toPaise("3000"), actualPaise: 0, status: "deferred" as const },
    ];
    const candidates = computeRolloverCandidates(rows);
    expect(candidates).toEqual([{ label: "Travel", unspentPaise: toPaise("600") }]);
    expect(computeTotalRollover(candidates)).toBe(toPaise("600"));
  });
});

describe("copyPlanLines", () => {
  it("drops deferred lines and resets everything else to planned with no defer trail", () => {
    const previous = [
      line({ label: "Rent", status: "paid" }),
      line({ label: "Air fryer", status: "deferred", deferredTo: "2026-11" }),
      line({ label: "SIP", status: "planned", deferredFrom: "2026-09" }),
    ];
    const copied = copyPlanLines(previous);
    expect(copied.map((l) => l.label)).toEqual(["Rent", "SIP"]);
    expect(copied.every((l) => l.status === "planned")).toBe(true);
    expect(copied.every((l) => l.deferredFrom === undefined && l.deferredTo === undefined)).toBe(true);
  });
});

describe("computeBudgetVsActual", () => {
  it("classifies under, tight and over spend", () => {
    const rows = computeBudgetVsActual([
      { label: "Under", bucket: "want", plannedPaise: toPaise("1000"), actualPaise: toPaise("500") },
      { label: "Tight", bucket: "want", plannedPaise: toPaise("1000"), actualPaise: toPaise("850") },
      { label: "Over", bucket: "want", plannedPaise: toPaise("1000"), actualPaise: toPaise("1200") },
    ]);
    expect(rows.map((r) => r.status)).toEqual(["under", "tight", "over"]);
  });

  it("treats any spend against a zero-planned line as over", () => {
    const rows = computeBudgetVsActual([
      { label: "Unplanned", bucket: "want", plannedPaise: 0, actualPaise: toPaise("100") },
    ]);
    expect(rows[0]!.status).toBe("over");
  });
});
