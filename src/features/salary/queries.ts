import "server-only";

import { isValidObjectId } from "mongoose";

import {
  endOfMonthIST,
  type MonthKey,
  monthKey as monthKeyOf,
  parseMonthKey,
  shiftMonthKey,
  startOfMonthIST,
} from "@/lib/dates";
import { connectDb } from "@/lib/db/connection";
import { Category } from "@/lib/db/models/category";
import type { CategoryGroup } from "@/lib/db/models/category";
import { Goal } from "@/lib/db/models/goal";
import { Income } from "@/lib/db/models/income";
import type { IncomeSource } from "@/lib/db/models/income";
import { Transaction } from "@/lib/db/models/transaction";
import { User } from "@/lib/db/models/user";
import { addPaise } from "@/lib/money";
import type { BudgetTargetPercent, GroupTotals } from "./service";

export interface IncomeSummary {
  id: string;
  date: Date;
  amountPaise: number;
  source: IncomeSource;
  note: string | null;
}

/** The signed-in user's income entries, most recent first. */
export async function listIncomes(
  userId: string,
  options: { from?: Date; to?: Date } = {},
): Promise<IncomeSummary[]> {
  if (!isValidObjectId(userId)) return [];
  await connectDb();
  const filter: Record<string, unknown> = { userId };
  if (options.from || options.to) {
    filter.date = {
      ...(options.from ? { $gte: options.from } : {}),
      ...(options.to ? { $lte: options.to } : {}),
    };
  }
  const incomes = await Income.find(filter).sort({ date: -1 }).lean();
  return incomes.map((i) => ({
    id: String(i._id),
    date: i.date,
    amountPaise: i.amountPaise,
    source: i.source,
    note: i.note ?? null,
  }));
}

export interface SalaryPreferences {
  payday: number | null;
  salaryMinPaise: number | null;
  salaryMaxPaise: number | null;
}

/** The signed-in user's payday and expected salary range. */
export async function getSalaryPreferences(userId: string): Promise<SalaryPreferences | null> {
  if (!isValidObjectId(userId)) return null;
  await connectDb();
  const user = await User.findById(userId).select({ payday: 1, salaryMinPaise: 1, salaryMaxPaise: 1 }).lean();
  if (!user) return null;
  return {
    payday: user.payday ?? null,
    salaryMinPaise: user.salaryMinPaise ?? null,
    salaryMaxPaise: user.salaryMaxPaise ?? null,
  };
}

/** The signed-in user's editable needs/wants/savings/debt target split (defaults to 50/30/20/0). */
export async function getBudgetTargets(userId: string): Promise<BudgetTargetPercent> {
  const DEFAULTS: BudgetTargetPercent = {
    needsTargetPct: 50,
    wantsTargetPct: 30,
    savingsTargetPct: 20,
    debtTargetPct: 0,
  };
  if (!isValidObjectId(userId)) return DEFAULTS;
  await connectDb();
  const user = await User.findById(userId)
    .select({ needsTargetPct: 1, wantsTargetPct: 1, savingsTargetPct: 1, debtTargetPct: 1 })
    .lean();
  if (!user) return DEFAULTS;
  return {
    needsTargetPct: user.needsTargetPct ?? DEFAULTS.needsTargetPct,
    wantsTargetPct: user.wantsTargetPct ?? DEFAULTS.wantsTargetPct,
    savingsTargetPct: user.savingsTargetPct ?? DEFAULTS.savingsTargetPct,
    debtTargetPct: user.debtTargetPct ?? DEFAULTS.debtTargetPct,
  };
}

/** Sum of `savedPaise` across every emergency-fund goal — the runway calculation's numerator. */
export async function getEmergencyFundSavedPaise(userId: string): Promise<number> {
  if (!isValidObjectId(userId)) return 0;
  await connectDb();
  const goals = await Goal.find({ userId, kind: "emergency_fund" }).select({ savedPaise: 1 }).lean();
  return goals.reduce((total, goal) => addPaise(total, goal.savedPaise), 0);
}

export interface MonthlyFinancials {
  monthKey: MonthKey;
  incomePaise: number;
  groupTotals: GroupTotals;
}

/**
 * `monthsBack` months of history (oldest first, ending with the current
 * month): income and actual needs/wants/savings/debt spend, for the salary
 * analyser's chart, split, and trend insights. A month's income prefers what
 * was actually logged (past months are complete, unlike `getSafeToSpendData`'s
 * still-in-progress current month) and only falls back to the salary range
 * when nothing was logged at all.
 */
export async function getMonthlyFinancialsHistory(
  userId: string,
  now: Date = new Date(),
  monthsBack = 6,
): Promise<MonthlyFinancials[]> {
  if (!isValidObjectId(userId)) return [];
  await connectDb();

  const [categories, user] = await Promise.all([
    Category.find({ userId, kind: "expense" }).select({ group: 1 }).lean(),
    User.findById(userId).select({ salaryMinPaise: 1, salaryMaxPaise: 1 }).lean(),
  ]);
  const groupByCategoryId = new Map<string, CategoryGroup>();
  for (const category of categories) {
    if (category.group) groupByCategoryId.set(String(category._id), category.group);
  }
  const salaryMin = user?.salaryMinPaise;
  const salaryMax = user?.salaryMaxPaise;
  const fallbackIncomePaise =
    salaryMin != null && salaryMax != null
      ? Math.round((salaryMin + salaryMax) / 2)
      : (salaryMin ?? salaryMax ?? 0);

  const currentKey = monthKeyOf(now);
  const months: MonthlyFinancials[] = [];
  for (let offset = monthsBack - 1; offset >= 0; offset--) {
    const key = shiftMonthKey(currentKey, -offset);
    const monthStart = startOfMonthIST(parseMonthKey(key));
    const monthEnd = endOfMonthIST(parseMonthKey(key));

    const [incomeEntries, transactions] = await Promise.all([
      Income.find({ userId, date: { $gte: monthStart, $lte: monthEnd } })
        .select({ amountPaise: 1 })
        .lean(),
      Transaction.find({ userId, direction: "debit", date: { $gte: monthStart, $lte: monthEnd } })
        .select({ categoryId: 1, amountPaise: 1 })
        .lean(),
    ]);

    const loggedIncomePaise = incomeEntries.reduce((total, i) => addPaise(total, i.amountPaise), 0);
    const groupTotals: GroupTotals = { needsPaise: 0, wantsPaise: 0, savingsPaise: 0, debtPaise: 0 };
    for (const transaction of transactions) {
      if (!transaction.categoryId) continue;
      const group = groupByCategoryId.get(String(transaction.categoryId));
      if (!group) continue;
      const field = `${group}Paise` as keyof GroupTotals;
      groupTotals[field] = addPaise(groupTotals[field], transaction.amountPaise);
    }

    months.push({
      monthKey: key,
      incomePaise: loggedIncomePaise > 0 ? loggedIncomePaise : fallbackIncomePaise,
      groupTotals,
    });
  }

  return months;
}
