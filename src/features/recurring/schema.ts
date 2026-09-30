import { z } from "zod";

import { RECURRING_FREQUENCIES, RECURRING_KINDS } from "@/lib/db/enums";
import { objectIdSchema, paiseSchema } from "@/lib/zod-helpers";

export const recurringInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  amountPaise: paiseSchema({ min: 1 }),
  categoryId: objectIdSchema,
  accountId: objectIdSchema,
  frequency: z.enum(RECURRING_FREQUENCIES, "Choose a frequency"),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  kind: z.enum(RECURRING_KINDS, "Choose a kind"),
  autoLog: z.boolean().default(false),
  reminderDaysBefore: z.number().int().min(0).default(1),
  isActive: z.boolean().default(true),
});

export type RecurringInput = z.infer<typeof recurringInputSchema>;

export const updateRecurringSchema = recurringInputSchema.partial().extend({
  id: objectIdSchema,
});
export type UpdateRecurringInput = z.infer<typeof updateRecurringSchema>;

export const deleteRecurringSchema = z.object({ id: objectIdSchema });
export type DeleteRecurringInput = z.infer<typeof deleteRecurringSchema>;

export const toggleAutoLogSchema = z.object({ id: objectIdSchema, autoLog: z.boolean() });
export type ToggleAutoLogInput = z.infer<typeof toggleAutoLogSchema>;

export const markRecurringPaidSchema = z.object({ recurringId: objectIdSchema });
export type MarkRecurringPaidInput = z.infer<typeof markRecurringPaidSchema>;

/** Mirrors `EmiCalculatorInput` (src/features/recurring/emi.ts). */
export const emiCalculatorInputSchema = z.object({
  pricePaise: paiseSchema({ min: 1 }),
  downPaymentPaise: paiseSchema({ min: 0 }).default(0),
  tenureMonths: z.number().int().min(1).max(60),
  interestRatePct: z.number().min(0).max(50).default(0),
  processingFeePaise: paiseSchema({ min: 0 }).default(0),
  gstOnFeePercent: z.number().min(0).max(100).default(18),
});
export type EmiCalculatorFormInput = z.infer<typeof emiCalculatorInputSchema>;

export const emiCreateInputSchema = emiCalculatorInputSchema.extend({
  title: z.string().trim().min(1, "Title is required").max(120),
  categoryId: objectIdSchema,
  accountId: objectIdSchema,
  dayOfMonth: z.number().int().min(1).max(31),
  startDate: z.coerce.date(),
  lender: z.string().trim().max(120).optional(),
});
export type EmiCreateInput = z.infer<typeof emiCreateInputSchema>;

export const markEmiInstallmentPaidSchema = z.object({
  emiId: objectIdSchema,
  installmentIndex: z.number().int().min(0),
});
export type MarkEmiInstallmentPaidInput = z.infer<typeof markEmiInstallmentPaidSchema>;
