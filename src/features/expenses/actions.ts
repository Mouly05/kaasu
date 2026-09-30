"use server";

import { z } from "zod";

import { fail, ok } from "@/lib/action-result";
import { requireUser, withAction } from "@/lib/auth-helpers";

import { transactionInputSchema, type TransactionInput } from "./schema";

/**
 * Quick Add's submit handler. Validates the shape but doesn't persist yet —
 * Module 5 fills in the real transaction write in this same function.
 */
export const submitQuickAdd = withAction(async (input: unknown) => {
  await requireUser();
  const parsed = transactionInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail<TransactionInput>({
      code: "validation",
      message: "Check the expense details.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    });
  }

  return ok(parsed.data);
});
