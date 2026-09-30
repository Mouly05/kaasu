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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { deleteTransaction, submitQuickAdd } from "@/features/expenses/actions";
import type { MerchantRuleSummary } from "@/features/expenses/queries";
import { submitIncome } from "@/features/salary/actions";
import type { AccountSummary, CategorySummary } from "@/features/settings/queries";
import { useLocalStorageValue, writeLocalStorageValue } from "@/hooks/use-local-storage-value";
import { useMediaQuery } from "@/hooks/use-media-query";
import { todayIST } from "@/lib/dates";
import type { IncomeSource } from "@/lib/db/models/income";

import { AmountInput } from "./amount-input";
import { DatePickerIST } from "./date-picker-ist";
import { IncomeSourcePicker } from "./income-source-picker";
import { QuickAddStructuredForm, type ExpenseFormValue } from "./quick-add-structured-form";
import { QuickAddTextBox, type QuickAddParsedValue } from "./quick-add-textbox";

export interface QuickAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategorySummary[];
  accounts: AccountSummary[];
  merchantRules: MerchantRuleSummary[];
}

type Mode = "smart" | "structured" | "income";

const LAST_CATEGORY_KEY = "kaasu:quickAdd:lastCategoryId";
const LAST_ACCOUNT_KEY = "kaasu:quickAdd:lastAccountId";

function emptyExpenseForm(accountId: string | null): ExpenseFormValue {
  return {
    amountPaise: null,
    categoryId: null,
    accountId,
    merchant: "",
    note: "",
    date: todayIST(),
    tags: [],
  };
}

interface IncomeFormValue {
  amountPaise: number | null;
  source: IncomeSource;
  note: string;
  date: Date;
}

function emptyIncomeForm(): IncomeFormValue {
  return { amountPaise: null, source: "salary", note: "", date: todayIST() };
}

export function QuickAddSheet({
  open,
  onOpenChange,
  categories,
  accounts,
  merchantRules,
}: QuickAddSheetProps) {
  const t = useTranslations("shell.quickAdd");
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const lastCategoryId = useLocalStorageValue(LAST_CATEGORY_KEY);
  const lastAccountId = useLocalStorageValue(LAST_ACCOUNT_KEY);

  const [mode, setMode] = useState<Mode>("smart");
  const [expenseForm, setExpenseForm] = useState<ExpenseFormValue>(() =>
    emptyExpenseForm(lastAccountId ?? accounts[0]?.id ?? null),
  );
  const [incomeForm, setIncomeForm] = useState<IncomeFormValue>(emptyIncomeForm);
  const [pending, setPending] = useState(false);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setMode("smart");
      setExpenseForm(emptyExpenseForm(lastAccountId ?? accounts[0]?.id ?? null));
      setIncomeForm(emptyIncomeForm());
    }
  }

  async function submitExpense() {
    if (!expenseForm.amountPaise || !expenseForm.accountId) return;
    setPending(true);
    const result = await submitQuickAdd({
      amountPaise: expenseForm.amountPaise,
      direction: "debit",
      categoryId: expenseForm.categoryId ?? undefined,
      accountId: expenseForm.accountId,
      merchant: expenseForm.merchant || undefined,
      note: expenseForm.note || undefined,
      date: expenseForm.date,
      tags: expenseForm.tags,
      source: "manual",
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }

    if (expenseForm.categoryId) writeLocalStorageValue(LAST_CATEGORY_KEY, expenseForm.categoryId);
    if (expenseForm.accountId) writeLocalStorageValue(LAST_ACCOUNT_KEY, expenseForm.accountId);

    const { id } = result.data;
    toast.success(t("saved"), {
      duration: 5000,
      action: { label: t("undo"), onClick: () => void deleteTransaction({ id }) },
    });
    handleOpenChange(false);
  }

  async function submitIncomeEntry() {
    if (!incomeForm.amountPaise) return;
    setPending(true);
    const result = await submitIncome({
      amountPaise: incomeForm.amountPaise,
      source: incomeForm.source,
      note: incomeForm.note || undefined,
      date: incomeForm.date,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success(t("incomeSaved"));
    handleOpenChange(false);
  }

  function handleExpenseSubmit(event: FormEvent) {
    event.preventDefault();
    void submitExpense();
  }

  function handleIncomeSubmit(event: FormEvent) {
    event.preventDefault();
    void submitIncomeEntry();
  }

  const smartValue: QuickAddParsedValue = {
    amountPaise: expenseForm.amountPaise,
    categoryId: expenseForm.categoryId,
    accountId: expenseForm.accountId,
    date: expenseForm.date,
    merchant: expenseForm.merchant || null,
  };

  const structuredFormId = "quick-add-structured-form";
  const incomeFormId = "quick-add-income-form";
  const canSaveExpense = !!expenseForm.amountPaise && !!expenseForm.accountId;
  const canSaveIncome = !!incomeForm.amountPaise;

  const body = (
    <div className="flex flex-col gap-4 px-4 pb-4 sm:px-0">
      <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="smart">{t("modes.smart")}</TabsTrigger>
          <TabsTrigger value="structured">{t("modes.structured")}</TabsTrigger>
          <TabsTrigger value="income">{t("modes.income")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {mode === "smart" && (
        <QuickAddTextBox
          categories={categories}
          accounts={accounts}
          merchantRules={merchantRules}
          lastUsedCategoryId={lastCategoryId}
          lastUsedAccountId={lastAccountId}
          value={smartValue}
          onChange={(next) =>
            setExpenseForm((form) => ({
              ...form,
              amountPaise: next.amountPaise,
              categoryId: next.categoryId,
              accountId: next.accountId,
              date: next.date,
              merchant: next.merchant ?? "",
            }))
          }
          onSubmit={() => void submitExpense()}
        />
      )}

      {mode === "structured" && (
        <QuickAddStructuredForm
          formId={structuredFormId}
          value={expenseForm}
          onChange={setExpenseForm}
          categories={categories}
          accounts={accounts}
          onSubmit={handleExpenseSubmit}
        />
      )}

      {mode === "income" && (
        <form id={incomeFormId} onSubmit={handleIncomeSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="quick-add-income-amount">
              {t("amount")}
            </label>
            <AmountInput
              id="quick-add-income-amount"
              value={incomeForm.amountPaise}
              onChangePaise={(paise) => setIncomeForm((form) => ({ ...form, amountPaise: paise }))}
              aria-label={t("amount")}
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-sm font-medium">{t("income.source")}</span>
            <IncomeSourcePicker
              value={incomeForm.source}
              onChange={(source) => setIncomeForm((form) => ({ ...form, source }))}
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-sm font-medium">{t("date")}</span>
            <DatePickerIST
              value={incomeForm.date}
              onChange={(date) => setIncomeForm((form) => ({ ...form, date }))}
              aria-label={t("date")}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="quick-add-income-note">
              {t("note")}
            </label>
            <Textarea
              id="quick-add-income-note"
              value={incomeForm.note}
              onChange={(event) => setIncomeForm((form) => ({ ...form, note: event.target.value }))}
              rows={2}
            />
          </div>
        </form>
      )}
    </div>
  );

  const activeFormId =
    mode === "structured" ? structuredFormId : mode === "income" ? incomeFormId : undefined;
  const canSave = mode === "income" ? canSaveIncome : canSaveExpense;

  const footer = (
    <>
      <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
        {t("cancel")}
      </Button>
      <Button
        type={activeFormId ? "submit" : "button"}
        form={activeFormId}
        onClick={activeFormId ? undefined : () => void submitExpense()}
        disabled={pending || !canSave}
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
