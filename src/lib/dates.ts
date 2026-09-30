/**
 * IST-aware date helpers. The DB stores UTC instants. Every "day" and "month"
 * in Kaasu is a calendar day or month in Asia/Kolkata. Functions take an
 * optional `now` so they can be tested deterministically.
 */
import { differenceInCalendarDays, endOfMonth, startOfDay, startOfMonth } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const IST = "Asia/Kolkata";

/** "2026-10": the storage and grouping key for an IST calendar month. */
export type MonthKey = `${number}-${string}`;

const MONTH_KEY_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** UTC instant of 00:00 IST on the IST calendar day containing `now`. */
export function todayIST(now: Date = new Date()): Date {
  return fromZonedTime(startOfDay(toZonedTime(now, IST)), IST);
}

/** UTC instant of 00:00:00.000 IST on the 1st of the IST month containing `date`. */
export function startOfMonthIST(date: Date = new Date()): Date {
  return fromZonedTime(startOfMonth(toZonedTime(date, IST)), IST);
}

/** UTC instant of 23:59:59.999 IST on the last day of the IST month containing `date`. */
export function endOfMonthIST(date: Date = new Date()): Date {
  return fromZonedTime(endOfMonth(toZonedTime(date, IST)), IST);
}

/** IST month key, e.g. "2026-10". */
export function monthKey(date: Date = new Date()): MonthKey {
  return formatInTimeZone(date, IST, "yyyy-MM") as MonthKey;
}

/** UTC instant at the start of the IST month named by `key` ("2026-10"). */
export function parseMonthKey(key: string): Date {
  const match = MONTH_KEY_RE.exec(key);
  if (!match) {
    throw new RangeError(`Invalid month key: "${key}" (expected YYYY-MM)`);
  }
  return fromZonedTime(`${match[1]}-${match[2]}-01T00:00:00`, IST);
}

/** IST days left in the month, counting today (the last day of a month → 1). */
export function daysLeftInMonth(now: Date = new Date()): number {
  const zoned = toZonedTime(now, IST);
  return differenceInCalendarDays(endOfMonth(zoned), zoned) + 1;
}

/** "30 Sep" (short) or "Mon, 30 Sep 2026" (long), always rendered in IST. */
export function formatDay(date: Date, style: "short" | "long" = "short"): string {
  return formatInTimeZone(date, IST, style === "long" ? "EEE, d MMM yyyy" : "d MMM");
}
