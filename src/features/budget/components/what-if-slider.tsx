"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { MoneyText } from "@/components/shared";
import { Slider } from "@/components/ui/slider";
import { computeWhatIfFunding, type WhatIfCandidate } from "@/features/budget/service";
import { formatINR } from "@/lib/money";

export interface WhatIfSliderProps {
  minPaise: number;
  maxPaise: number;
  candidates: (WhatIfCandidate & { label: string })[];
}

/** "If you get the max, here's where the extra goes" — funds want/deferred lines in priority order as the slider moves. */
export function WhatIfSlider({ minPaise, maxPaise, candidates }: WhatIfSliderProps) {
  const t = useTranslations("budget.whatIf");
  const [salaryPaise, setSalaryPaise] = useState(minPaise);

  const extraPaise = Math.max(salaryPaise - minPaise, 0);
  const funding = useMemo(() => computeWhatIfFunding(candidates, extraPaise), [candidates, extraPaise]);
  const fundingById = new Map(funding.map((f) => [f.id, f]));

  if (maxPaise <= minPaise) return null;

  return (
    <section className="border-border/60 space-y-4 rounded-2xl border p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">{t("title")}</h2>
        <MoneyText paise={salaryPaise} colorBySign={false} className="text-sm font-medium" />
      </div>
      <Slider
        value={[salaryPaise]}
        min={minPaise}
        max={maxPaise}
        step={100}
        onValueChange={([value]) => setSalaryPaise(value ?? minPaise)}
        aria-label={t("sliderLabel")}
      />
      <div className="text-muted-foreground flex justify-between text-xs">
        <span>{formatINR(minPaise, { compact: true })}</span>
        <span>{formatINR(maxPaise, { compact: true })}</span>
      </div>

      {candidates.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("noCandidates")}</p>
      ) : (
        <ul className="space-y-1.5">
          {candidates.map((candidate) => {
            const result = fundingById.get(candidate.id);
            const fullyFunded = result?.fullyFunded ?? false;
            const fundedPaise = result?.fundedPaise ?? 0;
            return (
              <li key={candidate.id} className="flex items-center justify-between text-sm">
                <span className={fullyFunded ? "" : fundedPaise > 0 ? "text-muted-foreground" : "text-muted-foreground/60"}>
                  {candidate.label}
                </span>
                <span className="flex items-center gap-2">
                  <MoneyText paise={candidate.plannedPaise} colorBySign={false} className="text-xs" />
                  <span className={fullyFunded ? "text-positive text-xs font-medium" : "text-muted-foreground text-xs"}>
                    {fullyFunded
                      ? t("funded")
                      : fundedPaise > 0
                        ? t("partiallyFunded", { amount: formatINR(fundedPaise) })
                        : t("notFunded")}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
