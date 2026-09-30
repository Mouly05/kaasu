/**
 * Daily guidance card: 1–3 plain-language nudges, ranked critical → warning
 * → info. No AI — a small rules engine over the safe-to-spend result, this
 * month's per-category plan progress (when a plan exists), and a
 * week-over-week spend comparison.
 */
import { formatINR, ratioPercent, subPaise, type Paise } from "@/lib/money";

import type { SafeToSpendResult } from "./safe-to-spend";

export type NudgeSeverity = "info" | "warning" | "critical";

export interface Nudge {
  id: string;
  severity: NudgeSeverity;
  message: string;
}

export interface CategoryProgress {
  categoryId: string;
  categoryName: string;
  plannedPaise: Paise;
  spentPaise: Paise;
}

export interface DailyGuidanceInput {
  /** Whether a MonthlyPlan exists for the current month — gates the per-category rule. */
  hasPlan: boolean;
  daysLeftInMonth: number;
  safeToSpend: SafeToSpendResult;
  /** Per-category plan progress; always [] when hasPlan is false. */
  categories: CategoryProgress[];
  thisWeekSpendPaise: Paise;
  sameWeekLastMonthSpendPaise: Paise;
}

const SEVERITY_RANK: Record<NudgeSeverity, number> = { critical: 0, warning: 1, info: 2 };
const CATEGORY_WARNING_THRESHOLD = 80;
const CATEGORY_CRITICAL_THRESHOLD = 100;
const WEEK_SPIKE_RATIO = 1.2;
const WEEK_IMPROVEMENT_RATIO = 0.8;
const MAX_NUDGES = 3;

function categoryNudge(
  category: CategoryProgress,
  daysLeftInMonth: number,
): (Nudge & { percentUsed: number }) | null {
  const percentUsed = ratioPercent(category.spentPaise, category.plannedPaise);
  if (percentUsed >= CATEGORY_CRITICAL_THRESHOLD) {
    const overBy = subPaise(category.spentPaise, category.plannedPaise);
    return {
      id: `plan-${category.categoryId}`,
      severity: "critical",
      percentUsed,
      message: `${category.categoryName} is over its plan by ${formatINR(overBy)}.`,
    };
  }
  if (percentUsed >= CATEGORY_WARNING_THRESHOLD) {
    const remainingPerDay = Math.floor(
      Math.max(0, subPaise(category.plannedPaise, category.spentPaise)) / daysLeftInMonth,
    );
    return {
      id: `plan-${category.categoryId}`,
      severity: "warning",
      percentUsed,
      message: `${category.categoryName} is at ${Math.round(percentUsed)}% of plan with ${daysLeftInMonth} days left — about ${formatINR(remainingPerDay)}/day remains for ${category.categoryName}.`,
    };
  }
  return null;
}

function safeToSpendNudge(result: SafeToSpendResult): Nudge {
  if (result.status === "over") {
    return {
      id: "safe-to-spend",
      severity: "critical",
      message: "Safe to spend today is ₹0 — you've used up the rest of this month's budget.",
    };
  }
  if (result.status === "tight") {
    return {
      id: "safe-to-spend",
      severity: "warning",
      message: `Money's tight — about ${formatINR(result.safeTodayPaise)}/day left for the rest of the month.`,
    };
  }
  return {
    id: "safe-to-spend",
    severity: "info",
    message: `You're on track — about ${formatINR(result.safeTodayPaise)}/day safe to spend today.`,
  };
}

function weekPaceNudge(thisWeekPaise: Paise, sameWeekLastMonthPaise: Paise): Nudge | null {
  if (sameWeekLastMonthPaise <= 0) return null;
  const ratio = thisWeekPaise / sameWeekLastMonthPaise;
  if (ratio > WEEK_SPIKE_RATIO) {
    return {
      id: "week-pace",
      severity: "warning",
      message: `This week's spend is ${Math.round((ratio - 1) * 100)}% higher than the same week last month.`,
    };
  }
  if (ratio < WEEK_IMPROVEMENT_RATIO) {
    return {
      id: "week-pace",
      severity: "info",
      message: `This week's spend is ${Math.round((1 - ratio) * 100)}% lower than the same week last month — nice pace.`,
    };
  }
  return null;
}

/** Ranks and caps the day's nudges at 3: critical, then warning, then info. */
export function computeDailyGuidance(input: DailyGuidanceInput): Nudge[] {
  const categoryNudges = input.hasPlan
    ? input.categories
        .map((category) => categoryNudge(category, input.daysLeftInMonth))
        .filter((nudge): nudge is Nudge & { percentUsed: number } => nudge !== null)
        .sort((a, b) => b.percentUsed - a.percentUsed)
        .map((nudge): Nudge => ({ id: nudge.id, severity: nudge.severity, message: nudge.message }))
    : [];

  const weekNudge = weekPaceNudge(input.thisWeekSpendPaise, input.sameWeekLastMonthSpendPaise);

  const nudges: Nudge[] = [...categoryNudges, safeToSpendNudge(input.safeToSpend)];
  if (weekNudge) nudges.push(weekNudge);

  // Array.prototype.sort is stable, so equal-severity nudges keep their
  // insertion order: highest-percentUsed categories first, then the
  // safe-to-spend nudge, then the week-pace nudge.
  return nudges
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    .slice(0, MAX_NUDGES);
}
