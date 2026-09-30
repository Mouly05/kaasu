import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/shared";
import { BudgetSplitCard } from "@/features/salary/components/budget-split-card";
import { IncomeHistoryChart } from "@/features/salary/components/income-history-chart";
import { RunwayCard } from "@/features/salary/components/runway-card";
import { TargetSplitEditor } from "@/features/salary/components/target-split-editor";
import { TrendInsightsList } from "@/features/salary/components/trend-insights-list";
import {
  getBudgetTargets,
  getEmergencyFundSavedPaise,
  getMonthlyFinancialsHistory,
} from "@/features/salary/queries";
import { computeBudgetSplit, computeFixedCostRatio, computeRunwayMonths, generateTrendInsights } from "@/features/salary/service";
import { requirePageUser } from "@/lib/auth-helpers";

export const metadata: Metadata = { title: "Salary analyser · Kaasu" };

export default async function SalaryPage() {
  const { userId } = await requirePageUser();
  const t = await getTranslations("salary.page");

  const [history, target, emergencyFundSavedPaise] = await Promise.all([
    getMonthlyFinancialsHistory(userId),
    getBudgetTargets(userId),
    getEmergencyFundSavedPaise(userId),
  ]);

  const latest = history.at(-1) ?? null;
  const latestSplit = latest
    ? computeBudgetSplit(latest.groupTotals, latest.incomePaise)
    : computeBudgetSplit({ needsPaise: 0, wantsPaise: 0, savingsPaise: 0, debtPaise: 0 }, 0);

  const trendPoints = history.map((point) => {
    const split = computeBudgetSplit(point.groupTotals, point.incomePaise);
    return {
      monthKey: point.monthKey,
      savingsRatePercent: split.savingsRatePercent,
      fixedCostRatioPercent: computeFixedCostRatio(point.groupTotals.needsPaise, point.incomePaise),
    };
  });
  const insights = generateTrendInsights(trendPoints);
  const runwayMonths = latest ? computeRunwayMonths(emergencyFundSavedPaise, latest.groupTotals.needsPaise) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <IncomeHistoryChart history={history.map((h) => ({ monthKey: h.monthKey, incomePaise: h.incomePaise }))} />

      <div className="grid gap-4 sm:grid-cols-2">
        <RunwayCard runwayMonths={runwayMonths} emergencyFundSavedPaise={emergencyFundSavedPaise} />
        <div className="border-border/60 flex items-center justify-between rounded-2xl border p-5">
          <div>
            <p className="text-muted-foreground text-sm">{t("fixedCostRatio")}</p>
            <p className="text-2xl font-semibold tabular-nums">
              {Math.round(computeFixedCostRatio(latest?.groupTotals.needsPaise ?? 0, latest?.incomePaise ?? 0))}%
            </p>
          </div>
        </div>
      </div>

      <div className="relative">
        <BudgetSplitCard actual={latestSplit} target={target} />
        <div className="absolute top-4 right-4">
          <TargetSplitEditor target={target} />
        </div>
      </div>

      <TrendInsightsList insights={insights} />
    </div>
  );
}
