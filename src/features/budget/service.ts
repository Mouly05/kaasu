/**
 * Pure business logic for the monthly budget planner: auto-draft bucketing,
 * allocation totals, priority reorder, defer-to-next-month, what-if funding
 * order, rollover, copy-last-month, and budget-vs-actual. No I/O — DB reads
 * live in queries.ts, which calls into here for anything derived.
 */
import { differenceInCalendarMonths } from "date-fns";

import type { CategoryGroup } from "@/lib/db/models/category";
import type { MonthlyPlanLineBucket, MonthlyPlanLineStatus } from "@/lib/db/models/monthly-plan";
import type { GoalKind } from "@/lib/db/models/goal";
import type { RecurringKind } from "@/lib/db/models/recurring";
import { addPaise, type Paise, ratioPercent, roundToPaise, subPaise } from "@/lib/money";
import type { MonthKey } from "@/lib/dates";

export interface PlanLine {
  categoryId: string | null;
  label: string;
  plannedPaise: Paise;
  priority: number;
  bucket: MonthlyPlanLineBucket;
  status: MonthlyPlanLineStatus;
  /** A "YYYY-MM" month key. Plain `string` (not the branded `MonthKey`) since this round-trips through the DB as free text. */
  deferredTo?: string;
  deferredFrom?: string;
  recurringId?: string;
  debtId?: string;
  goalId?: string;
}

const DEFAULT_PRIORITY = 3;

/** Recurring items bucket by kind: rent/support/fixed are obligations, sip is savings, emi its own bucket. */
export function bucketForRecurringKind(kind: RecurringKind): MonthlyPlanLineBucket {
  switch (kind) {
    case "rent":
    case "support":
    case "fixed":
      return "must";
    case "subscription":
      return "want";
    case "sip":
      return "save";
    case "emi":
      return "emi";
  }
}

/** A wishlist purchase is discretionary (want); every other goal kind is a form of saving. */
export function bucketForGoalKind(kind: GoalKind): MonthlyPlanLineBucket {
  return kind === "purchase" ? "want" : "save";
}

/** Variable-spend category averages bucket by the category's own needs/wants/savings/debt group. */
export function bucketForCategoryGroup(group: CategoryGroup): MonthlyPlanLineBucket {
  switch (group) {
    case "needs":
      return "must";
    case "wants":
      return "want";
    case "savings":
      return "save";
    case "debt":
      return "debt";
  }
}

/**
 * Suggested repayment for an open debt: repeat the most recent repayment
 * amount (a steady informal instalment), or the full outstanding balance for
 * a debt with no repayment history yet. Never suggests more than is owed.
 */
export function computeSuggestedDebtRepayment(
  outstandingPaise: Paise,
  repayments: { amountPaise: Paise }[],
): Paise {
  if (outstandingPaise <= 0) return 0;
  const lastRepayment = repayments.at(-1)?.amountPaise ?? outstandingPaise;
  return Math.min(lastRepayment, outstandingPaise);
}

export interface SuggestedGoalContributionInput {
  targetPaise: Paise;
  savedPaise: Paise;
  targetDate: Date | null;
  now?: Date;
  /** Average of the goal's own past few months' contributions, for a goal with no target date. */
  avgPastContributionPaise: Paise;
}

/**
 * Suggested monthly contribution for a goal: an even pace to `targetDate`
 * when one is set, otherwise the goal's own recent contribution average
 * (0 for a brand-new open-ended goal). Never suggests more than remains.
 */
export function computeSuggestedGoalContribution({
  targetPaise,
  savedPaise,
  targetDate,
  now = new Date(),
  avgPastContributionPaise,
}: SuggestedGoalContributionInput): Paise {
  const remaining = Math.max(subPaise(targetPaise, savedPaise), 0);
  if (remaining === 0) return 0;
  if (targetDate) {
    const monthsRemaining = Math.max(1, differenceInCalendarMonths(targetDate, now));
    return Math.min(Math.ceil(remaining / monthsRemaining), remaining);
  }
  return Math.min(avgPastContributionPaise, remaining);
}

