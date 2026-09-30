import "server-only";

import { isValidObjectId } from "mongoose";

import { listDebts } from "@/features/debts/queries";
import { listGoals } from "@/features/goals/queries";
import { listRecurring } from "@/features/recurring/queries";
import {
  endOfMonthIST,
  type MonthKey,
  parseMonthKey,
  shiftMonthKey,
  startOfMonthIST,
} from "@/lib/dates";
import { connectDb } from "@/lib/db/connection";
import { Category } from "@/lib/db/models/category";
import type { CategoryGroup } from "@/lib/db/models/category";
import { MonthlyPlan } from "@/lib/db/models/monthly-plan";
import type { MonthlyPlanLine } from "@/lib/db/models/monthly-plan";
import { Transaction } from "@/lib/db/models/transaction";
import { addPaise, roundToPaise } from "@/lib/money";

import {
  computeCategoryAverage,
  type BuildDraftLinesInput,
  type DraftCategoryAverage,
  type DraftDebtItem,
  type DraftGoalItem,
  type DraftRecurringItem,
  type PlanLine,
} from "./service";

/** Converts a lean `MonthlyPlanLine` (Mongoose ObjectId fields) to the plain, string-id `PlanLine` the rest of the module works with — the shape that's actually serializable across the RSC boundary to a client component. */
function toPlanLine(line: MonthlyPlanLine): PlanLine {
  return {
    categoryId: line.categoryId ? String(line.categoryId) : null,
    label: line.label,
    plannedPaise: line.plannedPaise,
    priority: line.priority,
    bucket: line.bucket,
    status: line.status,
    deferredTo: line.deferredTo,
    deferredFrom: line.deferredFrom,
    recurringId: line.recurringId ? String(line.recurringId) : undefined,
    debtId: line.debtId ? String(line.debtId) : undefined,
    goalId: line.goalId ? String(line.goalId) : undefined,
  };
}

export interface MonthlyPlanSummary {
  id: string;
  monthKey: string;
  expectedIncomePaise: number;
  actualIncomePaise: number;
  lines: PlanLine[];
  notes: string | null;
}

/** The signed-in user's plan for a given month, or null if none exists yet. */
export async function getMonthlyPlan(userId: string, monthKey: string): Promise<MonthlyPlanSummary | null> {
  if (!isValidObjectId(userId)) return null;
  await connectDb();
  const plan = await MonthlyPlan.findOne({ userId, monthKey }).lean();
  if (!plan) return null;
  return {
    id: String(plan._id),
    monthKey: plan.monthKey,
    expectedIncomePaise: plan.expectedIncomePaise,
    actualIncomePaise: plan.actualIncomePaise,
    lines: plan.lines.map(toPlanLine),
    notes: plan.notes ?? null,
  };
}

/** The signed-in user's most recent monthly plans, newest first. */
export async function listMonthlyPlans(userId: string, limit = 12): Promise<MonthlyPlanSummary[]> {
  if (!isValidObjectId(userId)) return [];
  await connectDb();
  const plans = await MonthlyPlan.find({ userId }).sort({ monthKey: -1 }).limit(limit).lean();
  return plans.map((plan) => ({
    id: String(plan._id),
    monthKey: plan.monthKey,
    expectedIncomePaise: plan.expectedIncomePaise,
    actualIncomePaise: plan.actualIncomePaise,
    lines: plan.lines.map(toPlanLine),
    notes: plan.notes ?? null,
  }));
}

function sumAmountPaise(docs: readonly { amountPaise: number }[]): number {
  return docs.reduce((total, doc) => addPaise(total, doc.amountPaise), 0);
}

/** A transaction counts as "variable" spend when it isn't already accounted for by a Recurring/Debt/Goal line. */
const VARIABLE_TRANSACTION_FILTER = {
  direction: "debit" as const,
  categoryId: { $exists: true },
  recurringId: { $exists: false },
  debtId: { $exists: false },
  goalId: { $exists: false },
};

/**
 * Per-category average variable spend over the `monthsBack` calendar months
 * strictly before `targetMonthKey` (3 by default). A month with no spend in
 * a category counts as ₹0 for that category's average, not as missing data.
 */
async function getCategoryVariableAverages(
  userId: string,
  targetMonthKey: MonthKey,
  monthsBack = 3,
): Promise<DraftCategoryAverage[]> {
  const totalsByCategory = new Map<string, number[]>();

  for (let offset = monthsBack; offset >= 1; offset--) {
    const key = shiftMonthKey(targetMonthKey, -offset);
    const monthStart = startOfMonthIST(parseMonthKey(key));
    const monthEnd = endOfMonthIST(parseMonthKey(key));
    const transactions = await Transaction.find({
      userId,
      ...VARIABLE_TRANSACTION_FILTER,
      date: { $gte: monthStart, $lte: monthEnd },
    })
      .select({ categoryId: 1, amountPaise: 1 })
      .lean();

    const slotIndex = monthsBack - offset;
    for (const transaction of transactions) {
      const categoryId = String(transaction.categoryId);
      const totals = totalsByCategory.get(categoryId) ?? Array<number>(monthsBack).fill(0);
      totals[slotIndex] = addPaise(totals[slotIndex]!, transaction.amountPaise);
      totalsByCategory.set(categoryId, totals);
    }
  }

  if (totalsByCategory.size === 0) return [];
  const categories = await Category.find({ _id: { $in: [...totalsByCategory.keys()] } })
    .select({ name: 1, group: 1 })
    .lean();

  return categories
    .filter((category): category is typeof category & { group: CategoryGroup } => category.group != null)
    .map((category) => ({
      categoryId: String(category._id),
      categoryName: category.name,
      group: category.group,
      avgPaise: computeCategoryAverage(totalsByCategory.get(String(category._id)) ?? []),
    }));
}

