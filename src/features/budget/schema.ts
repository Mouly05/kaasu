import { z } from "zod";

import { MONTHLY_PLAN_LINE_BUCKETS, MONTHLY_PLAN_LINE_STATUSES } from "@/lib/db/enums";
import { objectIdSchema, paiseSchema } from "@/lib/zod-helpers";

const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const monthKeySchema = z.string().regex(MONTH_KEY_RE, "Must be YYYY-MM");

export const monthlyPlanLineInputSchema = z.object({
  categoryId: objectIdSchema.nullable(),
  label: z.string().trim().min(1, "Label is required").max(120),
  plannedPaise: paiseSchema({ min: 0 }),
  priority: z.number().int().min(1).max(5),
  bucket: z.enum(MONTHLY_PLAN_LINE_BUCKETS, "Choose a bucket"),
  status: z.enum(MONTHLY_PLAN_LINE_STATUSES, "Choose a status").default("planned"),
  deferredTo: monthKeySchema.optional(),
  deferredFrom: monthKeySchema.optional(),
  recurringId: objectIdSchema.optional(),
  debtId: objectIdSchema.optional(),
  goalId: objectIdSchema.optional(),
});

export const monthlyPlanInputSchema = z.object({
  monthKey: monthKeySchema,
  expectedIncomePaise: paiseSchema({ min: 0 }).optional(),
  actualIncomePaise: paiseSchema({ min: 0 }).optional(),
  lines: z.array(monthlyPlanLineInputSchema).default([]),
  notes: z.string().trim().max(2000).optional(),
});

export type MonthlyPlanInput = z.infer<typeof monthlyPlanInputSchema>;

/** The write shape for `saveMonthlyPlanLines`: replaces a month's entire `lines` array at once. */
export const saveMonthlyPlanLinesInputSchema = z.object({
  monthKey: monthKeySchema,
  lines: z.array(monthlyPlanLineInputSchema),
  expectedIncomePaise: paiseSchema({ min: 0 }).optional(),
  actualIncomePaise: paiseSchema({ min: 0 }).optional(),
});

export type SaveMonthlyPlanLinesInput = z.infer<typeof saveMonthlyPlanLinesInputSchema>;

export const deferPlanLineInputSchema = z.object({
  monthKey: monthKeySchema,
  lineIndex: z.number().int().min(0),
});

export type DeferPlanLineInput = z.infer<typeof deferPlanLineInputSchema>;

export const copyLastMonthInputSchema = z.object({
  monthKey: monthKeySchema,
});

export type CopyLastMonthInput = z.infer<typeof copyLastMonthInputSchema>;

export const rolloverInputSchema = z.object({
  monthKey: monthKeySchema,
  destination: z.discriminatedUnion("type", [
    z.object({ type: z.literal("next_month_buffer") }),
    z.object({ type: z.literal("goal"), goalId: objectIdSchema }),
  ]),
});

export type RolloverInput = z.infer<typeof rolloverInputSchema>;
