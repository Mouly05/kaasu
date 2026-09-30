import { useTranslations } from "next-intl";

import { StatCard } from "@/components/shared";

export interface RunwayCardProps {
  runwayMonths: number;
  emergencyFundSavedPaise: number;
}

/** "Months of runway" if income stopped today, from the emergency-fund goal(s) and essential monthly spend. */
export function RunwayCard({ runwayMonths, emergencyFundSavedPaise }: RunwayCardProps) {
  const t = useTranslations("salary.runway");

  return (
    <StatCard
      label={t("label")}
      value={t("months", { months: runwayMonths })}
      hint={emergencyFundSavedPaise > 0 ? t("hint") : t("noFundHint")}
    />
  );
}
