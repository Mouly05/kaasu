/**
 * Enum tuples shared between Mongoose model schemas (`src/lib/db/models`)
 * and Zod input schemas (each feature's `schema.ts`). Kept free of any
 * `mongoose` import so feature `schema.ts` files stay client-bundleable
 * (react-hook-form + zodResolver, ADR-005) even though some models also
 * import from here.
 */

export const ACCOUNT_TYPES = [
  "bank",
  "cash",
  "credit_card",
  "wallet",
  "credit_line",
  "upi",
] as const;

export const CATEGORY_KINDS = ["expense", "income", "transfer"] as const;
export const CATEGORY_GROUPS = ["needs", "wants", "savings", "debt"] as const;

export const TRANSACTION_DIRECTIONS = ["debit", "credit"] as const;
export const TRANSACTION_SOURCES = ["manual", "telegram", "statement", "recurring", "ai"] as const;

export const RECURRING_FREQUENCIES = ["monthly", "weekly", "yearly", "custom"] as const;
export const RECURRING_KINDS = ["fixed", "subscription", "emi", "sip", "support", "rent"] as const;

export const MONTHLY_PLAN_LINE_BUCKETS = ["must", "debt", "save", "emi", "want", "buffer"] as const;
export const MONTHLY_PLAN_LINE_STATUSES = ["planned", "paid", "deferred"] as const;

export const INCOME_SOURCES = ["salary", "reimbursement", "other"] as const;

export const DEBT_TYPES = ["person", "credit_line", "card", "loan"] as const;
export const DEBT_DIRECTIONS = ["i_owe", "owed_to_me"] as const;
export const DEBT_STATUSES = ["open", "closed"] as const;

export const GOAL_KINDS = ["purchase", "emergency_fund", "investment", "custom"] as const;
export const GOAL_STATUSES = ["active", "achieved", "abandoned"] as const;

export const STATEMENT_IMPORT_STATUSES = ["pending", "processing", "completed", "failed"] as const;

export const CONNECTION_PROVIDERS = ["indstocks", "telegram"] as const;
export const CONNECTION_STATUSES = ["active", "expired", "revoked", "error"] as const;

export const HOLDING_SNAPSHOT_SOURCES = ["indstocks", "cas", "manual"] as const;
export const HOLDING_ASSET_TYPES = ["stock", "etf", "mf", "gold", "us_stock"] as const;

export const TASK_STATUSES = ["todo", "done", "skipped"] as const;
export const TASK_SOURCES = ["assistant", "manual", "telegram"] as const;

export const ADVISOR_MESSAGE_ROLES = ["user", "assistant", "system"] as const;
export const INSIGHT_SEVERITIES = ["info", "warning", "critical"] as const;

export const THEMES = ["light", "dark", "system"] as const;
