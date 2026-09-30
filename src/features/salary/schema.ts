import { z } from "zod";

import { INCOME_SOURCES } from "@/lib/db/enums";
import { paiseSchema } from "@/lib/zod-helpers";

export const salaryPreferencesSchema = z
  .object({
    payday: z.number().int().min(1).max(31).optional(),
    salaryMinPaise: paiseSchema().optional(),
    salaryMaxPaise: paiseSchema().optional(),
  })
  .refine(
    (value) =>
      value.salaryMinPaise === undefined ||
      value.salaryMaxPaise === undefined ||
      value.salaryMinPaise <= value.salaryMaxPaise,
    { message: "Minimum salary must not exceed the maximum", path: ["salaryMinPaise"] },
  );

export type SalaryPreferencesInput = z.infer<typeof salaryPreferencesSchema>;

export const incomeInputSchema = z.object({
  date: z.coerce.date(),
  amountPaise: paiseSchema({ min: 1 }),
  source: z.enum(INCOME_SOURCES, "Choose a source"),
  note: z.string().trim().max(500).optional(),
});

export type IncomeInput = z.infer<typeof incomeInputSchema>;

export const budgetTargetSchema = z
  .object({
    needsTargetPct: z.number().int().min(0).max(100),
    wantsTargetPct: z.number().int().min(0).max(100),
    savingsTargetPct: z.number().int().min(0).max(100),
    debtTargetPct: z.number().int().min(0).max(100),
  })
  .refine(
    (value) =>
      value.needsTargetPct + value.wantsTargetPct + value.savingsTargetPct + value.debtTargetPct === 100,
    { message: "The four targets must add up to 100%", path: ["needsTargetPct"] },
  );

export type BudgetTargetInput = z.infer<typeof budgetTargetSchema>;
