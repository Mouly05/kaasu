"use client";

import { createElement } from "react";
import * as Icons from "lucide-react";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { ConfirmDialog, MoneyText, SwipeableRow } from "@/components/shared";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

import { deleteTransaction } from "../actions";
import type { TransactionSummary } from "../queries";

export interface ExpenseRowProps {
  transaction: TransactionSummary;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  accountName: string;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (transaction: TransactionSummary) => void;
}

function resolveIcon(name: string | null): Icons.LucideIcon {
  if (!name) return Icons.Circle;
  return (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Circle;
}

function CategoryGlyph({ icon, color }: { icon: string | null; color: string | null }) {
  return createElement(resolveIcon(icon), {
    className: "size-4",
    style: { color: color ?? undefined },
    "aria-hidden": true,
  });
}

/** One expense row: category icon, merchant/category, account/note, amount — swipe-to-edit/delete
 * on mobile, a checkbox + inline actions on desktop. */
export function ExpenseRow({
  transaction,
  categoryName,
  categoryIcon,
  categoryColor,
  accountName,
  selected,
  onToggleSelect,
  onEdit,
}: ExpenseRowProps) {
  const t = useTranslations("expenses.list");
  const isDesktop = useMediaQuery("(min-width: 768px)");

  async function handleDelete() {
    const result = await deleteTransaction({ id: transaction.id });
    if (!result.ok) toast.error(result.error.message);
  }

  const content = (
    <div className="flex items-center gap-3 py-3">
      {isDesktop && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(transaction.id)}
          aria-label={t("select")}
          className="size-4 shrink-0"
        />
      )}
      <span className="bg-muted grid size-9 shrink-0 place-items-center rounded-full">
        <CategoryGlyph icon={categoryIcon} color={categoryColor} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {transaction.merchant || categoryName || t("uncategorised")}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {[categoryName ?? t("uncategorised"), accountName, transaction.note]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <MoneyText
        paise={
          transaction.direction === "credit" ? transaction.amountPaise : -transaction.amountPaise
        }
        className="shrink-0 text-sm font-medium"
      />
      {isDesktop && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(transaction)}
            aria-label={t("edit")}
            className={cn("hover:bg-accent rounded p-1.5")}
          >
            <Pencil className="size-4" aria-hidden />
          </button>
          <ConfirmDialog
            trigger={
              <button
                type="button"
                aria-label={t("delete")}
                className="hover:bg-accent rounded p-1.5"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            }
            title={t("deleteConfirmTitle")}
            confirmLabel={t("delete")}
            onConfirm={handleDelete}
          />
        </div>
      )}
    </div>
  );

  if (isDesktop) return content;

  return (
    <SwipeableRow
      actions={[
        {
          label: t("edit"),
          icon: <Pencil className="size-4" aria-hidden />,
          onClick: () => onEdit(transaction),
        },
        {
          label: t("delete"),
          icon: <Trash2 className="size-4" aria-hidden />,
          onClick: () => void handleDelete(),
          tone: "destructive",
        },
      ]}
    >
      {content}
    </SwipeableRow>
  );
}
