/**
 * Local (no-AI) parser for Quick Add's smart text box: "food 120 swiggy",
 * "120 auto", "rent 7000 yesterday" → amount, category, account, date,
 * merchant. Pure and synchronous — the caller supplies already-fetched
 * categories/accounts/merchant rules, and the UI renders each field as a
 * tappable, editable chip.
 */
import { ACCOUNT_TYPES } from "@/lib/db/enums";
import { parseRelativeDateToken, todayIST } from "@/lib/dates";
import { parseAmount } from "@/lib/money";

import { matchMerchantRule, type MerchantRuleLike } from "./merchant-rules";

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export type ParsedFieldSource = "merchant_rule" | "keyword" | "explicit" | "default" | "none";

export interface ParsedField<T> {
  value: T | null;
  confidence: number;
  source: ParsedFieldSource;
}

export interface QuickAddDraft {
  amountPaise: ParsedField<number>;
  categoryId: ParsedField<string>;
  accountId: ParsedField<string>;
  date: ParsedField<Date>;
  merchant: ParsedField<string>;
}

export interface ParserCategory {
  id: string;
  name: string;
}

export interface ParserAccount {
  id: string;
  type: AccountType;
}

export interface ParseQuickAddTextOptions {
  categories: ParserCategory[];
  accounts: ParserAccount[];
  merchantRules?: readonly MerchantRuleLike[];
  now?: Date;
  lastUsedCategoryId?: string | null;
  lastUsedAccountId?: string | null;
}

const CURRENCY_MARKERS = new Set(["rs", "rs.", "inr", "₹"]);

/** One entry per relevant default category name (see `DEFAULT_CATEGORIES`), English + Tamil-English. */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Rent: ["rent", "vaadagai"],
  "Food & Groceries": [
    "food",
    "groceries",
    "grocery",
    "lunch",
    "dinner",
    "breakfast",
    "snacks",
    "saapadu",
    "kirana",
    "vegetables",
  ],
  "Family Support": ["family", "support", "ammaku", "parents"],
  Medical: ["medical", "medicine", "doctor", "hospital", "pharmacy", "marunthu"],
  Travel: [
    "travel",
    "taxi",
    "auto",
    "bus",
    "train",
    "flight",
    "uber",
    "ola",
    "petrol",
    "fuel",
    "diesel",
    "cab",
  ],
  Subscriptions: ["subscription", "netflix", "spotify", "prime", "hotstar"],
  Utilities: ["electricity", "water", "gas", "wifi", "broadband", "current", "bill"],
  Shopping: ["shopping", "clothes", "amazon", "flipkart", "myntra"],
  Entertainment: ["movie", "cinema", "entertainment", "theatre", "outing"],
  Education: ["education", "school", "college", "fees", "tuition", "books"],
  Gadgets: ["gadget", "phone", "mobile", "laptop", "charger"],
  Gold: ["gold", "jewellery", "thangam"],
  "Investments/SIP": ["sip", "investment", "mutual"],
  EMI: ["emi", "installment"],
  "Debt Repayment": ["debt", "repayment", "karai"],
  Misc: ["misc", "other"],
};

const ACCOUNT_KEYWORDS: Record<AccountType, string[]> = {
  cash: ["cash"],
  upi: ["upi", "gpay", "googlepay", "phonepe", "paytm"],
  credit_card: ["card", "credit", "creditcard"],
  wallet: ["wallet"],
  bank: ["bank", "neft", "imps", "debit", "debitcard"],
  credit_line: ["creditline", "od", "overdraft"],
};

const KEYWORD_TO_CATEGORY_NAME = new Map<string, string>();
for (const [name, words] of Object.entries(CATEGORY_KEYWORDS)) {
  for (const word of words) KEYWORD_TO_CATEGORY_NAME.set(word, name);
}

const KEYWORD_TO_ACCOUNT_TYPE = new Map<string, AccountType>();
for (const [type, words] of Object.entries(ACCOUNT_KEYWORDS) as [AccountType, string[]][]) {
  for (const word of words) KEYWORD_TO_ACCOUNT_TYPE.set(word, type);
}

const DEFAULT_CONFIDENCE = 0.4;
const KEYWORD_CONFIDENCE = 0.7;