/** Average of past monthly totals, rounded to the nearest paisa. 0 with no history. */
export function computeCategoryAverage(monthlyTotals: Paise[]): Paise {
  if (monthlyTotals.length === 0) return 0;
  const total = addPaise(0, ...monthlyTotals);
  return roundToPaise(total / monthlyTotals.length);
}

export interface DraftRecurringItem {
  id: string;
  title: string;
  amountPaise: Paise;
  categoryId: string | null;
  kind: RecurringKind;
}

export interface DraftDebtItem {
  id: string;
  counterparty: string;
  outstandingPaise: Paise;
  repayments: { amountPaise: Paise }[];
}

export interface DraftGoalItem {
  id: string;
  title: string;
  kind: GoalKind;
  targetPaise: Paise;
  savedPaise: Paise;
  targetDate: Date | null;
  avgPastContributionPaise: Paise;
  linkedCategoryId: string | null;
}

export interface DraftCategoryAverage {
  categoryId: string;
  categoryName: string;
  group: CategoryGroup;
  avgPaise: Paise;
}

export interface BuildDraftLinesInput {
  recurringItems: DraftRecurringItem[];
  debts: DraftDebtItem[];
  goals: DraftGoalItem[];
  categoryAverages: DraftCategoryAverage[];
  now?: Date;
}

/**
 * Composes the auto-draft: active Recurring (kind-bucketed), open Debts
 * (suggested repayment), Goals (suggested contribution), and the last few
 * months' average variable spend per category (debt-group categories are
 * skipped here — Debts already cover that bucket). Zero-amount suggestions
 * are dropped so an achieved goal or untouched category doesn't clutter the
 * draft. All lines start at the default priority and `status: "planned"`.
 */
export function buildDraftLines({
  recurringItems,
  debts,
  goals,
  categoryAverages,
  now = new Date(),
}: BuildDraftLinesInput): PlanLine[] {
  const lines: PlanLine[] = [];

  for (const item of recurringItems) {
    if (item.amountPaise <= 0) continue;
    lines.push({
      categoryId: item.categoryId,
      label: item.title,
      plannedPaise: item.amountPaise,
      priority: DEFAULT_PRIORITY,
      bucket: bucketForRecurringKind(item.kind),
      status: "planned",
      recurringId: item.id,
    });
  }

  for (const debt of debts) {
    const plannedPaise = computeSuggestedDebtRepayment(debt.outstandingPaise, debt.repayments);
    if (plannedPaise <= 0) continue;
    lines.push({
      categoryId: null,
      label: debt.counterparty,
      plannedPaise,
      priority: DEFAULT_PRIORITY,
      bucket: "debt",
      status: "planned",
      debtId: debt.id,
    });
  }

  for (const goal of goals) {
    const plannedPaise = computeSuggestedGoalContribution({
      targetPaise: goal.targetPaise,
      savedPaise: goal.savedPaise,
      targetDate: goal.targetDate,
      now,
      avgPastContributionPaise: goal.avgPastContributionPaise,
    });
    if (plannedPaise <= 0) continue;
    lines.push({
      categoryId: goal.linkedCategoryId,
      label: goal.title,
      plannedPaise,
      priority: DEFAULT_PRIORITY,
      bucket: bucketForGoalKind(goal.kind),
      status: "planned",
      goalId: goal.id,
    });
  }

  for (const category of categoryAverages) {
    if (category.group === "debt" || category.avgPaise <= 0) continue;
    lines.push({
      categoryId: category.categoryId,
      label: category.categoryName,
      plannedPaise: category.avgPaise,
      priority: DEFAULT_PRIORITY,
      bucket: bucketForCategoryGroup(category.group),
      status: "planned",
    });
  }

  return lines;
}

