"use client";

import { useState, type FormEvent } from "react";
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
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { submitQuickAdd } from "@/features/expenses/actions";
import type { AccountSummary, CategorySummary } from "@/features/settings/queries";
import { useMediaQuery } from "@/hooks/use-media-query";
import { todayIST } from "@/lib/dates";

import { AccountPicker } from "./account-picker";
import { AmountInput } from "./amount-input";
import { CategoryPicker } from "./category-picker";
import { DatePickerIST } from "./date-picker-ist";

export interface QuickAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategorySummary[];
  accounts: AccountSummary[];
}

function emptyForm() {
  return {
    amountPaise: null as number | null,
    categoryId: null as string | null,
    accountId: null as string | null,
    note: "",
    date: todayIST(),
  };
}

export function QuickAddSheet({ open, onOpenChange, categories, accounts }: QuickAddSheetProps) {
  const t = useTranslations("shell.quickAdd");
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [form, setForm] = useState(emptyForm);
  const [pending, setPending] = useState(false);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) setForm(emptyForm());
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.amountPaise || !form.accountId) return;
    setPending(true);
    const result = await submitQuickAdd({
      amountPaise: form.amountPaise,
      direction: "debit",
      categoryId: form.categoryId ?? undefined,
      accountId: form.accountId,
      note: form.note || undefined,
      date: form.date,
      source: "manual",
    });
    setPending(false);
    if (result.ok) {
      toast.success(t("comingSoon"));
      handleOpenChange(false);
    } else {
      toast.error(result.error.message);
    }
  }

  const body = (
    <form
      id="quick-add-form"
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 px-4 pb-4 sm:px-0"
    >
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="quick-add-amount">
          {t("amount")}
        </label>
        <AmountInput
          id="quick-add-amount"
          value={form.amountPaise}
          onChangePaise={(paise) => setForm((f) => ({ ...f, amountPaise: paise }))}
          aria-label={t("amount")}
        />
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
        <AccountPicker
          accounts={accounts}
          value={form.accountId}
          onChange={(accountId) => setForm((f) => ({ ...f, accountId }))}
        />
      </div>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">{t("date")}</span>
        <DatePickerIST
          value={form.date}
          onChange={(date) => setForm((f) => ({ ...f, date }))}
          aria-label={t("date")}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="quick-add-note">
          {t("note")}
        </label>
        <Textarea
          id="quick-add-note"
          value={form.note}
          onChange={(event) => setForm((f) => ({ ...f, note: event.target.value }))}
          rows={2}
        />
      </div>
    </form>
  );

  const footer = (
    <>
      <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
        {t("cancel")}
      </Button>
      <Button
        type="submit"
        form="quick-add-form"
        disabled={pending || !form.amountPaise || !form.accountId}
      >
        {t("save")}
      </Button>
    </>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          {body}
          <DialogFooter>{footer}</DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t("title")}</DrawerTitle>
          <DrawerDescription>{t("description")}</DrawerDescription>
        </DrawerHeader>
        {body}
        <DrawerFooter className="flex-row">{footer}</DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
