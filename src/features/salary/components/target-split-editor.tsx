"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { updateBudgetTargets } from "@/features/salary/actions";
import type { BudgetTargetPercent } from "@/features/salary/service";

export interface TargetSplitEditorProps {
  target: BudgetTargetPercent;
}

const FIELDS: { key: keyof BudgetTargetPercent; labelKey: "needs" | "wants" | "savings" | "debt" }[] = [
  { key: "needsTargetPct", labelKey: "needs" },
  { key: "wantsTargetPct", labelKey: "wants" },
  { key: "savingsTargetPct", labelKey: "savings" },
  { key: "debtTargetPct", labelKey: "debt" },
];

/** Edits the salary analyser's needs/wants/savings/debt target split (defaults to 50/30/20/0, must sum to 100). */
export function TargetSplitEditor({ target }: TargetSplitEditorProps) {
  const t = useTranslations("salary.split");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(target);
  const [pending, setPending] = useState(false);

  const total = form.needsTargetPct + form.wantsTargetPct + form.savingsTargetPct + form.debtTargetPct;
  const canSave = total === 100;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setForm(target);
  }

  async function handleSave() {
    setPending(true);
    const result = await updateBudgetTargets(form);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success(t("saved"));
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={t("editTarget")}>
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editTarget")}</DialogTitle>
          <DialogDescription>{t("editTargetDescription")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {FIELDS.map(({ key, labelKey }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium" htmlFor={`target-${key}`}>
                {t(labelKey)}
              </label>
              <div className="flex items-center gap-1.5">
                <Input
                  id={`target-${key}`}
                  type="number"
                  min={0}
                  max={100}
                  className="w-20"
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) || 0 }))}
                />
                <span className="text-muted-foreground text-sm">%</span>
              </div>
            </div>
          ))}
          <p className={total === 100 ? "text-muted-foreground text-xs" : "text-negative text-xs"}>
            {t("total", { total })}
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button type="button" disabled={!canSave || pending} onClick={() => void handleSave()}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
