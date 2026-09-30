/**
 * Merchant learning: when a Quick Add save has both a merchant and a category,
 * we remember the pairing so future entries for the same merchant auto-pick
 * it. Matching is case-insensitive exact-string (whole phrase, then per
 * token) — the wildcard/regex engine described in ADR-014 stays deferred to
 * the statements-import module.
 */

export interface MerchantRuleLike {
  pattern: string;
  categoryId: string;
  confidence: number;
}

export interface MerchantRuleState {
  categoryId: string;
  confidence: number;
  hits: number;
}

/** Case/whitespace-normalised merchant text, used both to store and to match `pattern`. */
export function normaliseMerchant(merchant: string): string {
  return merchant.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Finds a rule for `merchantText`: the whole normalised phrase first, then
 * each individual token, in order. Returns null if nothing matches or the
 * text is empty.
 */
export function matchMerchantRule(
  merchantText: string,
  rules: readonly MerchantRuleLike[],
): { categoryId: string; confidence: number } | null {
  const normalised = normaliseMerchant(merchantText);
  if (!normalised) return null;

  const byPattern = new Map(rules.map((rule) => [normaliseMerchant(rule.pattern), rule]));
  const whole = byPattern.get(normalised);
  if (whole) return { categoryId: whole.categoryId, confidence: whole.confidence };

  for (const token of normalised.split(" ")) {
    const hit = byPattern.get(token);
    if (hit) return { categoryId: hit.categoryId, confidence: hit.confidence };
  }
  return null;
}

/**
 * The next stored state for a merchant's rule after a save picked
 * `categoryId`. Reinforces confidence (capped at 1) when the category
 * matches what's already learned; resets to a fresh guess when it doesn't
 * (the user just corrected it).
 */
export function nextRuleState(
  existing: MerchantRuleState | null,
  categoryId: string,
): MerchantRuleState {
  if (!existing) return { categoryId, confidence: 0.5, hits: 1 };
  if (existing.categoryId === categoryId) {
    return {
      categoryId,
      confidence: Math.min(1, existing.confidence + 0.1),
      hits: existing.hits + 1,
    };
  }
  return { categoryId, confidence: 0.5, hits: 1 };
}
