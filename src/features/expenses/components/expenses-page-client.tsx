"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { AccountSummary, CategorySummary } from "@/features/settings/queries";

import { loadMoreTransactions } from "../actions";
import type { TransactionsPage, TransactionSummary } from "../queries";
import { BulkActionBar } from "./bulk-action-bar";
import { ExpenseEditDialog } from "./expense-edit-dialog";
import { ExpenseFiltersBar, type ExpenseFilters } from "./expense-filters-bar";
import { ExpenseList } from "./expense-list";

export interface ExpensesPageClientProps {
  initialPage: TransactionsPage;
  categories: CategorySummary[];
  accounts: AccountSummary[];
  filters: ExpenseFilters;
}

/** Owns the mutable client-side state for the Expenses list: loaded pages,
 * bulk selection, and the currently-open edit dialog. */
export function ExpensesPageClient({
  initialPage,
  categories,
  accounts,
  filters,
}: ExpensesPageClientProps) {
  const [items, setItems] = useState(initialPage.items);
  const [cursor, setCursor] = useState(initialPage.nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingTransaction, setEditingTransaction] = useState<TransactionSummary | null>(null);

  async function handleLoadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const result = await loadMoreTransactions({ ...filters, cursor });
    setLoadingMore(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setItems((prev) => [...prev, ...result.data.items]);
    setCursor(result.data.nextCursor);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <ExpenseFiltersBar categories={categories} accounts={accounts} filters={filters} />
      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedIds={selectedIds}
          onClear={() => setSelectedIds(new Set())}
          onDeleted={(deletedIds) => {
            setItems((prev) => prev.filter((item) => !deletedIds.has(item.id)));
            setSelectedIds(new Set());
          }}
        />
      )}
      <ExpenseList
        items={items}
        categories={categories}
        accounts={accounts}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onEdit={setEditingTransaction}
        hasMore={cursor !== null}
        loadingMore={loadingMore}
        onLoadMore={() => void handleLoadMore()}
      />
      {editingTransaction && (
        <ExpenseEditDialog
          key={editingTransaction.id}
          transaction={editingTransaction}
          categories={categories}
          accounts={accounts}
          onClose={() => setEditingTransaction(null)}
        />
      )}
    </div>
  );
}
