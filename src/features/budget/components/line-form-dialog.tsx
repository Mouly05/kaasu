"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { AmountInput, CategoryPicker } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CategorySummary } from "@/features/settings/queries";
import { useMediaQuery } from "@/hooks/use-media-query";
import { MONTHLY_PLAN_LINE_BUCKETS } from "@/lib/db/enums";
import type { MonthlyPlanLineBucket } from "@/lib/db/models/monthly-plan";

import type { PlanLine } from "../service";

export interface LineFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategorySummary[];
  initial: PlanLine | null;
  defaultBucket: MonthlyPlanLineBucket;
  onSave: (line: PlanLine) => void;
}

function toFormValue(line: PlanLine | null, defaultBucket: MonthlyPlanLineBucket) {
  return {
    label: line?.label ?? "",
    plannedPaise: line?.plannedPaise ?? null,
    bucket: line?.bucket ?? defaultBucket,
    priority: line?.priority ?? 3,
    categoryId: line?.categoryId ?? null,
  };
}

/** Add or edit a plan line — manual lines have no recurring/debt/goal provenance link. */
export function LineFormDialog({ open, onOpenChange, categories, initial, defaultBucket, onSave }: LineFormDialogProps) {
  const t = useTranslations("budget.lineForm");
  const tBuckets = useTranslations("budget.buckets");
  const isDesktop = useMediaQuery("(min-width: 768px)");
  // Remounted by `key` (see PlannerClient) each time it's opened for a
  // different line, so this initializer is all that's needed to reset the form.
  const [form, setForm] = useState(() => toFormValue(initial, defaultBucket));

  const canSave = !!form.label.trim() && !!form.plannedPaise;

  function handleSave() {
    if (!canSave || !form.plannedPaise) return;
    onSave({
      categoryId: form.categoryId,
      label: form.label.trim(),
      plannedPaise: form.plannedPaise,
      priority: form.priority,
      bucket: form.bucket,
      status: initial?.status ?? "planned",
      deferredTo: initial?.deferredTo,
      deferredFrom: initial?.deferredFrom,
      recurringId: initial?.recurringId,
      debtId: initial?.debtId,
      goalId: initial?.goalId,
    });
    onOpenChange(false);
  }

  const body = (
    <div className="flex flex-col gap-4 px-4 pb-4 sm:px-0">
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="line-label">
          {t("label")}
        </label>
        <Input id="line-label" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
      </div>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">{t("amount")}</span>
        <AmountInput
          value={form.plannedPaise}
          onChangePaise={(paise) => setForm((f) => ({ ...f, plannedPaise: paise }))}
          aria-label={t("amount")}
        />
      </div>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">{t("bucket")}</span>
        <Select value={form.bucket} onValueChange={(value) => setForm((f) => ({ ...f, bucket: value as MonthlyPlanLineBucket }))}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHLY_PLAN_LINE_BUCKETS.map((bucket) => (
              <SelectItem key={bucket} value={bucket}>
                {tBuckets(bucket)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">{t("priority")}</span>
        <Select
          value={String(form.priority)}
          onValueChange={(value) => setForm((f) => ({ ...f, priority: Number(value) }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5].map((priority) => (
              <SelectItem key={priority} value={String(priority)}>
                {t("priorityLabel", { priority })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">{t("category")}</span>
        <CategoryPicker
          categories={categories}
          value={form.categoryId}
          onChange={(categoryId) => setForm((f) => ({ ...f, categoryId }))}
        />
      </div>
    </div>
  );

  const footer = (
    <>
      <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
        {t("cancel")}
      </Button>
      <Button type="button" disabled={!canSave} onClick={handleSave}>
        {t("save")}
      </Button>
    </>
  );

  const title = initial ? t("editTitle") : t("addTitle");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          {body}
          <DialogFooter>{footer}</DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        {body}
        <DrawerFooter className="flex-row">{footer}</DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
