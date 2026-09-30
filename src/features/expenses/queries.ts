import "server-only";

import { isValidObjectId } from "mongoose";

import { connectDb } from "@/lib/db/connection";
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
