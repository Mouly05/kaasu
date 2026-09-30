/**
 * CSV export for the Expenses list's current filter. Amounts are plain
 * decimal strings (never `formatINR`'s ₹/commas, which would corrupt the
 * file) and dates are ISO `yyyy-MM-dd` in IST. RFC-4180 field escaping.
 */
import { formatInTimeZone } from "date-fns-tz";

import { IST } from "@/lib/dates";
import { fromPaise, type Paise } from "@/lib/money";

export interface CsvTransactionRow {
  date: Date;
  amountPaise: Paise;
  direction: "debit" | "credit";
  categoryName: string | null;
  accountName: string;
  merchant: string | null;
  note: string | null;
  tags: string[];
  source: string;
}

const HEADERS = [
  "Date",
  "Amount",
  "Direction",
  "Category",
  "Account",
  "Merchant",
  "Note",
  "Tags",
  "Source",
];

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Renders transaction rows as an RFC-4180 CSV string (CRLF line endings, header always included). */
export function transactionsToCsv(rows: readonly CsvTransactionRow[]): string {
  const lines = [HEADERS.map(escapeCsvField).join(",")];
  for (const row of rows) {
    const fields = [
      formatInTimeZone(row.date, IST, "yyyy-MM-dd"),
      fromPaise(row.amountPaise).toFixed(2),
      row.direction,
      row.categoryName ?? "",
      row.accountName,
      row.merchant ?? "",
      row.note ?? "",
      row.tags.join("; "),
      row.source,
    ];
    lines.push(fields.map(escapeCsvField).join(","));
  }
  return lines.join("\r\n");
}
