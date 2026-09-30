/**
 * Money helpers. Every amount in Kaasu is an integer number of **paise**
 * (₹1 = 100 paise). Floats never reach the DB; formatting happens only at the
 * UI edge. See docs/DECISIONS.md (ADR-001).
 */

export type Paise = number;

const LOCALE = "en-IN";
const CURRENCY = "INR";

/** Strict decimal rupee string: optional sign, digits, up to 2 decimals. */
const RUPEE_STRING_RE = /^([+-])?(\d+)(?:\.(\d{1,2}))?$/;

/** Lenient user input: number with optional Indian shorthand suffix. */
const AMOUNT_INPUT_RE = /^(\d+(?:\.\d+)?|\.\d+)(k|l|lac|lacs|lakh|lakhs|cr|crore|crores)?$/;

const SUFFIX_MULTIPLIER = {
  k: 1_000,
  l: 1_00_000,
  lac: 1_00_000,
  lacs: 1_00_000,
  lakh: 1_00_000,
  lakhs: 1_00_000,
  cr: 1_00_00_000,
  crore: 1_00_00_000,
  crores: 1_00_00_000,
} as const satisfies Record<string, number>;

type AmountSuffix = keyof typeof SUFFIX_MULTIPLIER;

export function isPaise(value: unknown): value is Paise {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function assertPaise(value: number, label = "amount"): void {
  if (!isPaise(value)) {
    throw new RangeError(`${label} must be a safe integer number of paise, got ${value}`);
  }
}

/** Rounds half away from zero, then checks the result is a safe integer. */
export function roundToPaise(value: number): Paise {
  const rounded = Math.sign(value) * Math.round(Math.abs(value)) || 0;
  assertPaise(rounded, "result");
  return rounded;
}

/**
 * Converts rupees to paise.
 * - Strings must be plain decimals with at most 2 decimal places ("1234.50").
 *   They are converted with exact integer arithmetic.
 * - Numbers are rounded half away from zero to the nearest paisa, which
 *   absorbs binary float noise (1.005 → 101).
 */
export function toPaise(rupees: number | string): Paise {
  if (typeof rupees === "string") {
    const match = RUPEE_STRING_RE.exec(rupees.trim());
    if (!match) {
      throw new RangeError(`Invalid rupee amount: "${rupees}"`);
    }
    const [, sign, whole, fraction] = match;
    const paise = Number(whole) * 100 + Number((fraction ?? "").padEnd(2, "0"));
    assertPaise(paise, "result");
    return sign === "-" ? -paise || 0 : paise;
  }

  if (!Number.isFinite(rupees)) {
    throw new RangeError(`Invalid rupee amount: ${rupees}`);
  }
  // toPrecision(12) strips float noise such as 100.49999999999999 → 100.5.
  return roundToPaise(Number((rupees * 100).toPrecision(12)));
}

/** Converts paise to rupees. Use only for display math or charts, never for storage. */
export function fromPaise(paise: Paise): number {
  assertPaise(paise);
  return paise / 100;
}

export interface FormatINROptions {
  /** Indian compact notation: ₹1.2K, ₹3.4L, ₹5.6Cr. */
  compact?: boolean;
  /** Force (true) or hide (false) paise. By default paise show only when non-zero. */
  showPaise?: boolean;
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(key: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency: CURRENCY,
      ...options,
    });
    formatterCache.set(key, formatter);
  }
  return formatter;
}

/** Formats paise as INR with Indian digit grouping, e.g. ₹1,23,456 or ₹1,234.50. */
export function formatINR(paise: Paise, options: FormatINROptions = {}): string {
  assertPaise(paise);
  const rupees = (paise || 0) / 100; // normalise -0 so it never renders as "-₹0"

  if (options.compact) {
    // Below the smallest compact threshold (1,000), `notation: "compact"` never
    // adds a K/L/Cr suffix — it should format identically to a plain integer.
    // Bypassing it here avoids a real cross-ICU-version inconsistency: some
    // ICU builds still apply `maximumFractionDigits: 1`'s rounding step in
    // this range, rendering "999.0" instead of "999".
    if (Math.abs(rupees) < 1000) {
      return getFormatter("fixed-0", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(rupees);
    }
    return getFormatter("compact", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(rupees);
  }

  const showPaise = options.showPaise ?? paise % 100 !== 0;
  const digits = showPaise ? 2 : 0;
  return getFormatter(`fixed-${digits}`, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(rupees);
}

/**
 * Parses a positive amount a user typed and returns paise, or null if it
 * cannot be read.
 * Accepts "500", "₹5,000", "Rs. 1,23,456.50", "1.2k", "1.5L", "2 lakh",
 * "3cr" and "500/-". It is lenient and rounds to the nearest paisa.
 */
export function parseAmount(input: string): Paise | null {
  const normalised = input
    .trim()
    .toLowerCase()
    .replace(/^(₹|rs\.?|inr)/, "")
    .replace(/\/-$/, "")
    .replace(/[,\s]/g, "");

  const match = AMOUNT_INPUT_RE.exec(normalised);
  if (!match) return null;

  const numberPart = match[1]!;
  const suffix = match[2] as AmountSuffix | undefined;
  const [whole, fraction = ""] = numberPart.split(".");
  const multiplier = suffix ? SUFFIX_MULTIPLIER[suffix] : 1;

  // Exact scaled arithmetic: digits / 10^fractionLength * multiplier * 100.
  const digits = Number(`${whole}${fraction}`);
  const paise = Math.round((digits * multiplier * 100) / 10 ** fraction.length);
  return isPaise(paise) ? paise : null;
}

/** Sums paise amounts and throws if any input or the total is not a safe integer. */
export function addPaise(...amounts: Paise[]): Paise {
  let total = 0;
  for (const amount of amounts) {
    assertPaise(amount);
    total += amount;
  }
  assertPaise(total, "result");
  return total;
}

/** a − b in paise, with the same safety checks as addPaise. */
export function subPaise(a: Paise, b: Paise): Paise {
  assertPaise(a);
  assertPaise(b);
  const result = a - b;
  assertPaise(result, "result");
  return result;
}

/** `percent`% of an amount, rounded half away from zero (percentOf(1_00_000, 12.5) → 12_500). */
export function percentOf(paise: Paise, percent: number): Paise {
  assertPaise(paise);
  if (!Number.isFinite(percent)) {
    throw new RangeError(`percent must be finite, got ${percent}`);
  }
  return roundToPaise(Number(((paise * percent) / 100).toPrecision(15)));
}

/** part as a percentage of whole (a float for progress bars). 0 when whole is 0. */
export function ratioPercent(part: Paise, whole: Paise): number {
  assertPaise(part);
  assertPaise(whole);
  if (whole === 0) return 0;
  return (part / whole) * 100;
}
