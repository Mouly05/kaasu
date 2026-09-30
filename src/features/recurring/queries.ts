import "server-only";

import { isValidObjectId } from "mongoose";

import { connectDb } from "@/lib/db/connection";
import { Recurring } from "@/lib/db/models/recurring";
import type { RecurringFrequency, RecurringKind } from "@/lib/db/models/recurring";

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
  return items.map((r) => ({
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
  }));
}

/** A single recurring item by id, scoped to the signed-in user. */
export async function getRecurringById(
  userId: string,
  recurringId: string,
): Promise<RecurringSummary | null> {
  if (!isValidObjectId(userId) || !isValidObjectId(recurringId)) return null;
  await connectDb();
  const r = await Recurring.findOne({ _id: recurringId, userId }).lean();
  if (!r) return null;
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
