"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, ok } from "@/lib/action-result";
import { requireUser, withAction } from "@/lib/auth-helpers";
import { connectDb } from "@/lib/db/connection";
import { Income } from "@/lib/db/models/income";
import { User } from "@/lib/db/models/user";

import {
  budgetTargetSchema,
  incomeInputSchema,
  salaryPreferencesSchema,
  type BudgetTargetInput,
  type SalaryPreferencesInput,
} from "./schema";

/**
 * Quick Add's Income toggle. Writes to the separate Income collection, never
 * to Transaction — income never appears in the day-grouped Expenses list.
 */
export const submitIncome = withAction(async (input: unknown) => {
  const { userId } = await requireUser();
  const parsed = incomeInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail<{ id: string }>({
      code: "validation",
      message: "Check the income details.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    });
  }

  await connectDb();
  const income = await Income.create({ ...parsed.data, userId });
  revalidatePath("/expenses");
  return ok({ id: String(income._id) });
});

/** Settings' Salary section: payday and the min–max range the planner defaults to (plans on the minimum). */
export const updateSalaryPreferences = withAction(async (input: unknown) => {
  const { userId } = await requireUser();
  const parsed = salaryPreferencesSchema.safeParse(input);
  if (!parsed.success) {
    return fail<SalaryPreferencesInput>({
      code: "validation",
      message: "Check the salary details.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    });
  }

  await connectDb();
  const result = await User.updateOne({ _id: userId }, { $set: parsed.data });
  if (result.matchedCount === 0) {
    return fail<SalaryPreferencesInput>({ code: "not_found", message: "Your profile wasn't found." });
  }
  revalidatePath("/settings");
  revalidatePath("/salary");
  return ok(parsed.data);
});

/** The salary analyser's editable needs/wants/savings/debt target split (must add up to 100%). */
export const updateBudgetTargets = withAction(async (input: unknown) => {
  const { userId } = await requireUser();
  const parsed = budgetTargetSchema.safeParse(input);
  if (!parsed.success) {
    return fail<BudgetTargetInput>({
      code: "validation",
      message: "The four targets must add up to 100%.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    });
  }

  await connectDb();
  const result = await User.updateOne({ _id: userId }, { $set: parsed.data });
  if (result.matchedCount === 0) {
    return fail<BudgetTargetInput>({ code: "not_found", message: "Your profile wasn't found." });
  }
  revalidatePath("/salary");
  return ok(parsed.data);
});
