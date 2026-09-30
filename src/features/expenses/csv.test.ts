import { describe, expect, it } from "vitest";

import { transactionsToCsv, type CsvTransactionRow } from "./csv";

function row(overrides: Partial<CsvTransactionRow> = {}): CsvTransactionRow {
  return {
    date: new Date("2026-09-30T10:00:00Z"),
    amountPaise: 12_345,
    direction: "debit",
    categoryName: "Food & Groceries",
    accountName: "Cash",
    merchant: "Swiggy",
    note: "lunch",
    tags: [],
    source: "manual",
    ...overrides,
  };
}

describe("transactionsToCsv", () => {
  it("renders just the header for an empty list", () => {
    expect(transactionsToCsv([])).toBe(
      "Date,Amount,Direction,Category,Account,Merchant,Note,Tags,Source",
    );
  });

  it("formats a basic row: IST date, 2dp plain amount, joined tags", () => {
    const csv = transactionsToCsv([row({ tags: ["work", "reimbursable"] })]);
    const [, dataLine] = csv.split("\r\n");
    expect(dataLine).toBe(
      "2026-09-30,123.45,debit,Food & Groceries,Cash,Swiggy,lunch,work; reimbursable,manual",
    );
  });

  it("renders null category/merchant/note as empty fields", () => {
    const csv = transactionsToCsv([row({ categoryName: null, merchant: null, note: null })]);
    const [, dataLine] = csv.split("\r\n");
    expect(dataLine).toBe("2026-09-30,123.45,debit,,Cash,,,,manual");
  });

  it("escapes a field containing a comma", () => {
    const csv = transactionsToCsv([row({ note: "coffee, tea" })]);
    expect(csv).toContain('"coffee, tea"');
  });

  it("escapes and doubles an embedded quote", () => {
    const csv = transactionsToCsv([row({ merchant: 'The "Corner" Shop' })]);
    expect(csv).toContain('"The ""Corner"" Shop"');
  });

  it("escapes a field containing a newline", () => {
    const csv = transactionsToCsv([row({ note: "line one\nline two" })]);
    expect(csv).toContain('"line one\nline two"');
  });

  it("never formats the amount as ₹-prefixed currency", () => {
    const csv = transactionsToCsv([row({ amountPaise: 100_000 })]);
    expect(csv).not.toContain("₹");
    expect(csv).toContain("1000.00");
  });

  it("joins multiple rows with CRLF", () => {
    const csv = transactionsToCsv([row(), row({ amountPaise: 500 })]);
    expect(csv.split("\r\n")).toHaveLength(3); // header + 2 rows
  });
});
