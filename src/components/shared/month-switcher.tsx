"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { formatMonthLabel, shiftMonthKey, type MonthKey } from "@/lib/dates";

export interface MonthSwitcherProps {
  value: MonthKey;
  onChange: (next: MonthKey) => void;
}

/** ← Oct 2026 → for stepping between IST calendar months. */
export function MonthSwitcher({ value, onChange }: MonthSwitcherProps) {
  const t = useTranslations("shared.monthSwitcher");

  return (
    <div className="inline-flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11"
        aria-label={t("previous")}
        onClick={() => onChange(shiftMonthKey(value, -1))}
      >
        <ChevronLeft />
      </Button>
      <span className="min-w-24 text-center text-sm font-medium tabular-nums">
        {formatMonthLabel(value)}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11"
        aria-label={t("next")}
        onClick={() => onChange(shiftMonthKey(value, 1))}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
