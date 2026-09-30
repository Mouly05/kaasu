"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import type { IncomeSource } from "@/lib/db/models/income";
import { cn } from "@/lib/utils";

const SOURCES: IncomeSource[] = ["salary", "reimbursement", "other"];

export interface IncomeSourcePickerProps {
  value: IncomeSource;
  onChange: (source: IncomeSource) => void;
}

/** A 3-way salary/reimbursement/other toggle for Quick Add's Income mode. */
export function IncomeSourcePicker({ value, onChange }: IncomeSourcePickerProps) {
  const t = useTranslations("shell.quickAdd.income");

  return (
    <div role="radiogroup" aria-label={t("source")} className="grid grid-cols-3 gap-2">
      {SOURCES.map((source) => (
        <Button
          key={source}
          type="button"
          role="radio"
          aria-checked={value === source}
          variant={value === source ? "default" : "outline"}
          onClick={() => onChange(source)}
          className={cn("h-11")}
        >
          {t(source)}
        </Button>
      ))}
    </div>
  );
}
