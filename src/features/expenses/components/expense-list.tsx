"use client";

import { useEffect, useMemo, useRef } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { Receipt } from "lucide-react";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/shared";
import type { AccountSummary, CategorySummary } from "@/features/settings/queries";
import { IST } from "@/lib/dates";

import type { TransactionSummary } from "../queries";
import { ExpenseDayGroup } from "./expense-day-group";
import { ExpenseRow } from "./expense-row";

export interface ExpenseListProps {
  items: TransactionSummary[];
  categories: CategorySummary[];
  accounts: AccountSummary[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onEdit: (transaction: TransactionSummary) => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

interface DayGroup {
  dayKey: string;
  date: Date;
  totalPaise: number;
  items: TransactionSummary[];
}

function groupByDay(items: TransactionSummary[]): DayGroup[] {
  const groups: DayGroup[] = [];
  const indexByKey = new Map<string, number>();
  for (const item of items) {
    const dayKey = formatInTimeZone(item.date, IST, "yyyy-MM-dd");
    const signedAmount = item.direction === "credit" ? item.amountPaise : -item.amountPaise;
    const existingIndex = indexByKey.get(dayKey);
    if (existingIndex === undefined) {
      indexByKey.set(dayKey, groups.length);
      groups.push({ dayKey, date: item.date, totalPaise: signedAmount, items: [item] });
    } else {
      const group = groups[existingIndex]!;
      group.totalPaise += signedAmount;
      group.items.push(item);
    }
  }
  return groups;
}

/** Day-grouped, infinite-scrolling transaction list. Grouping happens client-side over
 * the already `(date desc)`-sorted page — the server never needs to group. */
export function ExpenseList({
  items,
  categories,
  accounts,
  selectedIds,
  onToggleSelect,
  onEdit,
  hasMore,
  loadingMore,
  onLoadMore,
}: ExpenseListProps) {
  const t = useTranslations("expenses.list");
  const sentinelRef = useRef<HTMLDivElement>(null);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accountNameById = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);
  const groups = useMemo(() => groupByDay(items), [items]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) onLoadMore();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  if (items.length === 0) {
    return (
      <EmptyState icon={Receipt} title={t("emptyTitle")} description={t("emptyDescription")} />
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <ExpenseDayGroup key={group.dayKey} date={group.date} totalPaise={group.totalPaise}>
          {group.items.map((item) => {
            const category = item.categoryId ? categoryById.get(item.categoryId) : undefined;
            return (
              <ExpenseRow
                key={item.id}
                transaction={item}
                categoryName={category?.name ?? null}
                categoryIcon={category?.icon ?? null}
                categoryColor={category?.color ?? null}
                accountName={accountNameById.get(item.accountId) ?? t("unknownAccount")}
                selected={selectedIds.has(item.id)}
                onToggleSelect={onToggleSelect}
                onEdit={onEdit}
              />
            );
          })}
        </ExpenseDayGroup>
      ))}
      {hasMore && <div ref={sentinelRef} className="h-8" aria-hidden />}
      {loadingMore && (
        <p className="text-muted-foreground py-4 text-center text-sm">{t("loadingMore")}</p>
      )}
    </div>
  );
}