export type BucketTotals = Record<MonthlyPlanLineBucket, Paise>;

const EMPTY_BUCKET_TOTALS: BucketTotals = { must: 0, debt: 0, save: 0, emi: 0, want: 0, buffer: 0 };

/** Sum of `plannedPaise` per bucket. A `"deferred"` line no longer belongs to this month, so it's excluded. */
export function computeBucketTotals(lines: PlanLine[]): BucketTotals {
  const totals = { ...EMPTY_BUCKET_TOTALS };
  for (const line of lines) {
    if (line.status === "deferred") continue;
    totals[line.bucket] = addPaise(totals[line.bucket], line.plannedPaise);
  }
  return totals;
}

export type AllocationStatus = "balanced" | "under" | "over";

export interface PlanSummary {
  bucketTotals: BucketTotals;
  totalPlannedPaise: Paise;
  unallocatedPaise: Paise;
  status: AllocationStatus;
}

/** "Every rupee has a job" once `unallocatedPaise` reaches exactly 0; negative means over-allocated. */
export function computePlanSummary(lines: PlanLine[], incomePaise: Paise): PlanSummary {
  const bucketTotals = computeBucketTotals(lines);
  const totalPlannedPaise = addPaise(0, ...Object.values(bucketTotals));
  const unallocatedPaise = subPaise(incomePaise, totalPlannedPaise);
  const status: AllocationStatus =
    unallocatedPaise === 0 ? "balanced" : unallocatedPaise > 0 ? "under" : "over";
  return { bucketTotals, totalPlannedPaise, unallocatedPaise, status };
}

/**
 * Swaps the `priority` of two lines (index-addressed, since plan lines have
 * no `_id` — see docs/DECISIONS.md). Backs the planner's move-up/move-down
 * reorder controls. A no-op (same array returned) for an out-of-range or
 * identical index pair.
 */
export function swapLinePriority(lines: PlanLine[], indexA: number, indexB: number): PlanLine[] {
  if (
    indexA === indexB ||
    indexA < 0 ||
    indexB < 0 ||
    indexA >= lines.length ||
    indexB >= lines.length
  ) {
    return lines;
  }
  const next = [...lines];
  const priorityA = next[indexA]!.priority;
  const priorityB = next[indexB]!.priority;
  next[indexA] = { ...next[indexA]!, priority: priorityB };
  next[indexB] = { ...next[indexB]!, priority: priorityA };
  return next;
}

export interface DeferLineResult {
  updatedCurrentLine: PlanLine;
  newNextMonthLine: PlanLine;
}

/**
 * Defers a line to next month: the current month's line is marked
 * `"deferred"` (excluded from this month's totals), and a fresh `"planned"`
 * line is handed back for the next month's plan, carrying a `deferredFrom`
 * trail back to this month. Deferring that new line again next month simply
 * overwrites the trail with the newer origin — only the immediate hop is
 * kept, not the full chain.
 */
export function deferLineToNextMonth(
  line: PlanLine,
  currentMonthKey: MonthKey,
  nextMonthKey: MonthKey,
): DeferLineResult {
  const updatedCurrentLine: PlanLine = { ...line, status: "deferred", deferredTo: nextMonthKey };
  const newNextMonthLine: PlanLine = {
    ...line,
    status: "planned",
    deferredFrom: currentMonthKey,
    deferredTo: undefined,
  };
  return { updatedCurrentLine, newNextMonthLine };
}

export interface WhatIfCandidate {
  id: string;
  plannedPaise: Paise;
  priority: number;
}

export interface WhatIfFundingResult {
  id: string;
  fundedPaise: Paise;
  fullyFunded: boolean;
}

/**
 * If the salary lands above the minimum, this is where the extra goes:
 * candidates (typically deferred/want lines) are funded in priority order
 * (1 = funded first), fully where the extra stretches, partially for the one
 * line where it runs out, and not at all beyond that. Ties keep their
 * original relative order (stable sort). Results are returned in the same
 * order as `candidates`, not priority order.
 */