/** A goal's own average monthly contribution over the `monthsBack` months before `targetMonthKey`, zero-filled. */
async function getGoalAverageContribution(
  userId: string,
  goalId: string,
  targetMonthKey: MonthKey,
  monthsBack = 3,
): Promise<number> {
  const rangeStart = startOfMonthIST(parseMonthKey(shiftMonthKey(targetMonthKey, -monthsBack)));
  const rangeEnd = endOfMonthIST(parseMonthKey(shiftMonthKey(targetMonthKey, -1)));
  const transactions = await Transaction.find({
    userId,
    goalId,
    date: { $gte: rangeStart, $lte: rangeEnd },
  })
    .select({ amountPaise: 1 })
    .lean();
  const total = sumAmountPaise(transactions);
  return total === 0 ? 0 : roundToPaise(total / monthsBack);
}

/** Every input `buildDraftLines` (features/budget/service.ts) needs, freshly read from the DB. */
export async function getDraftInputs(
  userId: string,
  targetMonthKey: MonthKey,
  now: Date = new Date(),
): Promise<BuildDraftLinesInput> {
  if (!isValidObjectId(userId)) {
    return { recurringItems: [], debts: [], goals: [], categoryAverages: [], now };
  }
  await connectDb();

  const [recurring, debts, goals, categoryAverages] = await Promise.all([
    listRecurring(userId),
    listDebts(userId),
    listGoals(userId, { status: "active" }),
    getCategoryVariableAverages(userId, targetMonthKey),
  ]);

  const recurringItems: DraftRecurringItem[] = recurring
    .filter((item) => item.frequency === "monthly")
    .map((item) => ({
      id: item.id,
      title: item.title,
      amountPaise: item.amountPaise,
      categoryId: item.categoryId,
      kind: item.kind,
    }));

  const debtItems: DraftDebtItem[] = debts
    .filter((debt) => debt.direction === "i_owe")
    .map((debt) => ({
      id: debt.id,
      counterparty: debt.counterparty,
      outstandingPaise: debt.outstandingPaise,
      repayments: debt.repayments,
    }));

  const goalItems: DraftGoalItem[] = await Promise.all(
    goals.map(async (goal) => ({
      id: goal.id,
      title: goal.title,
      kind: goal.kind,
      targetPaise: goal.targetPaise,
      savedPaise: goal.savedPaise,
      targetDate: goal.targetDate,
      avgPastContributionPaise: goal.targetDate
        ? 0
        : await getGoalAverageContribution(userId, goal.id, targetMonthKey),
      linkedCategoryId: goal.linkedCategoryId,
    })),
  );

  return { recurringItems, debts: debtItems, goals: goalItems, categoryAverages, now };
}

export interface PlanActualRow {
  label: string;
  bucket: PlanLine["bucket"];
  status: PlanLine["status"];
  plannedPaise: number;
  actualPaise: number;
}

/** Actual spend behind every line in `lines`, matched via its recurring/debt/goal/category link. */
export async function getPlanActuals(
  userId: string,
  targetMonthKey: MonthKey,
  lines: PlanLine[],
): Promise<PlanActualRow[]> {
  if (!isValidObjectId(userId) || lines.length === 0) return [];
  await connectDb();

  const monthStart = startOfMonthIST(parseMonthKey(targetMonthKey));
  const monthEnd = endOfMonthIST(parseMonthKey(targetMonthKey));
  const transactions = await Transaction.find({
    userId,
    direction: "debit",
    date: { $gte: monthStart, $lte: monthEnd },
  })
    .select({ amountPaise: 1, categoryId: 1, recurringId: 1, debtId: 1, goalId: 1 })
    .lean();

  const byRecurringId = new Map<string, number>();
  const byDebtId = new Map<string, number>();
  const byGoalId = new Map<string, number>();
  const byCategoryIdVariableOnly = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.recurringId) {
      const key = String(transaction.recurringId);
      byRecurringId.set(key, addPaise(byRecurringId.get(key) ?? 0, transaction.amountPaise));
    } else if (transaction.debtId) {
      const key = String(transaction.debtId);
      byDebtId.set(key, addPaise(byDebtId.get(key) ?? 0, transaction.amountPaise));
    } else if (transaction.goalId) {
      const key = String(transaction.goalId);
      byGoalId.set(key, addPaise(byGoalId.get(key) ?? 0, transaction.amountPaise));
    } else if (transaction.categoryId) {
      const key = String(transaction.categoryId);
      byCategoryIdVariableOnly.set(key, addPaise(byCategoryIdVariableOnly.get(key) ?? 0, transaction.amountPaise));
    }
  }

  return lines.map((line) => {
    const actualPaise = line.recurringId
      ? (byRecurringId.get(line.recurringId) ?? 0)
      : line.debtId
        ? (byDebtId.get(line.debtId) ?? 0)
        : line.goalId
          ? (byGoalId.get(line.goalId) ?? 0)
          : line.categoryId
            ? (byCategoryIdVariableOnly.get(line.categoryId) ?? 0)
            : 0;
    return { label: line.label, bucket: line.bucket, status: line.status, plannedPaise: line.plannedPaise, actualPaise };
  });
}
