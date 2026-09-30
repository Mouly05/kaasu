import { useTranslations } from "next-intl";

import { MoneyText } from "@/components/shared";
import type { AllocationStatus } from "@/features/budget/service";
import { cn } from "@/lib/utils";

export interface PlanSummaryBarProps {
  incomePaise: number;
  totalPlannedPaise: number;
  unallocatedPaise: number;
  status: AllocationStatus;
}

const STATUS_TEXT_CLASS: Record<AllocationStatus, string> = {
  balanced: "text-positive",
  under: "text-muted-foreground",
  over: "text-negative",
};

/** Sticky Income vs Planned vs Unallocated bar — "every rupee has a job" once unallocated hits ₹0. */
export function PlanSummaryBar({ incomePaise, totalPlannedPaise, unallocatedPaise, status }: PlanSummaryBarProps) {
  const t = useTranslations("budget.summaryBar");

  return (
    <div className="bg-card border-border/60 sticky top-0 z-10 rounded-2xl border p-4 shadow-sm">
      <div className="grid grid-cols-3 gap-3 text-center sm:text-left">
        <div>
          <p className="text-muted-foreground text-xs">{t("income")}</p>
          <MoneyText paise={incomePaise} colorBySign={false} className="text-lg font-semibold" />
        </div>
        <div>
          <p className="text-muted-foreground text-xs">{t("planned")}</p>
          <MoneyText paise={totalPlannedPaise} colorBySign={false} className="text-lg font-semibold" />
        </div>
        <div>
          <p className="text-muted-foreground text-xs">{t("unallocated")}</p>
          <MoneyText
            paise={unallocatedPaise}
            colorBySign={false}
            className={cn("text-lg font-semibold", STATUS_TEXT_CLASS[status])}
          />
        </div>
      </div>
      {status === "balanced" && <p className="text-positive mt-2 text-center text-xs sm:text-left">{t("balanced")}</p>}
      {status === "over" && <p className="text-negative mt-2 text-center text-xs sm:text-left">{t("over")}</p>}
    </div>
  );
}
