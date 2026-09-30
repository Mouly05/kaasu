"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { AmountInput } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateSalaryPreferences } from "@/features/salary/actions";
import type { SalaryPreferences } from "@/features/salary/queries";

export interface SalaryProfileFormProps {
  initial: SalaryPreferences;
}

/** Settings' Salary section: payday and the min–max range the planner defaults to (plans on the minimum). */
export function SalaryProfileForm({ initial }: SalaryProfileFormProps) {
  const t = useTranslations("salary.profile");
  const [payday, setPayday] = useState(initial.payday);
  const [salaryMinPaise, setSalaryMinPaise] = useState(initial.salaryMinPaise);
  const [salaryMaxPaise, setSalaryMaxPaise] = useState(initial.salaryMaxPaise);
  const [pending, setPending] = useState(false);

  const canSave = salaryMinPaise == null || salaryMaxPaise == null || salaryMinPaise <= salaryMaxPaise;

  async function handleSave() {
    if (!canSave) return;
    setPending(true);
    const result = await updateSalaryPreferences({
      payday: payday ?? undefined,
      salaryMinPaise: salaryMinPaise ?? undefined,
      salaryMaxPaise: salaryMaxPaise ?? undefined,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success(t("saved"));
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap">
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="salary-payday">
          {t("payday")}
        </label>
        <Input
          id="salary-payday"
          type="number"
          min={1}
          max={31}
          className="w-24"
          value={payday ?? ""}
          onChange={(e) => setPayday(e.target.value ? Number(e.target.value) : null)}
        />
      </div>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">{t("min")}</span>
        <AmountInput value={salaryMinPaise} onChangePaise={setSalaryMinPaise} aria-label={t("min")} />
      </div>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">{t("max")}</span>
        <AmountInput value={salaryMaxPaise} onChangePaise={setSalaryMaxPaise} aria-label={t("max")} />
      </div>
      <Button type="button" disabled={!canSave || pending} onClick={() => void handleSave()}>
        {t("save")}
      </Button>
      {!canSave && <p className="text-negative w-full text-xs">{t("rangeError")}</p>}
    </div>
  );
}
