"use client";

import type { FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AccountSummary, CategorySummary } from "@/features/settings/queries";

import { AccountPicker } from "./account-picker";
import { AmountInput } from "./amount-input";
import { CategoryPicker } from "./category-picker";
import { DatePickerIST } from "./date-picker-ist";
import { TagInput } from "./tag-input";

export interface ExpenseFormValue {
  amountPaise: number | null;
  categoryId: string | null;
  accountId: string | null;
  merchant: string;
  note: string;
  date: Date;
  tags: string[];
}

export interface QuickAddStructuredFormProps {
  formId: string;
  value: ExpenseFormValue;
  onChange: (value: ExpenseFormValue) => void;
  categories: CategorySummary[];
  accounts: AccountSummary[];
  onSubmit: (event: FormEvent) => void;
}

/** The full structured fallback form: amount, category, account, date, merchant, note, tags. */
export function QuickAddStructuredForm({
  formId,
  value,
  onChange,
  categories,
  accounts,
  onSubmit,
}: QuickAddStructuredFormProps) {
  const t = useTranslations("shell.quickAdd");

  function patch(partial: Partial<ExpenseFormValue>) {
    onChange({ ...value, ...partial });
  }

  return (
    <form id={formId} onSubmit={onSubmit} className="flex flex-col gap-4 px-4 pb-4 sm:px-0">
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor={`${formId}-amount`}>
          {t("amount")}
        </label>
        <AmountInput
          id={`${formId}-amount`}
          value={value.amountPaise}
          onChangePaise={(paise) => patch({ amountPaise: paise })}
          aria-label={t("amount")}
        />
      </div>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">{t("category")}</span>
        <CategoryPicker
          categories={categories}
          value={value.categoryId}
          onChange={(categoryId) => patch({ categoryId })}
        />
      </div>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">{t("account")}</span>
        <AccountPicker
          accounts={accounts}
          value={value.accountId}
          onChange={(accountId) => patch({ accountId })}
        />
      </div>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">{t("date")}</span>
        <DatePickerIST
          value={value.date}
          onChange={(date) => patch({ date })}
          aria-label={t("date")}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor={`${formId}-merchant`}>
          {t("merchant")}
        </label>
        <Input
          id={`${formId}-merchant`}
          value={value.merchant}
          onChange={(event) => patch({ merchant: event.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor={`${formId}-note`}>
          {t("note")}
        </label>
        <Textarea
          id={`${formId}-note`}
          value={value.note}
          onChange={(event) => patch({ note: event.target.value })}
          rows={2}
        />
      </div>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">{t("tags")}</span>
        <TagInput
          value={value.tags}
          onChange={(tags) => patch({ tags })}
          placeholder={t("tagsPlaceholder")}
        />
      </div>
    </form>
  );
}
