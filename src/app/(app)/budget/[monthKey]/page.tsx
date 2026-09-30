import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { TrendingUp } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { PlannerClient } from "@/features/budget/components/planner-client";
import { getMonthlyPlan, getPlanActuals } from "@/features/budget/queries";
import { computeBudgetVsActual, computeRolloverCandidates, computeTotalRollover } from "@/features/budget/service";
import { listGoals } from "@/features/goals/queries";
import { getSalaryPreferences } from "@/features/salary/queries";
import { listCategories } from "@/features/settings/queries";
import { requirePageUser } from "@/lib/auth-helpers";
import { formatMonthLabel, monthKey as monthKeyOf, shiftMonthKey, type MonthKey } from "@/lib/dates";

export const metadata: Metadata = { title: "Budget planner · Kaasu" };

const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export default async function BudgetPlannerPage(props: PageProps<"/budget/[monthKey]">) {
  const { monthKey: rawMonthKey } = await props.params;
  if (!MONTH_KEY_RE.test(rawMonthKey)) {
    redirect(`/budget/${monthKeyOf()}`);
  }
  const targetMonthKey = rawMonthKey as MonthKey;

  const { userId } = await requirePageUser();
  const t = await getTranslations("budget.planner");

  const [plan, previousMonthPlan, salaryPreferences, categories, goals] = await Promise.all([
    getMonthlyPlan(userId, targetMonthKey),
    getMonthlyPlan(userId, shiftMonthKey(targetMonthKey, -1)),
    getSalaryPreferences(userId),
    listCategories(userId, { kind: "expense" }),
    listGoals(userId, { status: "active" }),
  ]);

  const lines = plan?.lines ?? [];
  const planActuals = await getPlanActuals(userId, targetMonthKey, lines);
  const budgetVsActualRows = computeBudgetVsActual(planActuals);
  const rolloverCandidates = computeRolloverCandidates(planActuals);
  const rolloverTotalPaise = computeTotalRollover(rolloverCandidates);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={t("title")}
        description={formatMonthLabel(targetMonthKey)}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/salary">
              <TrendingUp /> {t("salaryAnalyser")}
            </Link>
          </Button>
        }
      />
      <PlannerClient
        monthKey={targetMonthKey}
        initialLines={lines}
        expectedIncomePaise={plan?.expectedIncomePaise ?? 0}
        categories={categories}
        hasPreviousMonthPlan={(previousMonthPlan?.lines.length ?? 0) > 0}
        salaryMinPaise={salaryPreferences?.salaryMinPaise ?? null}
        salaryMaxPaise={salaryPreferences?.salaryMaxPaise ?? null}
        goals={goals.map((g) => ({ id: g.id, title: g.title }))}
        budgetVsActualRows={budgetVsActualRows}
        rolloverCandidates={rolloverCandidates}
        rolloverTotalPaise={rolloverTotalPaise}
      />
    </div>
  );
}
