import "server-only";

import { subDays } from "date-fns";
import { isValidObjectId } from "mongoose";

import { connectDb } from "@/lib/db/connection";
import { Category } from "@/lib/db/models/category";
import type { MonthlyPlanLineBucket } from "@/lib/db/models/monthly-plan";
import { MonthlyPlan } from "@/lib/db/models/monthly-plan";
import { Recurring } from "@/lib/db/models/recurring";
import { Transaction } from "@/lib/db/models/transaction";
import { User } from "@/lib/db/models/user";
import { Income } from "@/lib/db/models/income";
import {
  daysLeftInMonth,
  endOfDayIST,
  endOfMonthIST,
  monthKey,
  parseMonthKey,
  startOfMonthIST,
  todayIST,
  trailingWeekRangeIST,
  type MonthKey,
} from "@/lib/dates";
import { addPaise } from "@/lib/money";

const VARIABLE_BUDGET_BUCKETS = new Set<MonthlyPlanLineBucket>(["want", "buffer"]);
const OBLIGATION_BUCKETS = new Set<MonthlyPlanLineBucket>(["must", "debt", "emi"]);

export interface SafeToSpendData {
  monthKey: MonthKey;
  daysLeftInMonth: number;
  hasPlan: boolean;
  variableBudgetPlannedPaise: number;
  upcomingMustDebtEmiPaise: number;
  expectedIncomePaise: number;
  fixedRecurringDuePaise: number;
  variableSpendSoFarPaise: number;
  spentTodayPaise: number;
  thisWeekSpendPaise: number;
  sameWeekLastMonthSpendPaise: number;
}

function sumAmountPaise(docs: readonly { amountPaise: number }[]): number {
  return docs.reduce((total, doc) => addPaise(total, doc.amountPaise), 0);
}

/** Gathers every raw input the pure `safe-to-spend.ts` calculators need. Never throws on missing data. */
export async function getSafeToSpendData(
  userId: string,
  now: Date = new Date(),
): Promise<SafeToSpendData> {
  const key = monthKey(now);
  const emptyResult: SafeToSpendData = {
    monthKey: key,
    daysLeftInMonth: daysLeftInMonth(now),
    hasPlan: false,
    variableBudgetPlannedPaise: 0,
    upcomingMustDebtEmiPaise: 0,
    expectedIncomePaise: 0,
    fixedRecurringDuePaise: 0,
    variableSpendSoFarPaise: 0,
    spentTodayPaise: 0,
    thisWeekSpendPaise: 0,
    sameWeekLastMonthSpendPaise: 0,
  };
  if (!isValidObjectId(userId)) return emptyResult;
  await connectDb();

  const monthStart = startOfMonthIST(now);
  const monthEnd = endOfMonthIST(now);
  const dayStart = todayIST(now);
  const dayEnd = endOfDayIST(now);
  const thisWeek = trailingWeekRangeIST(now);
  const sameWeekLastMonth = trailingWeekRangeIST(subDays(now, 28));

  const [
    plan,
    user,
    incomeThisMonth,
    activeMonthlyRecurring,
    loggedRecurringTransactions,
    variableSpend,
    spentToday,
    thisWeekSpend,
    sameWeekLastMonthSpend,
  ] = await Promise.all([
    MonthlyPlan.findOne({ userId, monthKey: key }).lean(),
    User.findById(userId).select({ salaryMinPaise: 1, salaryMaxPaise: 1 }).lean(),
    Income.find({ userId, source: "salary", date: { $gte: monthStart, $lte: monthEnd } })
      .select({ amountPaise: 1 })
      .lean(),
    Recurring.find({ userId, isActive: true, frequency: "monthly" })
      .select({ amountPaise: 1 })
      .lean(),
    Transaction.find({
      userId,
      recurringId: { $exists: true },
      date: { $gte: monthStart, $lte: monthEnd },
    })
      .select({ recurringId: 1 })
      .lean(),
    Transaction.find({
      userId,
      direction: "debit",
      date: { $gte: monthStart, $lte: monthEnd },
      recurringId: { $exists: false },
      debtId: { $exists: false },
      goalId: { $exists: false },
    })
      .select({ amountPaise: 1 })
      .lean(),
    Transaction.find({ userId, direction: "debit", date: { $gte: dayStart, $lte: dayEnd } })
      .select({ amountPaise: 1 })
      .lean(),
    Transaction.find({
      userId,
      direction: "debit",
      date: { $gte: thisWeek.start, $lte: thisWeek.end },
    })
      .select({ amountPaise: 1 })
      .lean(),
    Transaction.find({
      userId,
      direction: "debit",
      date: { $gte: sameWeekLastMonth.start, $lte: sameWeekLastMonth.end },
    })
      .select({ amountPaise: 1 })
      .lean(),
  ]);

  const loggedRecurringIds = new Set(loggedRecurringTransactions.map((t) => String(t.recurringId)));
  const fixedRecurringDuePaise = sumAmountPaise(
    activeMonthlyRecurring.filter((r) => !loggedRecurringIds.has(String(r._id))),
  );

  const salaryMin = user?.salaryMinPaise;
  const salaryMax = user?.salaryMaxPaise;
  const expectedIncomePaise =
    salaryMin != null && salaryMax != null
      ? Math.round((salaryMin + salaryMax) / 2)
      : (salaryMin ?? salaryMax ?? sumAmountPaise(incomeThisMonth));

  const hasPlan = plan != null;
  const variableBudgetPlannedPaise = plan
    ? sumAmountPaise(
        plan.lines
          .filter((line) => VARIABLE_BUDGET_BUCKETS.has(line.bucket))
          .map((line) => ({ amountPaise: line.plannedPaise })),
      )
    : 0;
  const upcomingMustDebtEmiPaise = plan
    ? sumAmountPaise(
        plan.lines
          .filter((line) => OBLIGATION_BUCKETS.has(line.bucket) && line.status === "planned")
          .map((line) => ({ amountPaise: line.plannedPaise })),
      )
    : 0;

  return {
    monthKey: key,
    daysLeftInMonth: daysLeftInMonth(now),
    hasPlan,
    variableBudgetPlannedPaise,
    upcomingMustDebtEmiPaise,
    expectedIncomePaise,
    fixedRecurringDuePaise,
    variableSpendSoFarPaise: sumAmountPaise(variableSpend),
    spentTodayPaise: sumAmountPaise(spentToday),
    thisWeekSpendPaise: sumAmountPaise(thisWeekSpend),
    sameWeekLastMonthSpendPaise: sumAmountPaise(sameWeekLastMonthSpend),
  };
}

