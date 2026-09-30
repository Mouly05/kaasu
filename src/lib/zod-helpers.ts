/**
 * Shared Zod field helpers reused across feature `schema.ts` files. These
 * must stay bundleable on the client (react-hook-form + zodResolver, per
 * ADR-005) — no `mongoose` or `server-only` imports here.
 */
import { z } from "zod";

import { isPaise } from "@/lib/money";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

export interface PaiseSchemaOptions {
  min?: number;
  max?: number;
}

/** An integer number of paise (see `src/lib/money.ts`), with an optional range. */
export function paiseSchema({ min, max }: PaiseSchemaOptions = {}) {
  return z
    .number()
    .refine(isPaise, "Amount must be a whole number of paise")
    .refine((value) => min === undefined || value >= min, `Amount must be at least ${min ?? 0} paise`)
    .refine((value) => max === undefined || value <= max, `Amount must be at most ${max} paise`);
}

/** A 24-character hex string, the shape Mongoose casts to an ObjectId. */
export const objectIdSchema = z.string().regex(OBJECT_ID_RE, "Invalid id");
