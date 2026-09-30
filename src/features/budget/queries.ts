import "server-only";

import { isValidObjectId } from "mongoose";

import { connectDb } from "@/lib/db/connection";
import { MonthlyPlan } from "@/lib/db/models/monthly-plan";
import type { MonthlyPlanLine } from "@/lib/db/models/monthly-plan";

export interface MonthlyPlanSummary {
  id: string;
  monthKey: string;
  expectedIncomePaise: number;
  actualIncomePaise: number;
  lines: MonthlyPlanLine[];
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
    lines: plan.lines,
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
    lines: plan.lines,
    notes: plan.notes ?? null,
  }));
}
