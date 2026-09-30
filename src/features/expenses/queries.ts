import "server-only";

import { isValidObjectId } from "mongoose";

import { endOfMonthIST, parseMonthKey, startOfMonthIST } from "@/lib/dates";
import { connectDb } from "@/lib/db/connection";
import { MerchantRule } from "@/lib/db/models/merchant-rule";
import { Transaction } from "@/lib/db/models/transaction";
import type { TransactionDirection, TransactionSource } from "@/lib/db/models/transaction";

export interface TransactionSummary {
  id: string;
  date: Date;
  amountPaise: number;
  direction: TransactionDirection;
  categoryId: string | null;
  accountId: string;
  merchant: string | null;
  note: string | null;
  tags: string[];
  source: TransactionSource;
  isReviewed: boolean;
}

function toSummary(doc: {
  _id: unknown;
  date: Date;
  amountPaise: number;
  direction: TransactionDirection;
  categoryId?: unknown;
  accountId: unknown;
  merchant?: string;
  note?: string;
  tags: string[];
  source: TransactionSource;
  isReviewed: boolean;
}): TransactionSummary {
  return {
    id: String(doc._id),
    date: doc.date,
    amountPaise: doc.amountPaise,
    direction: doc.direction,
    categoryId: doc.categoryId ? String(doc.categoryId) : null,
    accountId: String(doc.accountId),
    merchant: doc.merchant ?? null,
    note: doc.note ?? null,
    tags: doc.tags,
    source: doc.source,
    isReviewed: doc.isReviewed,
  };
}

export interface ListTransactionsOptions {
  from?: Date;
  to?: Date;
  accountId?: string;
  categoryId?: string;
  limit?: number;
}

/** The signed-in user's transactions, most recent first. */
export async function listTransactions(
  userId: string,
  options: ListTransactionsOptions = {},
): Promise<TransactionSummary[]> {
  if (!isValidObjectId(userId)) return [];
  await connectDb();
  const filter: Record<string, unknown> = { userId };
  if (options.from || options.to) {
    filter.date = {
      ...(options.from ? { $gte: options.from } : {}),
      ...(options.to ? { $lte: options.to } : {}),
    };
  }
  if (options.accountId) filter.accountId = options.accountId;
  if (options.categoryId) filter.categoryId = options.categoryId;

  const transactions = await Transaction.find(filter)
    .sort({ date: -1 })
    .limit(options.limit ?? 100)
    .lean();
  return transactions.map(toSummary);
}

/** A single transaction by id, scoped to the signed-in user. */
export async function getTransactionById(
  userId: string,
  transactionId: string,
): Promise<TransactionSummary | null> {
  if (!isValidObjectId(userId) || !isValidObjectId(transactionId)) return null;
  await connectDb();
  const transaction = await Transaction.findOne({ _id: transactionId, userId }).lean();
  return transaction ? toSummary(transaction) : null;
}

export interface TransactionFilters {
  monthKey?: string;
  categoryId?: string;
  accountId?: string;
  source?: TransactionSource;
  search?: string;
}

function buildTransactionFilter(
  userId: string,
  filters: Omit<TransactionFilters, "search">,
): Record<string, unknown> {
  const filter: Record<string, unknown> = { userId };
  if (filters.monthKey) {
    const monthStart = parseMonthKey(filters.monthKey);
    filter.date = { $gte: startOfMonthIST(monthStart), $lte: endOfMonthIST(monthStart) };
  }
  if (filters.categoryId) filter.categoryId = filters.categoryId;
  if (filters.accountId) filter.accountId = filters.accountId;
  if (filters.source) filter.source = filters.source;
  return filter;
}

export interface TransactionCursor {
  date: string;
  id: string;
}

export interface ListTransactionsPageOptions extends TransactionFilters {
  cursor?: TransactionCursor | null;
  limit?: number;
}

export interface TransactionsPage {
  items: TransactionSummary[];
  nextCursor: TransactionCursor | null;
}

/**
 * A page of the signed-in user's transactions, cursor-paginated on
 * `(date desc, _id desc)` — stable under concurrent inserts, unlike
 * `skip`/`limit`. When `search` is set, returns a single relevance-ranked
 * page via the existing merchant/note text index instead (no cursor).
 */
export async function listTransactionsPage(
  userId: string,
  options: ListTransactionsPageOptions = {},
): Promise<TransactionsPage> {
  if (!isValidObjectId(userId)) return { items: [], nextCursor: null };
  await connectDb();
  const limit = options.limit ?? 30;
  const baseFilter = buildTransactionFilter(userId, options);

  if (options.search) {
    const docs = await Transaction.find({ ...baseFilter, $text: { $search: options.search } })
      .select({
        date: 1,
        amountPaise: 1,
        direction: 1,
        categoryId: 1,
        accountId: 1,
        merchant: 1,
        note: 1,
        tags: 1,
        source: 1,
        isReviewed: 1,
        score: { $meta: "textScore" },
      })
      .sort({ score: { $meta: "textScore" } })
      .limit(limit)
      .lean();
    return { items: docs.map(toSummary), nextCursor: null };
  }

  const filter = { ...baseFilter };
  if (options.cursor) {
    const cursorDate = new Date(options.cursor.date);
    filter.$or = [
      { date: { $lt: cursorDate } },
      { date: cursorDate, _id: { $lt: options.cursor.id } },
    ];
  }

  const docs = await Transaction.find(filter)
    .sort({ date: -1, _id: -1 })
    .limit(limit + 1)
    .lean();
  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;
  const last = page.at(-1);
  const nextCursor =
    hasMore && last ? { date: last.date.toISOString(), id: String(last._id) } : null;
  return { items: page.map(toSummary), nextCursor };
}

/** Every transaction matching the filter, uncapped — feeds CSV export. */
export async function listTransactionsForExport(
  userId: string,
  filters: TransactionFilters = {},
): Promise<TransactionSummary[]> {
  if (!isValidObjectId(userId)) return [];
  await connectDb();
  const baseFilter = buildTransactionFilter(userId, filters);
  const filter = filters.search
    ? { ...baseFilter, $text: { $search: filters.search } }
    : baseFilter;
  const docs = await Transaction.find(filter).sort({ date: -1 }).lean();
  return docs.map(toSummary);
}

export interface MerchantRuleSummary {
  pattern: string;
  categoryId: string;
  confidence: number;
}

/** The signed-in user's learned merchant → category rules, for the Quick Add parser. */
export async function listMerchantRules(userId: string): Promise<MerchantRuleSummary[]> {
  if (!isValidObjectId(userId)) return [];
  await connectDb();
  const rules = await MerchantRule.find({ userId })
    .select({ pattern: 1, categoryId: 1, confidence: 1 })
    .lean();
  return rules.map((rule) => ({
    pattern: rule.pattern,
    categoryId: String(rule.categoryId),
    confidence: rule.confidence,
  }));
}
