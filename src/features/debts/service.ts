import { addPaise, subPaise, type Paise } from "@/lib/money";

/**
 * Outstanding balance on a debt: original minus repayments so far, clamped
 * to 0. Overpayment doesn't map to a meaningful negative balance.
 */
export function computeOutstandingPaise(
  originalPaise: Paise,
  repayments: { amountPaise: Paise }[],
): Paise {
  const repaidPaise = addPaise(0, ...repayments.map((r) => r.amountPaise));
  const outstanding = subPaise(originalPaise, repaidPaise);
  return Math.max(0, outstanding);
}
