import "server-only";

import { isValidObjectId } from "mongoose";

import { connectDb } from "@/lib/db/connection";
import { endOfMonthIST, type MonthKey, parseMonthKey, startOfMonthIST } from "@/lib/dates";
import { Recurring } from "@/lib/db/models/recurring";
import type { RecurringDoc, RecurringFrequency, RecurringKind } from "@/lib/db/models/recurring";
import { Transaction } from "@/lib/db/models/transaction";

import { computeNextDueDate, daysUntilDue, isPaidForMonth, type RecurringLike } from "./service";

export interface RecurringSummary {
  id: string;
  title: string;
  amountPaise: number;
  categoryId: string;
  accountId: string;
  frequency: RecurringFrequency;
  dayOfMonth: number | null;
  startDate: Date;
  endDate: Date | null;
  kind: RecurringKind;
  autoLog: boolean;
  reminderDaysBefore: number;
  isActive: boolean;
}

function toRecurringLike(r: RecurringDoc): RecurringLike {
  return { frequency: r.frequency, dayOfMonth: r.dayOfMonth ?? null, startDate: r.startDate, endDate: r.endDate ?? null };
}

function toSummary(r: RecurringDoc): RecurringSummary {
  return {
    id: String(r._id),
    title: r.title,
    amountPaise: r.amountPaise,
    categoryId: String(r.categoryId),
    accountId: String(r.accountId),
    frequency: r.frequency,
    dayOfMonth: r.dayOfMonth ?? null,
    startDate: r.startDate,
    endDate: r.endDate ?? null,
    kind: r.kind,
    autoLog: r.autoLog,
    reminderDaysBefore: r.reminderDaysBefore,
    isActive: r.isActive,
  };
}

/** The signed-in user's recurring items, active first. */
export async function listRecurring(
  userId: string,
  options: { includeInactive?: boolean } = {},
): Promise<RecurringSummary[]> {
  if (!isValidObjectId(userId)) return [];
  await connectDb();
  const items = await Recurring.find({
    userId,
    ...(options.includeInactive ? {} : { isActive: true }),
  })
    .sort({ dayOfMonth: 1, title: 1 })
    .lean();
  return items.map(toSummary);
}

/** A single recurring item by id, scoped to the signed-in user. */
export async function getRecurringById(
  userId: string,
  recurringId: string,
): Promise<RecurringSummary | null> {
  if (!isValidObjectId(userId) || !isValidObjectId(recurringId)) return null;
  await connectDb();
  const r = await Recurring.findOne({ _id: recurringId, userId }).lean();
  return r ? toSummary(r) : null;
}

export interface RecurringWithStatus extends RecurringSummary {
  nextDueDate: Date | null;
  daysUntilDue: number | null;
  isPaidThisMonth: boolean;
  lastPaidAt: Date | null;
}

/**
 * Active recurring items for the /recurring page: next due date, days until
 * due, and whether the linked Transaction for `targetMonthKey` already exists.
 * Grouping by `kind` happens in the page/component layer, not here.
 */
export async function listRecurringWithStatus(
  userId: string,
  targetMonthKey: MonthKey,
  now: Date = new Date(),
): Promise<RecurringWithStatus[]> {
  if (!isValidObjectId(userId)) return [];
  await connectDb();
  const items = await Recurring.find({ userId, isActive: true }).sort({ dayOfMonth: 1, title: 1 }).lean();
  if (items.length === 0) return [];

  const monthStart = parseMonthKey(targetMonthKey);
  const monthEnd = endOfMonthIST(monthStart);
  const transactions = await Transaction.find({
    userId,
    recurringId: { $in: items.map((item) => item._id) },
    date: { $gte: monthStart, $lte: monthEnd },
  })
    .sort({ date: -1 })
    .select({ recurringId: 1, date: 1 })
    .lean();

  // First match per recurringId wins — transactions are sorted newest first.
  const lastPaidByRecurringId = new Map<string, Date>();
  for (const tx of transactions) {
    const key = String(tx.recurringId);
    if (!lastPaidByRecurringId.has(key)) lastPaidByRecurringId.set(key, tx.date);
  }

  return items.map((item) => {
    const lastPaidAt = lastPaidByRecurringId.get(String(item._id)) ?? null;
    const nextDueDate = computeNextDueDate(toRecurringLike(item), now);
    return {
      ...toSummary(item),
      nextDueDate,
      daysUntilDue: nextDueDate ? daysUntilDue(nextDueDate, now) : null,
      isPaidThisMonth: isPaidForMonth(lastPaidAt, targetMonthKey),
      lastPaidAt,
    };
  });
}

export interface UpcomingDue {
  id: string;
  title: string;
  amountPaise: number;
  kind: RecurringKind;
  dueDate: Date;
  daysUntilDue: number;
}

/** Active recurring items due within the next `days` days (inclusive), soonest first. */
export async function getUpcomingDues(
  userId: string,
  now: Date = new Date(),
  days = 7,
): Promise<UpcomingDue[]> {
  if (!isValidObjectId(userId)) return [];
  await connectDb();
  const items = await Recurring.find({ userId, isActive: true }).lean();

  const withDueDates = items.flatMap((item) => {
    const dueDate = computeNextDueDate(toRecurringLike(item), now);
    if (!dueDate) return [];
    const daysUntil = daysUntilDue(dueDate, now);
    return daysUntil >= 0 && daysUntil <= days ? [{ item, dueDate, daysUntil }] : [];
  });

  return withDueDates
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .map(({ item, dueDate, daysUntil }) => ({
      id: String(item._id),
      title: item.title,
      amountPaise: item.amountPaise,
      kind: item.kind,
      dueDate,
      daysUntilDue: daysUntil,
    }));
}

export interface AutoLogDueItem {
  userId: string;
  recurringId: string;
}

/**
 * Cron-only: every user's autoLog recurring items due today that haven't
 * already been paid this month. Not scoped to a single userId — the daily
 * autolog route iterates every user in one query.
 */
export async function listAutoLogDueToday(now: Date = new Date()): Promise<AutoLogDueItem[]> {
  await connectDb();
  const items = await Recurring.find({ autoLog: true, isActive: true }).lean();
  if (items.length === 0) return [];

  const dueToday = items.filter((item) => {
    const dueDate = computeNextDueDate(toRecurringLike(item), now);
    return dueDate !== null && daysUntilDue(dueDate, now) === 0;
  });
  if (dueToday.length === 0) return [];

  const monthStart = startOfMonthIST(now);
  const monthEnd = endOfMonthIST(now);
  const alreadyPaid = await Transaction.find({
    recurringId: { $in: dueToday.map((item) => item._id) },
    date: { $gte: monthStart, $lte: monthEnd },
  })
    .select({ recurringId: 1 })
    .lean();
  const paidRecurringIds = new Set(alreadyPaid.map((tx) => String(tx.recurringId)));

  return dueToday
    .filter((item) => !paidRecurringIds.has(String(item._id)))
    .map((item) => ({ userId: String(item.userId), recurringId: String(item._id) }));
}
