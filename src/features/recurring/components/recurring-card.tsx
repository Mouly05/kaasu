"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { MoneyText } from "@/components/shared";
import { formatDay } from "@/lib/dates";

import { markEmiInstallmentPaid, markRecurringPaid, toggleAutoLog } from "../actions";
import type { RecurringWithStatus } from "../queries";

/** When this recurring item is an EMI, the installment its "mark as paid" button should settle. */
export interface EmiAction {
  emiId: string;
  /** null once every installment has already been paid. */
  nextInstallmentIndex: number | null;
}

export interface RecurringCardProps {
  item: RecurringWithStatus;
  emiAction?: EmiAction;
}

export function RecurringCard({ item, emiAction }: RecurringCardProps) {
  const t = useTranslations("recurring.card");
  const [pending, setPending] = useState(false);

  const dueLabel = !item.nextDueDate
    ? t("noDueDate")
    : item.daysUntilDue === 0
      ? t("dueToday")
      : item.daysUntilDue !== null && item.daysUntilDue > 0
        ? t("dueInDays", { days: item.daysUntilDue })
        : t("overdueByDays", { days: Math.abs(item.daysUntilDue ?? 0) });

  const emiFullyPaid = emiAction && emiAction.nextInstallmentIndex === null;

  async function handleMarkPaid() {
    setPending(true);
    const result =
      emiAction && emiAction.nextInstallmentIndex !== null
        ? await markEmiInstallmentPaid({
            emiId: emiAction.emiId,
            installmentIndex: emiAction.nextInstallmentIndex,
          })
        : await markRecurringPaid({ recurringId: item.id });
    setPending(false);
    if (!result.ok) toast.error(result.error.message);
  }

  async function handleAutoLogChange(checked: boolean) {
    const result = await toggleAutoLog({ id: item.id, autoLog: checked });
    if (!result.ok) toast.error(result.error.message);
  }

  return (
    <div className="border-border/60 bg-card flex flex-col gap-3 rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{item.title}</p>
          <p className="text-muted-foreground text-xs">
            {item.nextDueDate ? formatDay(item.nextDueDate) : null}
            {item.nextDueDate && " · "}
            {dueLabel}
          </p>
        </div>
        <MoneyText paise={item.amountPaise} className="shrink-0 font-semibold" colorBySign={false} />
      </div>

      <div className="flex items-center justify-between gap-2">
        {item.isPaidThisMonth ? (
          <Badge variant="outline" className="border-positive/30 text-positive">
            {t("paid")}
          </Badge>
        ) : emiFullyPaid ? (
          <Badge variant="secondary">{t("fullyPaid")}</Badge>
        ) : (
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => void handleMarkPaid()}>
            {t("markPaid")}
          </Button>
        )}

        <label className="text-muted-foreground flex items-center gap-2 text-xs">
          {t("autoLog")}
          <Switch
            checked={item.autoLog}
            onCheckedChange={(checked) => void handleAutoLogChange(checked)}
            aria-label={t("autoLog")}
          />
        </label>
      </div>
    </div>
  );
}
