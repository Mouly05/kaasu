"use client";

import { ChevronDown, ChevronUp, Clock, Pencil, SkipForward, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { MoneyText, SwipeableRow } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PlanLine } from "@/features/budget/service";
import { cn } from "@/lib/utils";

export interface PlanLineRowProps {
  line: PlanLine;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDefer: () => void;
  onTogglePaid: () => void;
}

/** One waterfall line: priority controls, amount, status, edit/delete, and swipe-to-defer on mobile. */
export function PlanLineRow({
  line,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
  onDefer,
  onTogglePaid,
}: PlanLineRowProps) {
  const t = useTranslations("budget.planner");
  const isDeferred = line.status === "deferred";

  const row = (
    <div className="border-border/60 bg-card flex items-center gap-2 border-b px-3 py-2.5 last:border-b-0">
      <div className="flex flex-col">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6"
          disabled={!canMoveUp}
          aria-label={t("moveUp")}
          onClick={onMoveUp}
        >
          <ChevronUp className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6"
          disabled={!canMoveDown}
          aria-label={t("moveDown")}
          onClick={onMoveDown}
        >
          <ChevronDown className="size-3.5" />
        </Button>
      </div>

      <button
        type="button"
        onClick={onTogglePaid}
        aria-pressed={line.status === "paid"}
        aria-label={t("togglePaid")}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs",
          line.status === "paid" ? "border-positive bg-positive/10 text-positive" : "border-border",
        )}
      >
        {line.status === "paid" ? "✓" : ""}
      </button>

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", isDeferred && "text-muted-foreground line-through")}>
          {line.label}
        </p>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">
            {t("priorityLabel", { priority: line.priority })}
          </Badge>
          {isDeferred && line.deferredTo && (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Clock className="size-2.5" />
              {t("deferredToLabel", { month: line.deferredTo })}
            </Badge>
          )}
          {line.deferredFrom && (
            <Badge variant="outline" className="text-[10px]">
              {t("deferredFromLabel", { month: line.deferredFrom })}
            </Badge>
          )}
        </div>
      </div>

      <MoneyText paise={line.plannedPaise} colorBySign={false} className="shrink-0 text-sm font-medium" />

      <div className="hidden shrink-0 items-center gap-0.5 sm:flex">
        {!isDeferred && (
          <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={t("defer")} onClick={onDefer}>
            <SkipForward className="size-4" />
          </Button>
        )}
        <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={t("edit")} onClick={onEdit}>
          <Pencil className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={t("delete")} onClick={onDelete}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden sm:block">{row}</div>
      <div className="sm:hidden">
        <SwipeableRow
          actions={[
            ...(isDeferred ? [] : [{ label: t("defer"), icon: <SkipForward className="size-4" />, onClick: onDefer }]),
            { label: t("edit"), icon: <Pencil className="size-4" />, onClick: onEdit },
            { label: t("delete"), icon: <Trash2 className="size-4" />, onClick: onDelete, tone: "destructive" as const },
          ]}
        >
          {row}
        </SwipeableRow>
      </div>
    </>
  );
}
