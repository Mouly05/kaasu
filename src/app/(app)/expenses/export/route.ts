import { transactionsToCsv, type CsvTransactionRow } from "@/features/expenses/csv";
import { listTransactionsForExport } from "@/features/expenses/queries";
import { listAccounts, listCategories } from "@/features/settings/queries";
import { requireUser, withRoute } from "@/lib/auth-helpers";
import { TRANSACTION_SOURCES } from "@/lib/db/enums";
import type { TransactionSource } from "@/lib/db/models/transaction";

function parseSource(value: string | null): TransactionSource | undefined {
  return value && (TRANSACTION_SOURCES as readonly string[]).includes(value)
    ? (value as TransactionSource)
    : undefined;
}

/** Downloads the current filter's transactions as CSV. A route handler (not a server
 * action) so the browser drives the download natively. */
export const GET = withRoute(async (request: Request) => {
  const { userId } = await requireUser();
  const url = new URL(request.url);

  const filters = {
    monthKey: url.searchParams.get("monthKey") ?? undefined,
    categoryId: url.searchParams.get("categoryId") ?? undefined,
    accountId: url.searchParams.get("accountId") ?? undefined,
    source: parseSource(url.searchParams.get("source")),
    search: url.searchParams.get("search") ?? undefined,
  };

  const [transactions, categories, accounts] = await Promise.all([
    listTransactionsForExport(userId, filters),
    listCategories(userId),
    listAccounts(userId),
  ]);

  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const accountNameById = new Map(accounts.map((account) => [account.id, account.name]));

  const rows: CsvTransactionRow[] = transactions.map((transaction) => ({
    date: transaction.date,
    amountPaise: transaction.amountPaise,
    direction: transaction.direction,
    categoryName: transaction.categoryId
      ? (categoryNameById.get(transaction.categoryId) ?? null)
      : null,
    accountName: accountNameById.get(transaction.accountId) ?? "",
    merchant: transaction.merchant,
    note: transaction.note,
    tags: transaction.tags,
    source: transaction.source,
  }));

  return new Response(transactionsToCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="expenses.csv"',
    },
  });
});
