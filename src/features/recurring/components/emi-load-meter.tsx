import { useTranslations } from "next-intl";

import { ProgressRing } from "@/components/shared";

import type { EmiLoadResult } from "../service";

export interface EmiLoadMeterProps {
  result: EmiLoadResult;
}

const TONE_BY_LEVEL = {
  unknown: "neutral",
  ok: "positive",
  warning: "warning",
  hard: "negative",
} as const;

/** Total EMI outflow as a share of expected monthly income, per computeEmiLoadPercent. */
export function EmiLoadMeter({ result }: EmiLoadMeterProps) {
  const t = useTranslations("recurring.emiLoadMeter");

  return (
    <div className="border-border/60 bg-card flex items-center gap-4 rounded-2xl border p-5">
      <ProgressRing percent={result.level === "unknown" ? 0 : result.percent} tone={TONE_BY_LEVEL[result.level]} />
      <div className="space-y-1">
        <p className="text-sm font-semibold">{t("title")}</p>
        {result.level === "unknown" ? (
          <p className="text-muted-foreground text-xs">{t("noIncomeHint")}</p>
        ) : (
          <>
            <p className="text-muted-foreground text-xs">{t("hint")}</p>
            {result.level === "warning" && <p className="text-warning text-xs">{t("warning")}</p>}
            {result.level === "hard" && <p className="text-negative text-xs">{t("hard")}</p>}
          </>
        )}
      </div>
    </div>
  );
}
