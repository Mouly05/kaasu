/**
 * Pure business logic for Recurring & EMIs: next-due-date math, paid-status
 * checks, and the derived stats the /recurring page shows. No I/O — DB reads
 * live in queries.ts, which calls into here for anything derived.
 */
import {
  daysUntilIST,
  type MonthKey,
  monthKey,
  nextAnniversaryIST,
  nextIntervalOccurrenceIST,
  nthMonthlyOccurrenceIST,
  todayIST,
} from "@/lib/dates";
import type { EmiInstallment } from "@/lib/db/models/emi";
import type { RecurringFrequency, RecurringKind } from "@/lib/db/models/recurring";
import { addPaise, type Paise, ratioPercent } from "@/lib/money";

import type { EmiCalculatorResult } from "./emi";

export interface RecurringLike {
  frequency: RecurringFrequency;
  dayOfMonth: number | null;
  startDate: Date;
  endDate: Date | null;
}

/**
 * The next occurrence on/after `now`, or null when it can't be computed
 * automatically. "custom" frequency has no interval stored on the model, so
 * it always returns null — the UI shows "custom schedule" instead of a due
 * date (see docs/DECISIONS.md).
 */
export function computeNextDueDate(recurring: RecurringLike, now: Date = new Date()): Date | null {
  const today = todayIST(now);
  if (recurring.endDate && recurring.endDate.getTime() < today.getTime()) return null;

  switch (recurring.frequency) {
    case "monthly": {
      if (!recurring.dayOfMonth) return null;
      const thisMonth = nthMonthlyOccurrenceIST(now, recurring.dayOfMonth, 0);
      return thisMonth.getTime() >= today.getTime()
        ? thisMonth
        : nthMonthlyOccurrenceIST(now, recurring.dayOfMonth, 1);
    }
    case "yearly":
      return nextAnniversaryIST(recurring.startDate, now);
    case "weekly":
      return nextIntervalOccurrenceIST(recurring.startDate, 7, now);
    case "custom":
      return null;
  }
}

/** Days from `now` to `dueDate` (negative if overdue). */
export const daysUntilDue = daysUntilIST;

/** Whether `lastPaidAt` (the most recent linked Transaction's date, if any) falls in `targetMonthKey`. */
export function isPaidForMonth(lastPaidAt: Date | null, targetMonthKey: MonthKey): boolean {
  return lastPaidAt !== null && monthKey(lastPaidAt) === targetMonthKey;
}

/** Sum of amountPaise across the given recurring items (caller filters to active/relevant ones). */
export function computeMonthlyTotal(items: { amountPaise: Paise }[]): Paise {
  return addPaise(0, ...items.map((item) => item.amountPaise));
}

export interface YearlySubscriptionCost {
  monthlyPaise: Paise;
  yearlyPaise: Paise;
}

/** The "₹519/mo = ₹6,228/yr" line: sum of kind:"subscription" items, and that × 12. */
export function computeYearlySubscriptionCost(
  items: { kind: RecurringKind; amountPaise: Paise }[],
): YearlySubscriptionCost {
  const monthlyPaise = addPaise(
    0,
    ...items.filter((item) => item.kind === "subscription").map((item) => item.amountPaise),
  );
  const yearlyPaise = addPaise(...(Array(12).fill(monthlyPaise) as Paise[]));
  return { monthlyPaise, yearlyPaise };
}

export type EmiLoadLevel = "unknown" | "ok" | "warning" | "hard";

export interface EmiLoadResult {
  percent: number;
  level: EmiLoadLevel;
}

/**
 * Total EMI monthly outflow as a percentage of expected monthly income.
 * `expectedIncomePaise` is null when the user hasn't set a salary yet — the
 * UI shows a "set salary in Settings" hint instead of a percentage then.
 * The soft warning threshold defaults to 10% and is user-configurable; the
 * hard warning at 20% is fixed.
 */
export function computeEmiLoadPercent(
  totalEmiMonthlyPaise: Paise,
  expectedIncomePaise: Paise | null,
  warnThresholdPct = 10,
): EmiLoadResult {
  if (expectedIncomePaise === null || expectedIncomePaise <= 0) {
    return { percent: 0, level: "unknown" };
  }
  const percent = ratioPercent(totalEmiMonthlyPaise, expectedIncomePaise);
  const level: EmiLoadLevel = percent >= 20 ? "hard" : percent >= warnThresholdPct ? "warning" : "ok";
  return { percent, level };
}

/** Stamps calendar due dates onto a pure `emi.ts` schedule, ready to persist as `Emi.installments`. */
export function buildEmiInstallments(
  calcResult: EmiCalculatorResult,
  startDate: Date,
  dayOfMonth: number,
): EmiInstallment[] {
  return calcResult.schedule.map((row) => ({
    dueDate: nthMonthlyOccurrenceIST(startDate, dayOfMonth, row.installmentNumber - 1),
    amountPaise: row.emiPaise,
  }));
}
