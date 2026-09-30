import "server-only";

import { isValidObjectId } from "mongoose";

import { connectDb } from "@/lib/db/connection";
import { Income } from "@/lib/db/models/income";
import type { IncomeSource } from "@/lib/db/models/income";
import { User } from "@/lib/db/models/user";

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
