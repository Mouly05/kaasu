import { AlertTriangle, CircleCheck, Info, OctagonAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { MoneyText, StatCard } from "@/components/shared";
import { formatINR, subPaise, type Paise } from "@/lib/money";
import { cn } from "@/lib/utils";

import type { SafeToSpendResult } from "../safe-to-spend";

const STATUS_ICON = { on_track: CircleCheck, tight: AlertTriangle, over: OctagonAlert } as const;
const STATUS_TONE_CLASS = {
  on_track: "text-positive",
  tight: "text-warning",
  over: "text-negative",
} as const;

export interface SafeToSpendCardProps {
  result: SafeToSpendResult;
  spentTodayPaise: Paise;
  thisWeekSpendPaise: Paise;
  sameWeekLastMonthSpendPaise: Paise;
  hasIncomeData: boolean;
}

/** The "safe to spend today" hero: status icon, daily allowance, spent-today, week comparison. */
export async function SafeToSpendCard({
  result,
  spentTodayPaise,
  thisWeekSpendPaise,
  sameWeekLastMonthSpendPaise,
  hasIncomeData,
}: SafeToSpendCardProps) {
  const t = await getTranslations("expenses.safeToSpend");
  const weekDiffPaise = subPaise(thisWeekSpendPaise, sameWeekLastMonthSpendPaise);

  // With no income data yet, the math mechanically lands on "over" (0 − 0 = 0) —
  // that's not a real over-budget alarm, so it renders neutral instead, regardless
  // of the computed status. See docs/DECISIONS.md ADR-048 (supersedes ADR-033).
  const StatusIcon = hasIncomeData ? STATUS_ICON[result.status] : Info;
  const toneClass = hasIncomeData ? STATUS_TONE_CLASS[result.status] : "text-muted-foreground";
  const statusLabel = hasIncomeData ? t(`status.${result.status}`) : t("status.noData");

  return (
    <div className="border-border/60 bg-card space-y-4 rounded-2xl border p-6">
      <div className="flex items-center gap-3">
        <StatusIcon className={cn("size-8 shrink-0", toneClass)} aria-hidden />
        <div className="min-w-0">
          <p className="text-muted-foreground text-sm">{statusLabel}</p>
          <p className="text-3xl font-semibold tracking-tight">
            <MoneyText paise={result.safeTodayPaise} colorBySign={false} />
            <span className="text-muted-foreground ml-1 text-sm font-normal">{t("perDay")}</span>
          </p>
        </div>
      </div>
      {!hasIncomeData && <p className="text-muted-foreground text-xs">{t("noIncomeHint")}</p>}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label={t("spentToday")}
          value={<MoneyText paise={spentTodayPaise} colorBySign={false} />}
        />
        <StatCard
          label={t("thisWeek")}
          value={<MoneyText paise={thisWeekSpendPaise} colorBySign={false} />}
          hint={
            sameWeekLastMonthSpendPaise > 0
              ? t(weekDiffPaise >= 0 ? "weekHigher" : "weekLower", {
                  amount: formatINR(Math.abs(weekDiffPaise)),
                })
              : undefined
          }
        />
      </div>
    </div>
  );
}
