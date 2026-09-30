"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared";
import { Button } from "@/components/ui/button";

import { bulkDeleteTransactions } from "../actions";

export interface BulkActionBarProps {
  selectedIds: Set<string>;
  onClear: () => void;
  onDeleted: (deletedIds: Set<string>) => void;
}

/** Desktop bulk-select action bar: shown once at least one row is checked. */
export function BulkActionBar({ selectedIds, onClear, onDeleted }: BulkActionBarProps) {
  const t = useTranslations("expenses.list");

  async function handleDelete() {
    const ids = [...selectedIds];
    const result = await bulkDeleteTransactions({ ids });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    onDeleted(new Set(ids));
  }

  return (
    <div className="border-border/60 bg-card flex items-center justify-between gap-3 rounded-2xl border p-3">
      <span className="text-sm font-medium">{t("selectedCount", { count: selectedIds.size })}</span>
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          {t("clearSelection")}
        </Button>
        <ConfirmDialog
          trigger={
            <Button type="button" variant="destructive" size="sm">
              {t("delete")}
            </Button>
          }
          title={t("bulkDeleteConfirmTitle")}
          confirmLabel={t("delete")}
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}