export interface CategoryProgressRow {
  categoryId: string;
  categoryName: string;
  plannedPaise: number;
  spentPaise: number;
}

/** Per-category plan-vs-spend progress for the Daily guidance card. `[]` when no plan exists. */
export async function getGuidanceCategoryProgress(
  userId: string,
  key: MonthKey,
): Promise<CategoryProgressRow[]> {
  if (!isValidObjectId(userId)) return [];
  await connectDb();
  const plan = await MonthlyPlan.findOne({ userId, monthKey: key }).lean();
  if (!plan) return [];

  const categoryLines = plan.lines.filter((line) => line.categoryId != null);
  if (categoryLines.length === 0) return [];
  const categoryIds = categoryLines.map((line) => line.categoryId!);

  const monthStart = startOfMonthIST(parseMonthKey(key));
  const monthEnd = endOfMonthIST(parseMonthKey(key));
  const [categories, transactions] = await Promise.all([
    Category.find({ _id: { $in: categoryIds } })
      .select({ name: 1 })
      .lean(),
    Transaction.find({
      userId,
      direction: "debit",
      categoryId: { $in: categoryIds },
      date: { $gte: monthStart, $lte: monthEnd },
    })
      .select({ categoryId: 1, amountPaise: 1 })
      .lean(),
  ]);

  const categoryNameById = new Map(categories.map((c) => [String(c._id), c.name]));
  const spentByCategoryId = new Map<string, number>();
  for (const transaction of transactions) {
    const id = String(transaction.categoryId);
    spentByCategoryId.set(id, addPaise(spentByCategoryId.get(id) ?? 0, transaction.amountPaise));
  }

  return categoryLines.map((line) => {
    const id = String(line.categoryId);
    return {
      categoryId: id,
      categoryName: categoryNameById.get(id) ?? "Category",
      plannedPaise: line.plannedPaise,
      spentPaise: spentByCategoryId.get(id) ?? 0,
    };
  });
}
