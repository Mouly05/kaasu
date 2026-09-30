import { z } from "zod";

import { objectIdSchema } from "@/lib/zod-helpers";

export const statementImportSchema = z.object({
  fileName: z.string().trim().min(1, "File name is required").max(200),
  bank: z.string().trim().min(1, "Bank is required").max(80),
  period: z.object({ from: z.coerce.date(), to: z.coerce.date() }),
  rowCount: z.number().int().min(0),
});

export type StatementImportInput = z.infer<typeof statementImportSchema>;

// `pattern` is stored and validated as a plain string; see ADR-014 for why it
// is never compiled as a live user-controlled RegExp.
export const merchantRuleInputSchema = z.object({
  pattern: z.string().trim().min(1, "Pattern is required").max(100),
  categoryId: objectIdSchema,
  confidence: z.number().min(0).max(1).default(0.5),
});

export type MerchantRuleInput = z.infer<typeof merchantRuleInputSchema>;
