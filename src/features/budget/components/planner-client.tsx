"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { MonthSwitcher } from "@/components/shared";
import { Button } from "@/components/ui/button";
import type { CategorySummary } from "@/features/settings/queries";
import { shiftMonthKey, type MonthKey } from "@/lib/dates";
import type { MonthlyPlanLineBucket } from "@/lib/db/models/monthly-plan";

import { autoDraftPlan, copyLastMonthPlan, deferPlanLine, saveMonthlyPlanLines } from "../actions";
import {
  computeBucketTotals,
  computePlanSummary,
  swapLinePriority,
  type BudgetVsActualRow,
  type PlanLine,
  type RolloverCandidate,
} from "../service";
import { BudgetVsActualList } from "./budget-vs-actual-list";
import { LineFormDialog } from "./line-form-dialog";
import { PlanSummaryBar } from "./plan-summary-bar";
import { RolloverDialog } from "./rollover-dialog";
import { WaterfallSection } from "./waterfall-section";
import { WhatIfSlider } from "./what-if-slider";

const BUCKET_ORDER: MonthlyPlanLineBucket[] = ["must", "debt", "save", "emi", "want", "buffer"];

export interface PlannerClientProps {
  monthKey: MonthKey;
  initialLines: PlanLine[];
  expectedIncomePaise: number;
  categories: CategorySummary[];
  hasPreviousMonthPlan: boolean;
  salaryMinPaise: number | null;
  salaryMaxPaise: number | null;
  goals: { id: string; title: string }[];
  budgetVsActualRows: BudgetVsActualRow[];
  rolloverCandidates: RolloverCandidate[];
  rolloverTotalPaise: number;
}

/** Orchestrates the month planner: local plan state, every mutation, and the waterfall/summary/what-if/rollover UI. */
export function PlannerClient({
  monthKey,
  initialLines,
  expectedIncomePaise,
  categories,
  hasPreviousMonthPlan,
  salaryMinPaise,
  salaryMaxPaise,
  goals,
  budgetVsActualRows,
  rolloverCandidates,
  rolloverTotalPaise,
}: PlannerClientProps) {
  const t = useTranslations("budget.planner");
  const router = useRouter();
  const [lines, setLines] = useState(initialLines);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<{ bucket: MonthlyPlanLineBucket; index: number | null } | null>(null);

  const incomePaise = salaryMinPaise ?? expectedIncomePaise;
  const summary = computePlanSummary(lines, incomePaise);
  const bucketTotals = computeBucketTotals(lines);

  async function persist(nextLines: PlanLine[]) {
    setLines(nextLines);
    setBusy(true);
    const result = await saveMonthlyPlanLines({ monthKey, lines: nextLines });
    setBusy(false);
    if (!result.ok) toast.error(result.error.message);
  }

  function handleSwapPriority(indexA: number, indexB: number) {
    void persist(swapLinePriority(lines, indexA, indexB));
  }

  function handleTogglePaid(index: number) {
    const next = [...lines];
    const line = next[index]!;
    next[index] = { ...line, status: line.status === "paid" ? "planned" : "paid" };
    void persist(next);
  }

  function handleDelete(index: number) {
    void persist(lines.filter((_, i) => i !== index));
  }

  function handleSaveLine(line: PlanLine) {
    if (dialog?.index != null) {
      const next = [...lines];
      next[dialog.index] = line;
      void persist(next);
    } else {
      void persist([...lines, line]);
    }
  }

  async function handleDefer(index: number) {
    setBusy(true);
    const result = await deferPlanLine({ monthKey, lineIndex: index });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    const nextMonthKey = shiftMonthKey(monthKey, 1);
    const next = [...lines];
    next[index] = { ...next[index]!, status: "deferred", deferredTo: nextMonthKey };
    setLines(next);
    toast.success(t("deferred"));
  }

  async function handleAutoDraft() {
    setBusy(true);
    const result = await autoDraftPlan({ monthKey });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    router.refresh();
  }

  async function handleCopyLastMonth() {
    setBusy(true);
    const result = await copyLastMonthPlan({ monthKey });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    router.refresh();
  }

  const whatIfCandidates = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.bucket === "want" || line.status === "deferred")
    .map(({ line, index }) => ({
      id: String(index),
      label: line.label,
      plannedPaise: line.plannedPaise,
      priority: line.priority,
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthSwitcher value={monthKey} onChange={(next) => router.push(`/budget/${next}`)} />
        <div className="flex flex-wrap gap-2">
          {lines.length === 0 && (
            <Button type="button" variant="outline" disabled={busy} onClick={() => void handleAutoDraft()}>
              {t("autoDraft")}
            </Button>
          )}
          {hasPreviousMonthPlan && (
            <Button type="button" variant="outline" disabled={busy} onClick={() => void handleCopyLastMonth()}>
              {t("copyLastMonth")}
            </Button>
          )}
          {lines.length > 0 && (
            <RolloverDialog monthKey={monthKey} candidates={rolloverCandidates} totalPaise={rolloverTotalPaise} goals={goals} />
          )}
        </div>
      </div>

      <PlanSummaryBar
        incomePaise={incomePaise}
        totalPlannedPaise={summary.totalPlannedPaise}
        unallocatedPaise={summary.unallocatedPaise}
        status={summary.status}
      />

      {salaryMinPaise != null && salaryMaxPaise != null && salaryMaxPaise > salaryMinPaise && (
        <WhatIfSlider minPaise={salaryMinPaise} maxPaise={salaryMaxPaise} candidates={whatIfCandidates} />
      )}

      <div className="space-y-4">
        {BUCKET_ORDER.map((bucket) => (
          <WaterfallSection
            key={bucket}
            bucket={bucket}
            totalPaise={bucketTotals[bucket]}
            lines={lines
              .map((line, index) => ({ line, index }))
              .filter(({ line }) => line.bucket === bucket)}
            onAdd={() => setDialog({ bucket, index: null })}
            onEdit={(index) => setDialog({ bucket, index })}
            onDelete={handleDelete}
            onDefer={(index) => void handleDefer(index)}
            onTogglePaid={handleTogglePaid}
            onSwapPriority={handleSwapPriority}
          />
        ))}
      </div>

      {budgetVsActualRows.length > 0 && (
        <section className="border-border/60 space-y-3 rounded-2xl border p-4">
          <h2 className="text-sm font-semibold">{t("vsActualTitle")}</h2>
          <BudgetVsActualList rows={budgetVsActualRows} />
        </section>
      )}

      <LineFormDialog
        key={dialog ? `${dialog.bucket}-${dialog.index ?? "new"}` : "closed"}
        open={dialog != null}
        onOpenChange={(open) => !open && setDialog(null)}
        categories={categories}
        initial={dialog?.index != null ? (lines[dialog.index] ?? null) : null}
        defaultBucket={dialog?.bucket ?? "want"}
        onSave={handleSaveLine}
      />
    </div>
  );
}
