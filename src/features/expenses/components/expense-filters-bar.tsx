"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { MonthSwitcher } from "@/components/shared";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TRANSACTION_SOURCES } from "@/lib/db/enums";
import { monthKey as currentMonthKey, type MonthKey } from "@/lib/dates";
import type { AccountSummary, CategorySummary } from "@/features/settings/queries";

export interface ExpenseFilters {
  monthKey?: string;
  categoryId?: string;
  accountId?: string;
  source?: string;
  search?: string;
}

export interface ExpenseFiltersBarProps {
  categories: CategorySummary[];
  accounts: AccountSummary[];
  filters: ExpenseFilters;
}

const ALL = "all";

/** Month, category, account, source and search filters — kept in the URL so the
 * filtered view is shareable and the server component can read it directly. */
export function ExpenseFiltersBar({ categories, accounts, filters }: ExpenseFiltersBarProps) {
  const t = useTranslations("expenses.filters");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchDraft, setSearchDraft] = useState(filters.search ?? "");

  function update(partial: Partial<ExpenseFilters>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(partial)) {
      if (!value || value === ALL) params.delete(key);
      else params.set(key, value);
    }
    router.replace(params.size > 0 ? `${pathname}?${params.toString()}` : pathname);
  }

  const monthValue = (filters.monthKey ?? currentMonthKey()) as MonthKey;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <MonthSwitcher value={monthValue} onChange={(next) => update({ monthKey: next })} />
      <Select
        value={filters.categoryId ?? ALL}
        onValueChange={(value) => update({ categoryId: value })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder={t("category")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("allCategories")}</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.accountId ?? ALL}
        onValueChange={(value) => update({ accountId: value })}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder={t("account")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("allAccounts")}</SelectItem>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.source ?? ALL} onValueChange={(value) => update({ source: value })}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder={t("source")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("allSources")}</SelectItem>
          {TRANSACTION_SOURCES.map((source) => (
            <SelectItem key={source} value={source}>
              {t(`sources.${source}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="search"
        value={searchDraft}
        onChange={(event) => setSearchDraft(event.target.value)}
        onBlur={() => update({ search: searchDraft })}
        onKeyDown={(event) => {
          if (event.key === "Enter") update({ search: searchDraft });
        }}
        placeholder={t("search")}
        aria-label={t("search")}
        className="w-full sm:w-48"
      />
    </div>
  );
}