function withoutIndex<T>(items: T[], index: number): T[] {
  return items.filter((_, i) => i !== index);
}

/** Parses free text typed into Quick Add's smart box into a structured, editable draft. */
export function parseQuickAddText(input: string, options: ParseQuickAddTextOptions): QuickAddDraft {
  const now = options.now ?? new Date();
  const tokens = input
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0 && !CURRENCY_MARKERS.has(token.toLowerCase()));

  // 1. Amount: the first token that parses as a rupee amount.
  let amount: ParsedField<number> = { value: null, confidence: 0, source: "none" };
  let remaining: string[] = [];
  let amountConsumed = false;
  for (const token of tokens) {
    if (!amountConsumed) {
      const parsed = parseAmount(token);
      if (parsed !== null) {
        amount = { value: parsed, confidence: 1, source: "explicit" };
        amountConsumed = true;
        continue;
      }
    }
    remaining.push(token);
  }

  // 2. Date: the first remaining token that parses as today/yesterday/dd-mm[-yyyy].
  let date: ParsedField<Date>;
  const dateIndex = remaining.findIndex((token) => parseRelativeDateToken(token, now) !== null);
  if (dateIndex >= 0) {
    date = {
      value: parseRelativeDateToken(remaining[dateIndex]!, now)!,
      confidence: 1,
      source: "explicit",
    };
    remaining = withoutIndex(remaining, dateIndex);
  } else {
    date = { value: todayIST(now), confidence: 1, source: "default" };
  }

  // 3. Account: the first remaining token matching an account keyword.
  let account: ParsedField<string>;
  const accountIndex = remaining.findIndex((token) =>
    KEYWORD_TO_ACCOUNT_TYPE.has(token.toLowerCase()),
  );
  if (accountIndex >= 0) {
    const type = KEYWORD_TO_ACCOUNT_TYPE.get(remaining[accountIndex]!.toLowerCase())!;
    const matched = options.accounts.find((a) => a.type === type);
    account = matched
      ? { value: matched.id, confidence: 0.9, source: "keyword" }
      : defaultAccount(options);
    remaining = withoutIndex(remaining, accountIndex);
  } else {
    account = defaultAccount(options);
  }

  // 4. Category + merchant, on whatever text remains. A learned MerchantRule
  //    wins over the keyword map; the merchant is whatever text is left once
  //    only a category-keyword token (never a merchant-rule match) is removed.
  let category: ParsedField<string>;
  const ruleMatch = matchMerchantRule(remaining.join(" "), options.merchantRules ?? []);
  if (ruleMatch) {
    category = {
      value: ruleMatch.categoryId,
      confidence: ruleMatch.confidence,
      source: "merchant_rule",
    };
  } else {
    const categoryIndex = remaining.findIndex((token) =>
      KEYWORD_TO_CATEGORY_NAME.has(token.toLowerCase()),
    );
    if (categoryIndex >= 0) {
      const name = KEYWORD_TO_CATEGORY_NAME.get(remaining[categoryIndex]!.toLowerCase())!;
      const matched = options.categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
      category = matched
        ? { value: matched.id, confidence: KEYWORD_CONFIDENCE, source: "keyword" }
        : defaultCategory(options);
      remaining = withoutIndex(remaining, categoryIndex);
    } else {
      category = defaultCategory(options);
    }
  }

  const merchantValue = remaining.join(" ").trim();
  const merchant: ParsedField<string> = merchantValue
    ? { value: merchantValue, confidence: 0.6, source: "explicit" }
    : { value: null, confidence: 0, source: "none" };

  return { amountPaise: amount, categoryId: category, accountId: account, date, merchant };
}

function defaultAccount(options: ParseQuickAddTextOptions): ParsedField<string> {
  const fallback = options.lastUsedAccountId ?? options.accounts[0]?.id ?? null;
  return fallback
    ? { value: fallback, confidence: DEFAULT_CONFIDENCE, source: "default" }
    : { value: null, confidence: 0, source: "none" };
}

function defaultCategory(options: ParseQuickAddTextOptions): ParsedField<string> {
  const fallback = options.lastUsedCategoryId ?? null;
  return fallback
    ? { value: fallback, confidence: DEFAULT_CONFIDENCE, source: "default" }
    : { value: null, confidence: 0, source: "none" };
}
