"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, ok } from "@/lib/action-result";
import { requireUser, withAction } from "@/lib/auth-helpers";
import { connectDb } from "@/lib/db/connection";
import { MerchantRule } from "@/lib/db/models/merchant-rule";
import { Transaction } from "@/lib/db/models/transaction";

import { nextRuleState } from "./merchant-rules";
import { listTransactionsPage, type TransactionsPage } from "./queries";
import {
  bulkDeleteTransactionsSchema,
  deleteTransactionSchema,
  listTransactionsPageInputSchema,
  transactionInputSchema,
  updateTransactionSchema,
  type BulkDeleteTransactionsInput,
  type DeleteTransactionInput,
  type UpdateTransactionInput,
} from "./schema";

/** Never blocks the transaction save — logs and swallows any merchant-rule write failure. */
async function upsertMerchantRuleForTransaction(
  userId: string,
  merchant: string,
  categoryId: string,
): Promise<void> {
  try {
    const pattern = merchant.trim();
    if (!pattern) return;
    const existing = await MerchantRule.findOne({ userId, pattern }).lean();
    const next = nextRuleState(
      existing
        ? {
            categoryId: String(existing.categoryId),
            confidence: existing.confidence,
            hits: existing.hits,
          }
        : null,
      categoryId,
    );
    await MerchantRule.updateOne(
      { userId, pattern },
      { $set: { categoryId: next.categoryId, confidence: next.confidence, hits: next.hits } },
      { upsert: true },
    );
  } catch (error) {
    console.error("[expenses] merchant rule upsert failed", error);
  }
}

/** Quick Add's submit handler: validates, writes the Transaction, and learns the merchant's category. */
export const submitQuickAdd = withAction(async (input: unknown) => {
  const { userId } = await requireUser();
  const parsed = transactionInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail<{ id: string }>({
      code: "validation",
      message: "Check the expense details.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    });
  }

  await connectDb();
  // dedupeHash is never set here — source is always "manual" for Quick Add,
  // and manual entries are allowed to legitimately repeat. See ADR-013.
  const transaction = await Transaction.create({ ...parsed.data, userId });

  if (parsed.data.merchant && parsed.data.categoryId) {
    await upsertMerchantRuleForTransaction(userId, parsed.data.merchant, parsed.data.categoryId);
  }

  revalidatePath("/expenses");
  return ok({ id: String(transaction._id) });
});

export const updateTransaction = withAction(async (input: unknown) => {
  const { userId } = await requireUser();
  const parsed = updateTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return fail<UpdateTransactionInput>({
      code: "validation",
      message: "Check the expense details.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    });
  }

  const { id, ...fields } = parsed.data;
  await connectDb();
  const result = await Transaction.updateOne({ _id: id, userId }, { $set: fields });
  if (result.matchedCount === 0) {
    return fail<UpdateTransactionInput>({
      code: "not_found",
      message: "That expense wasn't found.",
    });
  }

  if (fields.merchant && fields.categoryId) {
    await upsertMerchantRuleForTransaction(userId, fields.merchant, fields.categoryId);
  }

  revalidatePath("/expenses");
  return ok(parsed.data);
});

export const deleteTransaction = withAction(async (input: unknown) => {
  const { userId } = await requireUser();
  const parsed = deleteTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return fail<DeleteTransactionInput>({ code: "validation", message: "Invalid expense id." });
  }

  await connectDb();
  await Transaction.deleteOne({ _id: parsed.data.id, userId });
  revalidatePath("/expenses");
  return ok(parsed.data);
});

export const bulkDeleteTransactions = withAction(async (input: unknown) => {
  const { userId } = await requireUser();
  const parsed = bulkDeleteTransactionsSchema.safeParse(input);
  if (!parsed.success) {
    return fail<BulkDeleteTransactionsInput>({
      code: "validation",
      message: "Invalid expense ids.",
    });
  }

  await connectDb();
  await Transaction.deleteMany({ _id: { $in: parsed.data.ids }, userId });
  revalidatePath("/expenses");
  return ok(parsed.data);
});

/** Reads a further page for the Expenses list's infinite scroll — called from a client component. */
export const loadMoreTransactions = withAction(async (input: unknown) => {
  const { userId } = await requireUser();
  const parsed = listTransactionsPageInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail<TransactionsPage>({ code: "validation", message: "Invalid filter." });
  }
  const page = await listTransactionsPage(userId, parsed.data);
  return ok(page);
});
