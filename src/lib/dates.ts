/**
 * IST-aware date helpers. The DB stores UTC instants. Every "day" and "month"
 * in Kaasu is a calendar day or month in Asia/Kolkata. Functions take an
 * optional `now` so they can be tested deterministically.
 */
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  startOfDay,
  startOfMonth,
  subDays,
} from "date-fns";
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

/** UTC instant of 23:59:59.999 IST on the IST calendar day containing `date`. */
export function endOfDayIST(date: Date = new Date()): Date {
  return fromZonedTime(endOfDay(toZonedTime(date, IST)), IST);
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

/** Calendar days from `now`'s IST day to `date`'s IST day (negative if `date` is in the past). */
export function daysUntilIST(date: Date, now: Date = new Date()): number {
  return differenceInCalendarDays(toZonedTime(date, IST), toZonedTime(now, IST));
}

/** "30 Sep" (short) or "Wed, 30 Sep 2026" (long), always rendered in IST. */
export function formatDay(date: Date, style: "short" | "long" = "short"): string {
  return formatInTimeZone(date, IST, style === "long" ? "EEE, d MMM yyyy" : "d MMM");
}

/**
 * Moves a month key forward (positive delta) or back (negative), e.g.
 * shiftMonthKey("2026-12", 1) → "2027-01". `addMonths` reads/writes a Date's
 * calendar fields via the *system's local timezone*, so the instant is
 * round-tripped through `toZonedTime`/`fromZonedTime` first — the same
 * pattern every other IST-aware helper in this file uses — otherwise this
 * silently breaks on any machine whose local timezone isn't IST (e.g. a UTC
 * CI runner), rolling the wrong side of a month/year boundary.
 */
export function shiftMonthKey(key: MonthKey, delta: number): MonthKey {
  const shifted = addMonths(toZonedTime(parseMonthKey(key), IST), delta);
  return monthKey(fromZonedTime(shifted, IST));
}

/** "Oct 2026", for a MonthSwitcher label. */
export function formatMonthLabel(key: MonthKey): string {
  return formatInTimeZone(parseMonthKey(key), IST, "MMM yyyy");
}

/** `day` in `year`/`month` (0-indexed), clamped to that month's last day
 * (e.g. day 31 in a 30-day month → the 30th). Returns the UTC instant of
 * 00:00 IST on that day. */
function clampedDateIST(year: number, month: number, day: number): Date {
  const lastDay = endOfMonth(new Date(year, month, 1)).getDate();
  const zonedTarget = new Date(year, month, Math.min(Math.max(day, 1), lastDay));
  return fromZonedTime(zonedTarget, IST);
}

/** The `dayOfMonth` occurrence in the IST month `monthOffset` months from `baseDate`'s month. */
export function nthMonthlyOccurrenceIST(baseDate: Date, dayOfMonth: number, monthOffset: number): Date {
  const zonedMonth = addMonths(startOfMonth(toZonedTime(baseDate, IST)), monthOffset);
  return clampedDateIST(zonedMonth.getFullYear(), zonedMonth.getMonth(), dayOfMonth);
}

/** The next occurrence of `anniversary`'s IST month/day on or after `now`'s IST day
 * (this year, or next if it's already passed). A 29 Feb anniversary clamps to 28 Feb
 * in a non-leap year. */
export function nextAnniversaryIST(anniversary: Date, now: Date = new Date()): Date {
  const zonedAnniversary = toZonedTime(anniversary, IST);
  const zonedNow = toZonedTime(now, IST);
  const month = zonedAnniversary.getMonth();
  const day = zonedAnniversary.getDate();
  const thisYear = clampedDateIST(zonedNow.getFullYear(), month, day);
  return thisYear >= todayIST(now) ? thisYear : clampedDateIST(zonedNow.getFullYear() + 1, month, day);
}

/** "today"/"yesterday" (case-insensitive) or a `dd-mm`/`dd-mm-yyyy` token. A missing
 * year always resolves to the current IST year — no attempt to guess whether a
 * future date should roll back to last year. Returns null for anything else,
 * including a syntactically valid but impossible calendar date (31-02). */
export function parseRelativeDateToken(token: string, now: Date = new Date()): Date | null {
  const normalised = token.trim().toLowerCase();
  if (normalised === "today") return todayIST(now);
  if (normalised === "yesterday") return todayIST(subDays(now, 1));

  const match = /^(\d{1,2})-(\d{1,2})(?:-(\d{4}))?$/.exec(normalised);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;

  const year = yyyy ?? formatInTimeZone(now, IST, "yyyy");
  const paddedDay = dd!.padStart(2, "0");
  const paddedMonth = mm!.padStart(2, "0");
  const candidate = fromZonedTime(`${year}-${paddedMonth}-${paddedDay}T00:00:00`, IST);
  if (Number.isNaN(candidate.getTime())) return null;
  // Round-trip to reject impossible calendar dates (e.g. 31-02) that would
  // otherwise silently roll into the next month.
  if (formatInTimeZone(candidate, IST, "dd-MM-yyyy") !== `${paddedDay}-${paddedMonth}-${year}`) {
    return null;
  }
  return candidate;
}

/** The next date that is `anchor` plus a whole multiple of `intervalDays`, on or
 * after `now`'s IST day (handles an `anchor` in the future too). */
export function nextIntervalOccurrenceIST(anchor: Date, intervalDays: number, now: Date = new Date()): Date {
  const elapsedDays = daysUntilIST(now, anchor);
  const remainder = ((elapsedDays % intervalDays) + intervalDays) % intervalDays;
  const daysToAdd = remainder === 0 ? 0 : intervalDays - remainder;
  return todayIST(addDays(now, daysToAdd));
}

/** A rolling trailing-7-day window ending on `date`'s IST day (inclusive), not a
 * calendar-aligned week — used to compare "this week" against 4 weeks back. */
export function trailingWeekRangeIST(date: Date = new Date()): { start: Date; end: Date } {
  return { start: todayIST(subDays(date, 6)), end: endOfDayIST(date) };
}
