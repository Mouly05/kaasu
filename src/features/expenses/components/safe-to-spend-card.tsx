import { getTranslations } from "next-intl/server";

import { MoneyText, StatCard } from "@/components/shared";
import { formatINR, subPaise, type Paise } from "@/lib/money";

import type { SafeToSpendResult } from "../safe-to-spend";

const STATUS_EMOJI = { on_track: "🟢", tight: "🟡", over: "🔴" } as const;

export interface SafeToSpendCardProps {
  result: SafeToSpendResult;
  spentTodayPaise: Paise;
  thisWeekSpendPaise: Paise;
  sameWeekLastMonthSpendPaise: Paise;
  hasIncomeData: boolean;
}

/** The "safe to spend today" hero: status emoji, daily allowance, spent-today, week comparison. */
export async function SafeToSpendCard({
  result,
  spentTodayPaise,
  thisWeekSpendPaise,
  sameWeekLastMonthSpendPaise,
  hasIncomeData,
}: SafeToSpendCardProps) {
  const t = await getTranslations("expenses.safeToSpend");
  const weekDiffPaise = subPaise(thisWeekSpendPaise, sameWeekLastMonthSpendPaise);

  return (
    <div className="border-border/60 bg-card space-y-4 rounded-2xl border p-6">
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden>
          {STATUS_EMOJI[result.status]}
        </span>
        <div className="min-w-0">
          <p className="text-muted-foreground text-sm">{t(`status.${result.status}`)}</p>
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
