import { z } from "zod";

import { TRANSACTION_DIRECTIONS, TRANSACTION_SOURCES } from "@/lib/db/enums";
import { objectIdSchema, paiseSchema } from "@/lib/zod-helpers";

export const transactionInputSchema = z.object({
  date: z.coerce.date(),
  amountPaise: paiseSchema({ min: 1 }),
  direction: z.enum(TRANSACTION_DIRECTIONS, "Choose debit or credit"),
  categoryId: objectIdSchema.optional(),
  accountId: objectIdSchema,
  merchant: z.string().trim().max(200).optional(),
  note: z.string().trim().max(500).optional(),
  tags: z.array(z.string().trim().min(1)).default([]),
  source: z.enum(TRANSACTION_SOURCES, "Choose a source").default("manual"),
  recurringId: objectIdSchema.optional(),
  debtId: objectIdSchema.optional(),
  goalId: objectIdSchema.optional(),
  statementImportId: objectIdSchema.optional(),
});

export type TransactionInput = z.infer<typeof transactionInputSchema>;

export const updateTransactionSchema = transactionInputSchema.partial().extend({
  id: objectIdSchema,
});
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const deleteTransactionSchema = z.object({ id: objectIdSchema });
export type DeleteTransactionInput = z.infer<typeof deleteTransactionSchema>;

export const bulkDeleteTransactionsSchema = z.object({
  ids: z.array(objectIdSchema).min(1).max(200),
});
export type BulkDeleteTransactionsInput = z.infer<typeof bulkDeleteTransactionsSchema>;

const monthKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Invalid month key");

export const listTransactionsPageInputSchema = z.object({
  monthKey: monthKeySchema.optional(),
  categoryId: objectIdSchema.optional(),
  accountId: objectIdSchema.optional(),
  source: z.enum(TRANSACTION_SOURCES).optional(),
  search: z.string().trim().max(200).optional(),
  cursor: z.object({ date: z.string(), id: objectIdSchema }).nullish(),
  limit: z.number().int().min(1).max(100).optional(),
});
export type ListTransactionsPageInput = z.infer<typeof listTransactionsPageInputSchema>;
