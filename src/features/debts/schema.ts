import { z } from "zod";

import { DEBT_DIRECTIONS, DEBT_TYPES } from "@/lib/db/enums";
import { objectIdSchema, paiseSchema } from "@/lib/zod-helpers";

export const debtInputSchema = z.object({
  counterparty: z.string().trim().min(1, "Counterparty is required").max(120),
  type: z.enum(DEBT_TYPES, "Choose a debt type"),
  direction: z.enum(DEBT_DIRECTIONS, "Choose who owes whom"),
  originalPaise: paiseSchema({ min: 1 }),
  interestRatePct: z.number().min(0).optional(),
  dueDate: z.coerce.date().optional(),
  priority: z.number().int().min(1).max(5).default(3),
});

export type DebtInput = z.infer<typeof debtInputSchema>;

export const emiInstallmentInputSchema = z.object({
  dueDate: z.coerce.date(),
  amountPaise: paiseSchema({ min: 1 }),
  paidAt: z.coerce.date().optional(),
  transactionId: objectIdSchema.optional(),
});

export const emiInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  principalPaise: paiseSchema({ min: 1 }),
  tenureMonths: z.number().int().min(1),
  interestRatePct: z.number().min(0).default(0),
  processingFeePaise: paiseSchema({ min: 0 }).optional(),
  downPaymentPaise: paiseSchema({ min: 0 }).optional(),
  startDate: z.coerce.date(),
  lender: z.string().trim().max(120).optional(),
  recurringId: objectIdSchema.optional(),
  installments: z.array(emiInstallmentInputSchema).default([]),
});

export type EmiInput = z.infer<typeof emiInputSchema>;
