"use client";

import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { EmptyState, MoneyText } from "@/components/shared";
import { Button } from "@/components/ui/button";
import type { MonthlyPlanLineBucket } from "@/lib/db/models/monthly-plan";
import type { Paise } from "@/lib/money";
import { cn } from "@/lib/utils";

import type { PlanLine } from "../service";
import { PlanLineRow } from "./plan-line-row";

export interface WaterfallSectionProps {
  bucket: MonthlyPlanLineBucket;
  lines: { line: PlanLine; index: number }[];
  totalPaise: Paise;
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onDefer: (index: number) => void;
  onTogglePaid: (index: number) => void;
  onSwapPriority: (indexA: number, indexB: number) => void;
}

/** One waterfall bucket (Must/Debt/Save/EMI/Want/Buffer): a collapsible header + its lines, ordered by priority. */
export function WaterfallSection({
  bucket,
  lines,
  totalPaise,
  onAdd,
  onEdit,
  onDelete,
  onDefer,
  onTogglePaid,
  onSwapPriority,
}: WaterfallSectionProps) {
  const t = useTranslations("budget.buckets");
  const tPlanner = useTranslations("budget.planner");
  const [open, setOpen] = useState(true);

  const ordered = [...lines].sort((a, b) => a.line.priority - b.line.priority);

  return (
    <section className="border-border/60 overflow-hidden rounded-2xl border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="bg-muted/40 hover:bg-muted/60 flex w-full items-center justify-between px-4 py-3 text-left transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <ChevronDown className={cn("size-4 transition-transform", !open && "-rotate-90")} aria-hidden />
          {t(bucket)}
        </span>
        <MoneyText paise={totalPaise} colorBySign={false} className="text-sm font-medium" />
      </button>
      {open && (
        <div>
          {ordered.length === 0 ? (
            <div className="p-4">
              <EmptyState title={tPlanner("emptyBucket")} />
            </div>
          ) : (
            ordered.map(({ line, index }, position) => (
              <PlanLineRow
                key={index}
                line={line}
                canMoveUp={position > 0}
                canMoveDown={position < ordered.length - 1}
                onMoveUp={() => onSwapPriority(index, ordered[position - 1]!.index)}
                onMoveDown={() => onSwapPriority(index, ordered[position + 1]!.index)}
                onEdit={() => onEdit(index)}
                onDelete={() => onDelete(index)}
                onDefer={() => onDefer(index)}
                onTogglePaid={() => onTogglePaid(index)}
              />
            ))
          )}
          <div className="p-2">
            <Button type="button" variant="ghost" size="sm" className="w-full" onClick={onAdd}>
              <Plus className="size-4" /> {tPlanner("addLine")}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
