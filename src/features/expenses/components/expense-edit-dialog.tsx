"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  QuickAddStructuredForm,
  type ExpenseFormValue,
} from "@/components/shared/quick-add-structured-form";
import type { AccountSummary, CategorySummary } from "@/features/settings/queries";

import { updateTransaction } from "../actions";
import type { TransactionSummary } from "../queries";

export interface ExpenseEditDialogProps {
  transaction: TransactionSummary;
  categories: CategorySummary[];
  accounts: AccountSummary[];
  onClose: () => void;
}

function toFormValue(transaction: TransactionSummary): ExpenseFormValue {
  return {
    amountPaise: transaction.amountPaise,
    categoryId: transaction.categoryId,
    accountId: transaction.accountId,
    merchant: transaction.merchant ?? "",
    note: transaction.note ?? "",
    date: transaction.date,
    tags: transaction.tags,
  };
}

const FORM_ID = "expense-edit-form";

/** Edits a single transaction, reusing Quick Add's structured form fields. */
export function ExpenseEditDialog({
  transaction,
  categories,
  accounts,
  onClose,
}: ExpenseEditDialogProps) {
  const t = useTranslations("expenses.list");
  const [value, setValue] = useState<ExpenseFormValue>(() => toFormValue(transaction));
  const [pending, setPending] = useState(false);
  const canSave = !!value.amountPaise && !!value.accountId;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    setPending(true);
    const result = await updateTransaction({
      id: transaction.id,
      amountPaise: value.amountPaise ?? undefined,
      categoryId: value.categoryId ?? undefined,
      accountId: value.accountId ?? undefined,
      merchant: value.merchant || undefined,
      note: value.note || undefined,
      date: value.date,
      tags: value.tags,
    });
    setPending(false);
    if (result.ok) {
      toast.success(t("updated"));
      onClose();
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editTitle")}</DialogTitle>
        </DialogHeader>
        <QuickAddStructuredForm
          formId={FORM_ID}
          value={value}
          onChange={setValue}
          categories={categories}
          accounts={accounts}
          onSubmit={handleSubmit}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={pending || !canSave}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
