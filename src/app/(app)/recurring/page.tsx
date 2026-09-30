import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { MoneyText, PageHeader, StatCard } from "@/components/shared";
import { AddRecurringDialog } from "@/features/recurring/components/add-recurring-dialog";
import { EmiCalculatorDialog } from "@/features/recurring/components/emi-calculator-dialog";
import { EmiLoadMeter } from "@/features/recurring/components/emi-load-meter";
import { RecurringKindGroup } from "@/features/recurring/components/recurring-kind-group";
import type { EmiAction } from "@/features/recurring/components/recurring-card";
import { UpcomingPanel } from "@/features/recurring/components/upcoming-panel";
import { getUpcomingDues, listRecurringWithStatus } from "@/features/recurring/queries";
import {
  computeEmiLoadPercent,
  computeMonthlyTotal,
  computeYearlySubscriptionCost,
} from "@/features/recurring/service";
import { listEmis } from "@/features/debts/queries";
import { listAccounts, listCategories } from "@/features/settings/queries";
import { getSalaryPreferences } from "@/features/salary/queries";
import { requirePageUser } from "@/lib/auth-helpers";
import { monthKey } from "@/lib/dates";
import type { RecurringKind } from "@/lib/db/models/recurring";
import { formatINR } from "@/lib/money";

export const metadata: Metadata = { title: "Recurring & EMIs · Kaasu" };

const KIND_DISPLAY_ORDER: RecurringKind[] = ["rent", "support", "sip", "subscription", "emi", "fixed"];

export default async function RecurringPage() {
  const { userId } = await requirePageUser();
  const t = await getTranslations("recurring");
  const targetMonthKey = monthKey();

  const [items, upcoming, salaryPreferences, emis, categories, accounts] = await Promise.all([
    listRecurringWithStatus(userId, targetMonthKey),
    getUpcomingDues(userId),
    getSalaryPreferences(userId),
    listEmis(userId),
    listCategories(userId, { kind: "expense" }),
    listAccounts(userId),
  ]);

  const expectedIncomePaise =
    salaryPreferences?.salaryMinPaise && salaryPreferences.salaryMaxPaise
      ? Math.round((salaryPreferences.salaryMinPaise + salaryPreferences.salaryMaxPaise) / 2)
      : (salaryPreferences?.salaryMinPaise ?? salaryPreferences?.salaryMaxPaise ?? null);

  const monthlyTotal = computeMonthlyTotal(items);
  const emiMonthlyTotal = computeMonthlyTotal(items.filter((item) => item.kind === "emi"));
  const emiLoad = computeEmiLoadPercent(emiMonthlyTotal, expectedIncomePaise);
  const yearlySubscriptions = computeYearlySubscriptionCost(items);

  const emiActionsByRecurringId = new Map<string, EmiAction>();
  for (const emi of emis) {
    if (!emi.recurringId) continue;
    const nextInstallmentIndex = emi.installments.findIndex((installment) => !installment.paidAt);
    emiActionsByRecurringId.set(emi.recurringId, {
      emiId: emi.id,
      nextInstallmentIndex: nextInstallmentIndex === -1 ? null : nextInstallmentIndex,
    });
  }

  const itemsByKind = new Map<RecurringKind, typeof items>();
  for (const item of items) {
    itemsByKind.set(item.kind, [...(itemsByKind.get(item.kind) ?? []), item]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AddRecurringDialog categories={categories} accounts={accounts} />
            <EmiCalculatorDialog categories={categories} accounts={accounts} />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t("monthlyTotal")} value={<MoneyText paise={monthlyTotal} colorBySign={false} />} />
        <StatCard
          label={t("yearlySubscriptions")}
          value={
            yearlySubscriptions.monthlyPaise === 0 ? (
              "—"
            ) : (
              <MoneyText paise={yearlySubscriptions.yearlyPaise} compact colorBySign={false} />
            )
          }
          hint={
            yearlySubscriptions.monthlyPaise > 0
              ? t("yearlySubscriptionsHint", {
                  monthly: formatINR(yearlySubscriptions.monthlyPaise),
                  yearly: formatINR(yearlySubscriptions.yearlyPaise),
                })
              : undefined
          }
        />
        <EmiLoadMeter result={emiLoad} />
      </div>

      <UpcomingPanel items={upcoming} />

      <div className="space-y-8">
        {KIND_DISPLAY_ORDER.map((kind) => (
          <RecurringKindGroup
            key={kind}
            kind={kind}
            items={itemsByKind.get(kind) ?? []}
            emiActionsByRecurringId={emiActionsByRecurringId}
          />
        ))}
      </div>
    </div>
  );
}
