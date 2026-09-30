import { useTranslations } from "next-intl";

import { MoneyText } from "@/components/shared";
import { Progress } from "@/components/ui/progress";
import type { BudgetVsActualRow } from "@/features/budget/service";
import { cn } from "@/lib/utils";

export interface BudgetVsActualListProps {
  rows: BudgetVsActualRow[];
}

const PROGRESS_TONE_CLASS: Record<BudgetVsActualRow["status"], string> = {
  under: "[&>[data-slot=progress-indicator]]:bg-positive",
  tight: "[&>[data-slot=progress-indicator]]:bg-warning",
  over: "[&>[data-slot=progress-indicator]]:bg-negative",
};

/** Per-line planned-vs-actual progress bars, colour-coded under/tight/over. */
export function BudgetVsActualList({ rows }: BudgetVsActualListProps) {
  const t = useTranslations("budget.vsActual");

  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  return (
    <ul className="space-y-3">
      {rows.map((row, index) => (
        <li key={`${row.label}-${index}`} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className={cn("truncate font-medium", row.status === "over" && "text-negative")}>{row.label}</span>
            <span className="text-muted-foreground shrink-0 text-xs">
              <MoneyText paise={row.actualPaise} colorBySign={false} /> / <MoneyText paise={row.plannedPaise} colorBySign={false} />
            </span>
          </div>
          <Progress value={Math.min(row.percent, 100)} className={PROGRESS_TONE_CLASS[row.status]} />
        </li>
      ))}
    </ul>
  );
}
