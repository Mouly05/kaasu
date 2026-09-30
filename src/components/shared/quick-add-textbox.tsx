"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import type { MerchantRuleSummary } from "@/features/expenses/queries";
import {
  parseQuickAddText,
  type ParserAccount,
  type ParserCategory,
} from "@/features/expenses/parser";
import type { AccountSummary, CategorySummary } from "@/features/settings/queries";
import { formatDay } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";

import { AccountPicker } from "./account-picker";
import { AmountInput } from "./amount-input";
import { CategoryPicker } from "./category-picker";
import { DatePickerIST } from "./date-picker-ist";

export interface QuickAddParsedValue {
  amountPaise: number | null;
  categoryId: string | null;
  accountId: string | null;
  date: Date;
  merchant: string | null;
}

export interface QuickAddTextBoxProps {
  categories: CategorySummary[];
  accounts: AccountSummary[];
  merchantRules: MerchantRuleSummary[];
  lastUsedCategoryId: string | null;
  lastUsedAccountId: string | null;
  value: QuickAddParsedValue;
  onChange: (value: QuickAddParsedValue) => void;
  onSubmit: () => void;
}

type EditableField = "amount" | "category" | "account" | "date" | "merchant";

/** Parses whatever's typed into a structured, editable draft — see `parseQuickAddText`. */
export function parseTextForQuickAdd(
  text: string,
  options: Omit<QuickAddTextBoxProps, "value" | "onChange" | "onSubmit">,
): QuickAddParsedValue {
  const draft = parseQuickAddText(text, {
    categories: options.categories as ParserCategory[],
    accounts: options.accounts as ParserAccount[],
    merchantRules: options.merchantRules,
    lastUsedCategoryId: options.lastUsedCategoryId,
    lastUsedAccountId: options.lastUsedAccountId,
  });
  return {
    amountPaise: draft.amountPaise.value,
    categoryId: draft.categoryId.value,
    accountId: draft.accountId.value,
    date: draft.date.value ?? new Date(),
    merchant: draft.merchant.value,
  };
}

/**
 * Quick Add's smart text box: type free text, see it parsed live into
 * tappable chips. Tapping a chip pins that field so further typing doesn't
 * silently overwrite a manual correction.
 */
export function QuickAddTextBox({
  categories,
  accounts,
  merchantRules,
  lastUsedCategoryId,
  lastUsedAccountId,
  value,
  onChange,
  onSubmit,
}: QuickAddTextBoxProps) {
  const t = useTranslations("shell.quickAdd");
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<EditableField | null>(null);
  const [pinned, setPinned] = useState<Partial<Record<EditableField, true>>>({});

  function handleTextChange(next: string) {
    setText(next);
    const parsed = parseTextForQuickAdd(next, {
      categories,
      accounts,
      merchantRules,
      lastUsedCategoryId,
      lastUsedAccountId,
    });
    onChange({
      amountPaise: pinned.amount ? value.amountPaise : parsed.amountPaise,
      categoryId: pinned.category ? value.categoryId : parsed.categoryId,
      accountId: pinned.account ? value.accountId : parsed.accountId,
      date: pinned.date ? value.date : parsed.date,
      merchant: pinned.merchant ? value.merchant : parsed.merchant,
    });
  }

  function pinAndClose<K extends keyof QuickAddParsedValue>(
    field: EditableField,
    key: K,
    next: QuickAddParsedValue[K],
  ) {
    setPinned((prev) => ({ ...prev, [field]: true }));
    onChange({ ...value, [key]: next });
    setEditing(null);
  }

  const categoryName = categories.find((c) => c.id === value.categoryId)?.name ?? null;
  const accountName = accounts.find((a) => a.id === value.accountId)?.name ?? null;

  function chip(field: EditableField, label: string, isEmpty: boolean) {
    return (
      <button
        key={field}
        type="button"
        onClick={() => setEditing(editing === field ? null : field)}
        className={cn(
          "focus-visible:ring-ring/50 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
          isEmpty
            ? "border-border/60 text-muted-foreground border-dashed"
            : "border-primary/40 bg-primary/5",
          editing === field && "ring-ring/50 ring-2",
        )}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <Input
        value={text}
        onChange={(event) => handleTextChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
        }}
        placeholder={t("smartPlaceholder")}
        aria-label={t("smartPlaceholder")}
        autoFocus
      />
      <div className="flex flex-wrap gap-1.5">
        {chip(
          "amount",
          value.amountPaise != null ? formatINR(value.amountPaise) : t("chips.amount"),
          value.amountPaise == null,
        )}
        {chip("category", categoryName ?? t("chips.category"), categoryName == null)}
        {chip("account", accountName ?? t("chips.account"), accountName == null)}
        {chip("date", formatDay(value.date), false)}
        {value.merchant && chip("merchant", value.merchant, false)}
      </div>
      {editing === "amount" && (
        <AmountInput
          value={value.amountPaise}
          onChangePaise={(paise) => pinAndClose("amount", "amountPaise", paise)}
          aria-label={t("amount")}
        />
      )}
      {editing === "category" && (
        <CategoryPicker
          categories={categories}
          value={value.categoryId}
          onChange={(categoryId) => pinAndClose("category", "categoryId", categoryId)}
        />
      )}
      {editing === "account" && (
        <AccountPicker
          accounts={accounts}
          value={value.accountId}
          onChange={(accountId) => pinAndClose("account", "accountId", accountId)}
        />
      )}
      {editing === "date" && (
        <DatePickerIST
          value={value.date}
          onChange={(date) => pinAndClose("date", "date", date)}
          aria-label={t("date")}
        />
      )}
      {editing === "merchant" && (
        <Input
          value={value.merchant ?? ""}
          onChange={(event) => {
            setPinned((prev) => ({ ...prev, merchant: true }));
            onChange({ ...value, merchant: event.target.value || null });
          }}
          onBlur={() => setEditing(null)}
          aria-label={t("merchant")}
          autoFocus
        />
      )}
    </div>
  );
}
