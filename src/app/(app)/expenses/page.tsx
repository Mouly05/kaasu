import Link from "next/link";
import { Download } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { DailyGuidanceCard } from "@/features/expenses/components/daily-guidance-card";
import { ExpensesPageClient } from "@/features/expenses/components/expenses-page-client";
import { SafeToSpendCard } from "@/features/expenses/components/safe-to-spend-card";
import type { ExpenseFilters } from "@/features/expenses/components/expense-filters-bar";
import { computeDailyGuidance } from "@/features/expenses/guidance";
import {
  getGuidanceCategoryProgress,
  getSafeToSpendData,
} from "@/features/expenses/insights-queries";
import { listTransactionsPage } from "@/features/expenses/queries";
import {
  computeSafeToSpendNoPlan,
  computeSafeToSpendWithPlan,
} from "@/features/expenses/safe-to-spend";
import { listAccounts, listCategories } from "@/features/settings/queries";
import { requirePageUser } from "@/lib/auth-helpers";
import { TRANSACTION_SOURCES } from "@/lib/db/enums";
import type { TransactionSource } from "@/lib/db/models/transaction";

export const metadata: Metadata = { title: "Expenses · Kaasu" };

function firstString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseSource(value: string | undefined): TransactionSource | undefined {
  return value && (TRANSACTION_SOURCES as readonly string[]).includes(value)
    ? (value as TransactionSource)
    : undefined;
}

export default async function ExpensesPage({ searchParams }: PageProps<"/expenses">) {
  const { userId } = await requirePageUser();
  const rawParams = await searchParams;
  const t = await getTranslations("expenses");

  const filters: ExpenseFilters = {
    monthKey: firstString(rawParams.monthKey),
    categoryId: firstString(rawParams.categoryId),
    accountId: firstString(rawParams.accountId),
    source: firstString(rawParams.source),
    search: firstString(rawParams.search),
  };

  const [categories, accounts, page, safeToSpendData] = await Promise.all([
    listCategories(userId, { kind: "expense" }),
    listAccounts(userId),
    listTransactionsPage(userId, { ...filters, source: parseSource(filters.source) }),
    getSafeToSpendData(userId),
  ]);

  const guidanceCategories = safeToSpendData.hasPlan
    ? await getGuidanceCategoryProgress(userId, safeToSpendData.monthKey)
    : [];

  const safeToSpendResult = safeToSpendData.hasPlan
    ? computeSafeToSpendWithPlan({
        variableBudgetPlannedPaise: safeToSpendData.variableBudgetPlannedPaise,
        variableSpendSoFarPaise: safeToSpendData.variableSpendSoFarPaise,
        upcomingMustDebtEmiPaise: safeToSpendData.upcomingMustDebtEmiPaise,
        daysLeftInMonth: safeToSpendData.daysLeftInMonth,
      })
    : computeSafeToSpendNoPlan({
        expectedIncomePaise: safeToSpendData.expectedIncomePaise,
        fixedRecurringDuePaise: safeToSpendData.fixedRecurringDuePaise,
        variableSpendSoFarPaise: safeToSpendData.variableSpendSoFarPaise,
        daysLeftInMonth: safeToSpendData.daysLeftInMonth,
      });

  const nudges = computeDailyGuidance({
    hasPlan: safeToSpendData.hasPlan,
    daysLeftInMonth: safeToSpendData.daysLeftInMonth,
    safeToSpend: safeToSpendResult,
    categories: guidanceCategories,
    thisWeekSpendPaise: safeToSpendData.thisWeekSpendPaise,
    sameWeekLastMonthSpendPaise: safeToSpendData.sameWeekLastMonthSpendPaise,
    hasIncomeData: safeToSpendData.expectedIncomePaise > 0,
  });

  const exportParams = new URLSearchParams(
    Object.entries(filters).filter((entry): entry is [string, string] => entry[1] != null),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button asChild variant="outline">
            <Link href={`/expenses/export?${exportParams.toString()}`}>
              <Download />
              {t("export")}
            </Link>
          </Button>
        }
      />
      <SafeToSpendCard
        result={safeToSpendResult}
        spentTodayPaise={safeToSpendData.spentTodayPaise}
        thisWeekSpendPaise={safeToSpendData.thisWeekSpendPaise}
        sameWeekLastMonthSpendPaise={safeToSpendData.sameWeekLastMonthSpendPaise}
        hasIncomeData={safeToSpendData.expectedIncomePaise > 0}
      />
      <DailyGuidanceCard nudges={nudges} />
      <ExpensesPageClient
        key={JSON.stringify(filters)}
        initialPage={page}
        categories={categories}
        accounts={accounts}
        filters={filters}
      />
    </div>
  );
}
