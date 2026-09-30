"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { AccountPicker, AmountInput, CategoryPicker, DatePickerIST } from "@/components/shared";
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
import type { AccountSummary, CategorySummary } from "@/features/settings/queries";
import { useMediaQuery } from "@/hooks/use-media-query";
import { RECURRING_FREQUENCIES, RECURRING_KINDS } from "@/lib/db/enums";
import { todayIST } from "@/lib/dates";
import type { RecurringFrequency, RecurringKind } from "@/lib/db/models/recurring";

import { createRecurring } from "../actions";

// EMIs are created through the dedicated calculator dialog, not this form.
const MANUAL_KINDS = RECURRING_KINDS.filter((kind) => kind !== "emi");

export interface AddRecurringDialogProps {
  categories: CategorySummary[];
  accounts: AccountSummary[];
}

interface FormValue {
  title: string;
  amountPaise: number | null;
  categoryId: string | null;
  accountId: string | null;
  frequency: RecurringFrequency;
  dayOfMonth: number | null;
  startDate: Date;
  kind: RecurringKind;
}

function emptyForm(accountId: string | null): FormValue {
  return {
    title: "",
    amountPaise: null,
    categoryId: null,
    accountId,
    frequency: "monthly",
    dayOfMonth: 1,
    startDate: todayIST(),
    kind: "fixed",
  };
}

export function AddRecurringDialog({ categories, accounts }: AddRecurringDialogProps) {
  const t = useTranslations("recurring.addDialog");
  const tKinds = useTranslations("recurring.kinds");
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormValue>(() => emptyForm(accounts[0]?.id ?? null));
  const [pending, setPending] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setForm(emptyForm(accounts[0]?.id ?? null));
  }

  async function handleSubmit() {
    if (!form.amountPaise || !form.categoryId || !form.accountId) return;
    setPending(true);
    const result = await createRecurring({
      title: form.title,
      amountPaise: form.amountPaise,
      categoryId: form.categoryId,
      accountId: form.accountId,
      frequency: form.frequency,
      dayOfMonth: form.frequency === "monthly" ? (form.dayOfMonth ?? undefined) : undefined,
      startDate: form.startDate,
      kind: form.kind,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success(t("saved"));
    handleOpenChange(false);
  }

  const canSave = !!form.title.trim() && !!form.amountPaise && !!form.categoryId && !!form.accountId;

  const body = (
    <div className="flex flex-col gap-4 px-4 pb-4 sm:px-0">
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="recurring-title">
          {t("title")}
        </label>
        <Input
          id="recurring-title"
          value={form.title}
          onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">{t("amount")}</span>
        <AmountInput
          value={form.amountPaise}
          onChangePaise={(paise) => setForm((f) => ({ ...f, amountPaise: paise }))}
          aria-label={t("amount")}
        />
      </div>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">{t("kind")}</span>
        <Select value={form.kind} onValueChange={(value) => setForm((f) => ({ ...f, kind: value as RecurringKind }))}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MANUAL_KINDS.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {tKinds(kind)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">{t("frequency")}</span>
        <Select
          value={form.frequency}
          onValueChange={(value) => setForm((f) => ({ ...f, frequency: value as RecurringFrequency }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RECURRING_FREQUENCIES.map((frequency) => (
              <SelectItem key={frequency} value={frequency}>
                {t(`frequencies.${frequency}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {form.frequency === "monthly" && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="recurring-day-of-month">
            {t("dayOfMonth")}
          </label>
          <Input
            id="recurring-day-of-month"
            type="number"
            min={1}
            max={31}
            value={form.dayOfMonth ?? ""}
            onChange={(event) => setForm((f) => ({ ...f, dayOfMonth: Number(event.target.value) || null }))}
          />
        </div>
      )}
      <div className="space-y-1.5">
        <span className="text-sm font-medium">{t("startDate")}</span>
        <DatePickerIST value={form.startDate} onChange={(date) => setForm((f) => ({ ...f, startDate: date }))} />
      </div>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">{t("category")}</span>
        <CategoryPicker
          categories={categories}
          value={form.categoryId}
          onChange={(categoryId) => setForm((f) => ({ ...f, categoryId }))}
        />
      </div>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">{t("account")}</span>
        <AccountPicker accounts={accounts} value={form.accountId} onChange={(accountId) => setForm((f) => ({ ...f, accountId }))} />
      </div>
    </div>
  );

  const footer = (
    <>
      <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
        {t("cancel")}
      </Button>
      <Button type="button" disabled={pending || !canSave} onClick={() => void handleSubmit()}>
        {t("save")}
      </Button>
    </>
  );

  const trigger = (
    <Button type="button" variant="outline" onClick={() => setOpen(true)}>
      <Plus /> {t("trigger")}
    </Button>
  );

  if (isDesktop) {
    return (
      <>
        {trigger}
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("dialogTitle")}</DialogTitle>
              <DialogDescription>{t("dialogDescription")}</DialogDescription>
            </DialogHeader>
            {body}
            <DialogFooter>{footer}</DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      {trigger}
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t("dialogTitle")}</DrawerTitle>
          </DrawerHeader>
          {body}
          <DrawerFooter className="flex-row">{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
