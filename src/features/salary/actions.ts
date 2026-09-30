"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, ok } from "@/lib/action-result";
import { requireUser, withAction } from "@/lib/auth-helpers";
import { connectDb } from "@/lib/db/connection";
import { Income } from "@/lib/db/models/income";

import { incomeInputSchema } from "./schema";

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
