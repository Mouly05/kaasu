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
