/**
 * "Safe to spend today" — pure calculators. Two branches: a fallback used
 * until a MonthlyPlan exists for the current month (Module 7), and a
 * plan-based formula that takes over automatically once one does. See
 * docs/DECISIONS.md for the ADRs recording the exact formulas and the fixed
 * "tight" threshold below.
 */
import { subPaise, type Paise } from "@/lib/money";

export type SafeToSpendStatus = "on_track" | "tight" | "over";

export interface SafeToSpendResult {
  /** The raw amount left for the rest of the month, before dividing by days left. Can be negative. */
  rawPaise: Paise;
  /** `max(0, rawPaise) / daysLeftInMonth`, floored to the paisa. */
  safeTodayPaise: Paise;
  status: SafeToSpendStatus;
}

/** Below this fraction of the basis amount, the status drops from on-track to tight. */
const TIGHT_RATIO_THRESHOLD = 0.2;

function finalize(rawPaise: Paise, basisPaise: Paise, daysLeftInMonth: number): SafeToSpendResult {
  if (daysLeftInMonth < 1) {
    throw new RangeError(`daysLeftInMonth must be at least 1, got ${daysLeftInMonth}`);
  }
  const safeTodayPaise = Math.floor(Math.max(0, rawPaise) / daysLeftInMonth);
  // basisPaise <= 0 with a positive rawPaise shouldn't occur with real inputs
  // (income/planned-budget of 0 forces raw <= 0 too) — treated as on-track
  // rather than dividing by zero.
  const ratio = basisPaise > 0 ? rawPaise / basisPaise : rawPaise > 0 ? 1 : 0;
  const status: SafeToSpendStatus =
    rawPaise <= 0 ? "over" : ratio < TIGHT_RATIO_THRESHOLD ? "tight" : "on_track";
  return { rawPaise, safeTodayPaise, status };
}

export interface SafeToSpendNoPlanInput {
  /** Midpoint of salaryMin/Max if set, else whichever is set, else this month's logged Income, else 0. */
  expectedIncomePaise: Paise;
  /** Sum of active monthly-frequency Recurring items not yet logged this month. */
  fixedRecurringDuePaise: Paise;
  /** Debit transactions this month, excluding any tied to a recurring/debt/goal id. */
  variableSpendSoFarPaise: Paise;
  daysLeftInMonth: number;
}

/** Used until a MonthlyPlan exists for the current month. */
export function computeSafeToSpendNoPlan(input: SafeToSpendNoPlanInput): SafeToSpendResult {
  const raw = subPaise(
    subPaise(input.expectedIncomePaise, input.fixedRecurringDuePaise),
    input.variableSpendSoFarPaise,
  );
  return finalize(raw, input.expectedIncomePaise, input.daysLeftInMonth);
}

export interface SafeToSpendWithPlanInput {
  /** Sum of the month's MonthlyPlan lines with bucket "want" or "buffer". */
  variableBudgetPlannedPaise: Paise;
  /** Debit transactions this month, excluding any tied to a recurring/debt/goal id. */
  variableSpendSoFarPaise: Paise;
  /** Sum of plan lines with bucket "must"/"debt"/"emi" and status "planned" (not yet paid). */
  upcomingMustDebtEmiPaise: Paise;
  daysLeftInMonth: number;
}

/** Used once a MonthlyPlan exists for the current month (Module 7 onward). */
export function computeSafeToSpendWithPlan(input: SafeToSpendWithPlanInput): SafeToSpendResult {
  // Overspending the discretionary budget never turns into "extra" safe-to-spend room.
  const left = Math.max(
    0,
    subPaise(input.variableBudgetPlannedPaise, input.variableSpendSoFarPaise),
  );
  const raw = subPaise(left, input.upcomingMustDebtEmiPaise);
  return finalize(raw, input.variableBudgetPlannedPaise, input.daysLeftInMonth);
}
