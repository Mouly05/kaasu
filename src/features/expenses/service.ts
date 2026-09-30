import { createHash } from "node:crypto";

import { formatInTimeZone } from "date-fns-tz";

import { IST } from "@/lib/dates";
import type { Paise } from "@/lib/money";

export interface DedupeHashInput {
  date: Date;
  amountPaise: Paise;
  merchant: string;
  direction: "debit" | "credit";
}

/**
 * Deterministic hash for catching duplicate imported/automated transactions
 * (statement re-imports, retried webhooks). Never computed for manual or
 * recurring entries, which may legitimately repeat. See ADR-013.
 */
export function computeDedupeHash({ date, amountPaise, merchant, direction }: DedupeHashInput): string {
  const dayKey = formatInTimeZone(date, IST, "yyyy-MM-dd");
  const normalisedMerchant = merchant.trim().toLowerCase().replace(/\s+/g, " ");
  const raw = `${dayKey}|${amountPaise}|${direction}|${normalisedMerchant}`;
  return createHash("sha256").update(raw).digest("hex");
}
