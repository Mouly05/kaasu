/**
 * Pure business logic for the salary analyser: needs/wants/savings/debt
 * split, savings rate, fixed-cost ratio, runway, and rule-based trend
 * insights. No I/O — DB reads live in queries.ts.
 */
import { addPaise, type Paise, ratioPercent, subPaise } from "@/lib/money";

export interface GroupTotals {
  needsPaise: Paise;
  wantsPaise: Paise;
  savingsPaise: Paise;
  debtPaise: Paise;
}

export interface BudgetTargetPercent {
  needsTargetPct: number;
  wantsTargetPct: number;
  savingsTargetPct: number;
  debtTargetPct: number;
}

export interface BudgetSplit {
  needsPercent: number;
  wantsPercent: number;
  savingsPercent: number;
  debtPercent: number;
  /**
   * Share of income not consumed by needs/wants/debt spend — money that
   * either went to savings/investment categories or simply wasn't spent.
   * Distinct from `savingsPercent` (explicit savings-category spend only):
   * this is the broader, more standard "savings rate". Can go negative
   * (deficit spending) when needs+wants+debt exceed income.
   */
  savingsRatePercent: number;
}

/** The needs/wants/savings/debt split of actual spend as a percentage of income, plus the true savings rate. */
export function computeBudgetSplit(totals: GroupTotals, incomePaise: Paise): BudgetSplit {
  const consumedPaise = addPaise(0, totals.needsPaise, totals.wantsPaise, totals.debtPaise);
  const leftoverPaise = subPaise(incomePaise, consumedPaise);
  return {
    needsPercent: ratioPercent(totals.needsPaise, incomePaise),
    wantsPercent: ratioPercent(totals.wantsPaise, incomePaise),
    savingsPercent: ratioPercent(totals.savingsPaise, incomePaise),
    debtPercent: ratioPercent(totals.debtPaise, incomePaise),
    savingsRatePercent: incomePaise > 0 ? ratioPercent(leftoverPaise, incomePaise) : 0,
  };
}

export interface BudgetTargetDiff {
  needsDiffPct: number;
  wantsDiffPct: number;
  savingsDiffPct: number;
  debtDiffPct: number;
}

/** Actual split minus target, per bucket. Positive means over target. */
export function compareToTarget(actual: BudgetSplit, target: BudgetTargetPercent): BudgetTargetDiff {
  return {
    needsDiffPct: actual.needsPercent - target.needsTargetPct,
    wantsDiffPct: actual.wantsPercent - target.wantsTargetPct,
    savingsDiffPct: actual.savingsPercent - target.savingsTargetPct,
    debtDiffPct: actual.debtPercent - target.debtTargetPct,
  };
}

/** Fixed (needs) spend as a percentage of income. */
export function computeFixedCostRatio(fixedPaise: Paise, incomePaise: Paise): number {
  return ratioPercent(fixedPaise, incomePaise);
}

/**
 * How many months an emergency fund would cover essential spend if income
 * stopped today, to one decimal place. 0 with no essential spend to measure
 * against (avoids a divide-by-zero "infinite runway").
 */
export function computeRunwayMonths(emergencyFundPaise: Paise, essentialMonthlyExpensePaise: Paise): number {
  if (essentialMonthlyExpensePaise <= 0) return 0;
  return Math.round((emergencyFundPaise / essentialMonthlyExpensePaise) * 10) / 10;
}

export interface MonthlyTrendPoint {
  monthKey: string;
  savingsRatePercent: number;
  fixedCostRatioPercent: number;
}

const SAVINGS_RATE_CHANGE_THRESHOLD = 2;
const FIXED_COST_WARNING_THRESHOLD = 50;

/**
 * Short rule-based observations from recent months, oldest first (the last
 * entry is "this month"). Each rule is independent, so more than one may
 * fire. Empty with fewer than 2 months of history.
 */
export function generateTrendInsights(history: MonthlyTrendPoint[]): string[] {
  if (history.length < 2) return [];
  const insights: string[] = [];
  const latest = history.at(-1)!;
  const previous = history.at(-2)!;
  const savingsRateChange = latest.savingsRatePercent - previous.savingsRatePercent;

  if (savingsRateChange > SAVINGS_RATE_CHANGE_THRESHOLD) {
    insights.push(
      `Savings rate improved to ${Math.round(latest.savingsRatePercent)}% this month, up from ${Math.round(previous.savingsRatePercent)}% last month.`,
    );
  } else if (savingsRateChange < -SAVINGS_RATE_CHANGE_THRESHOLD) {
    insights.push(
      `Savings rate dropped to ${Math.round(latest.savingsRatePercent)}%, down from ${Math.round(previous.savingsRatePercent)}% last month.`,
    );
  }

  if (latest.fixedCostRatioPercent > FIXED_COST_WARNING_THRESHOLD) {
    insights.push(
      `Fixed costs are ${Math.round(latest.fixedCostRatioPercent)}% of income — above the healthy 50% guideline.`,
    );
  }

  if (history.length >= 3) {
    const priorMonths = history.slice(0, -1);
    const priorAverage =
      priorMonths.reduce((sum, point) => sum + point.savingsRatePercent, 0) / priorMonths.length;
    if (latest.savingsRatePercent > priorAverage + SAVINGS_RATE_CHANGE_THRESHOLD) {
      insights.push(
        `This month's savings rate (${Math.round(latest.savingsRatePercent)}%) is above your recent average (${Math.round(priorAverage)}%).`,
      );
    } else if (latest.savingsRatePercent < priorAverage - SAVINGS_RATE_CHANGE_THRESHOLD) {
      insights.push(
        `This month's savings rate (${Math.round(latest.savingsRatePercent)}%) is below your recent average (${Math.round(priorAverage)}%).`,
      );
    }
  }

  return insights;
}
