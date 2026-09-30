import { z } from "zod";

import { MONTHLY_PLAN_LINE_BUCKETS, MONTHLY_PLAN_LINE_STATUSES } from "@/lib/db/enums";
import { objectIdSchema, paiseSchema } from "@/lib/zod-helpers";

const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export const monthlyPlanLineInputSchema = z.object({
  categoryId: objectIdSchema.nullable(),
  label: z.string().trim().min(1, "Label is required").max(120),
  plannedPaise: paiseSchema({ min: 0 }),
  priority: z.number().int().min(1).max(5),
  bucket: z.enum(MONTHLY_PLAN_LINE_BUCKETS, "Choose a bucket"),
  status: z.enum(MONTHLY_PLAN_LINE_STATUSES, "Choose a status").default("planned"),
  deferredTo: z.string().regex(MONTH_KEY_RE, "Must be YYYY-MM").optional(),
});

export const monthlyPlanInputSchema = z.object({
  monthKey: z.string().regex(MONTH_KEY_RE, "Must be YYYY-MM"),
  expectedIncomePaise: paiseSchema({ min: 0 }).optional(),
  actualIncomePaise: paiseSchema({ min: 0 }).optional(),
  lines: z.array(monthlyPlanLineInputSchema).default([]),
  notes: z.string().trim().max(2000).optional(),
});

export type MonthlyPlanInput = z.infer<typeof monthlyPlanInputSchema>;
