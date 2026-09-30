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