export function computeWhatIfFunding(
  candidates: WhatIfCandidate[],
  extraPaise: Paise,
): WhatIfFundingResult[] {
  const order = candidates
    .map((candidate, index) => ({ candidate, index }))
    .sort((a, b) => a.candidate.priority - b.candidate.priority || a.index - b.index);

  let remaining = Math.max(extraPaise, 0);
  const resultById = new Map<string, WhatIfFundingResult>();
  for (const { candidate } of order) {
    if (remaining >= candidate.plannedPaise) {
      resultById.set(candidate.id, {
        id: candidate.id,
        fundedPaise: candidate.plannedPaise,
        fullyFunded: true,
      });
      remaining = subPaise(remaining, candidate.plannedPaise);
    } else if (remaining > 0) {
      resultById.set(candidate.id, { id: candidate.id, fundedPaise: remaining, fullyFunded: false });
      remaining = 0;
    } else {
      resultById.set(candidate.id, { id: candidate.id, fundedPaise: 0, fullyFunded: false });
    }
  }

  return candidates.map((candidate) => resultById.get(candidate.id)!);
}

export interface RolloverCandidate {
  label: string;
  unspentPaise: Paise;
}

/** Lines that came in under budget this month — the month-end rollover prompt's line items. */
export function computeRolloverCandidates(
  rows: { label: string; plannedPaise: Paise; actualPaise: Paise; status: MonthlyPlanLineStatus }[],
): RolloverCandidate[] {
  return rows
    .filter((row) => row.status !== "deferred")
    .map((row) => ({ label: row.label, unspentPaise: Math.max(subPaise(row.plannedPaise, row.actualPaise), 0) }))
    .filter((row) => row.unspentPaise > 0);
}

/** Total unspent across the rollover candidates — the amount offered to the buffer or a goal. */
export function computeTotalRollover(candidates: RolloverCandidate[]): Paise {
  return addPaise(0, ...candidates.map((c) => c.unspentPaise));
}

/**
 * Seeds a new month from the previous one: `"deferred"` lines are dropped
 * (they already produced their own line wherever they were deferred to),
 * everything else resets to `"planned"` with no defer trail. Provenance
 * links (recurringId/debtId/goalId) carry over since the underlying item is
 * still the same.
 */
export function copyPlanLines(previousLines: PlanLine[]): PlanLine[] {
  return previousLines
    .filter((line) => line.status !== "deferred")
    .map((line) => ({ ...line, status: "planned", deferredTo: undefined, deferredFrom: undefined }));
}

export type BudgetVsActualStatus = "under" | "tight" | "over";

export interface BudgetVsActualRow {
  label: string;
  bucket: MonthlyPlanLineBucket;
  plannedPaise: Paise;
  actualPaise: Paise;
  percent: number;
  status: BudgetVsActualStatus;
}

const TIGHT_THRESHOLD_PERCENT = 80;

/**
 * Per-line planned-vs-actual, for the progress bars: `"over"` once actual
 * spend exceeds planned, `"tight"` from 80% up to (and including) planned,
 * `"under"` below that. A line with nothing planned is `"over"` the moment
 * anything is spent against it, `"under"` otherwise.
 */
export function computeBudgetVsActual(
  rows: { label: string; bucket: MonthlyPlanLineBucket; plannedPaise: Paise; actualPaise: Paise }[],
): BudgetVsActualRow[] {
  return rows.map((row) => {
    const percent = ratioPercent(row.actualPaise, row.plannedPaise);
    const status: BudgetVsActualStatus =
      row.actualPaise > row.plannedPaise
        ? "over"
        : row.plannedPaise > 0 && percent >= TIGHT_THRESHOLD_PERCENT
          ? "tight"
          : "under";
    return { ...row, percent, status };
  });
}
