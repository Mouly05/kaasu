import { useTranslations } from "next-intl";

import type { BudgetSplit, BudgetTargetPercent } from "@/features/salary/service";
import { cn } from "@/lib/utils";

export interface BudgetSplitCardProps {
  actual: BudgetSplit;
  target: BudgetTargetPercent;
}

type Bucket = "needs" | "wants" | "savings" | "debt";
// Being over target is the bad direction for spend buckets; for savings, being under is bad.
const OVER_IS_BAD: Record<Bucket, boolean> = { needs: true, wants: true, savings: false, debt: true };

function toneFor(bucket: Bucket, actualPct: number, targetPct: number): "positive" | "warning" | "negative" {
  const diff = actualPct - targetPct;
  const badDirection = OVER_IS_BAD[bucket] ? diff > 0 : diff < 0;
  const magnitude = Math.abs(diff);
  if (!badDirection || magnitude <= 3) return "positive";
  return magnitude <= 10 ? "warning" : "negative";
}

const TONE_BAR_CLASS = { positive: "bg-positive", warning: "bg-warning", negative: "bg-negative" };

/** Actual vs target for each of the four budget buckets: a filled bar plus a target tick. */
export function BudgetSplitCard({ actual, target }: BudgetSplitCardProps) {
  const t = useTranslations("salary.split");

  const rows: { bucket: Bucket; actualPct: number; targetPct: number }[] = [
    { bucket: "needs", actualPct: actual.needsPercent, targetPct: target.needsTargetPct },
    { bucket: "wants", actualPct: actual.wantsPercent, targetPct: target.wantsTargetPct },
    { bucket: "savings", actualPct: actual.savingsPercent, targetPct: target.savingsTargetPct },
    { bucket: "debt", actualPct: actual.debtPercent, targetPct: target.debtTargetPct },
  ];

  return (
    <section className="border-border/60 space-y-4 rounded-2xl border p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">{t("title")}</h2>
        <span className="text-muted-foreground text-xs">{t("savingsRate", { rate: Math.round(actual.savingsRatePercent) })}</span>
      </div>
      <div className="space-y-3">
        {rows.map(({ bucket, actualPct, targetPct }) => {
          const tone = toneFor(bucket, actualPct, targetPct);
          const clampedActual = Math.min(Math.max(actualPct, 0), 100);
          const clampedTarget = Math.min(Math.max(targetPct, 0), 100);
          return (
            <div key={bucket} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{t(bucket)}</span>
                <span className="text-muted-foreground tabular-nums">
                  {Math.round(actualPct)}% <span className="text-muted-foreground/70">/ {targetPct}%</span>
                </span>
              </div>
              <div className="bg-muted relative h-2 w-full overflow-hidden rounded-full">
                <div
                  className={cn("h-full rounded-full transition-all", TONE_BAR_CLASS[tone])}
                  style={{ width: `${clampedActual}%` }}
                />
                <div
                  className="bg-foreground/60 absolute top-0 h-full w-0.5"
                  style={{ left: `${clampedTarget}%` }}
                  aria-hidden
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
