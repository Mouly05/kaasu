"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, ok } from "@/lib/action-result";
import { requireUser, withAction } from "@/lib/auth-helpers";
import { connectDb } from "@/lib/db/connection";
import { Goal } from "@/lib/db/models/goal";
import { MonthlyPlan } from "@/lib/db/models/monthly-plan";
import { User } from "@/lib/db/models/user";
import { shiftMonthKey, type MonthKey } from "@/lib/dates";

import { getDraftInputs, getMonthlyPlan, getPlanActuals } from "./queries";
import {
  copyLastMonthInputSchema,
  deferPlanLineInputSchema,
  rolloverInputSchema,
  saveMonthlyPlanLinesInputSchema,
  type CopyLastMonthInput,
  type DeferPlanLineInput,
  type SaveMonthlyPlanLinesInput,
} from "./schema";
import {
  buildDraftLines,
  computeRolloverCandidates,
  computeTotalRollover,
  copyPlanLines,
  deferLineToNextMonth,
  type PlanLine,
} from "./service";

function revalidateBudget(monthKey: string) {
  revalidatePath(`/budget/${monthKey}`);
}

/** The single write primitive behind add/edit/delete/reorder/status-toggle: replaces a month's whole `lines` array. */
export const saveMonthlyPlanLines = withAction(async (input: unknown) => {
  const { userId } = await requireUser();
  const parsed = saveMonthlyPlanLinesInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail<SaveMonthlyPlanLinesInput>({
      code: "validation",
      message: "Check the plan's details.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    });
  }
  const { monthKey, lines, expectedIncomePaise, actualIncomePaise } = parsed.data;

  await connectDb();
  await MonthlyPlan.findOneAndUpdate(
    { userId, monthKey },
    {
      $set: {
        lines,
        ...(expectedIncomePaise !== undefined ? { expectedIncomePaise } : {}),
        ...(actualIncomePaise !== undefined ? { actualIncomePaise } : {}),
      },
    },
    { upsert: true },
  );
  revalidateBudget(monthKey);
  return ok(parsed.data);
});

const autoDraftInputSchema = z.object({ monthKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) });

/** Auto-drafts a month's plan from active Recurring, open Debts, Goals, and category-average variable spend. */
export const autoDraftPlan = withAction(async (input: unknown) => {
  const { userId } = await requireUser();
  const parsed = autoDraftInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail<{ monthKey: string }>({ code: "validation", message: "Invalid month." });
  }
  const { monthKey } = parsed.data;

  await connectDb();
  const existing = await getMonthlyPlan(userId, monthKey);
  if (existing && existing.lines.length > 0) {
    return fail<{ monthKey: string }>({
      code: "validation",
      message: "A plan already exists for this month.",
    });
  }

  const [draftInputs, salaryUser] = await Promise.all([
    getDraftInputs(userId, monthKey as MonthKey),
    User.findById(userId).select({ salaryMinPaise: 1, salaryMaxPaise: 1 }).lean(),
  ]);
  const lines = buildDraftLines(draftInputs);
  // Plan on the minimum salary by default (CLAUDE.md / product brief) — the what-if slider covers the upside.
  const expectedIncomePaise = salaryUser?.salaryMinPaise ?? salaryUser?.salaryMaxPaise ?? 0;

  await MonthlyPlan.findOneAndUpdate(
    { userId, monthKey },
    { $set: { lines, expectedIncomePaise } },
    { upsert: true },
  );
  revalidateBudget(monthKey);
  return ok({ monthKey });
});

/** Defers a line to next month: marks it deferred here, and creates a fresh line in next month's plan. */
export const deferPlanLine = withAction(async (input: unknown) => {
  const { userId } = await requireUser();
  const parsed = deferPlanLineInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail<DeferPlanLineInput>({ code: "validation", message: "Invalid input." });
  }
  const { monthKey, lineIndex } = parsed.data;

  await connectDb();
  const plan = await getMonthlyPlan(userId, monthKey);
  const line = plan?.lines[lineIndex];
  if (!plan || !line) {
    return fail<DeferPlanLineInput>({ code: "not_found", message: "That plan line wasn't found." });
  }

  const nextMonthKey = shiftMonthKey(monthKey as MonthKey, 1);
  const { updatedCurrentLine, newNextMonthLine } = deferLineToNextMonth(
    line,
    monthKey as MonthKey,
    nextMonthKey,
  );

  const nextLines: PlanLine[] = [...plan.lines];
  nextLines[lineIndex] = updatedCurrentLine;

  await Promise.all([
    MonthlyPlan.updateOne({ userId, monthKey }, { $set: { lines: nextLines } }),
    MonthlyPlan.findOneAndUpdate(
      { userId, monthKey: nextMonthKey },
      { $push: { lines: newNextMonthLine } },
      { upsert: true },
    ),
  ]);
  revalidateBudget(monthKey);
  revalidateBudget(nextMonthKey);
  return ok({ monthKey, lineIndex });
});

/** Copies last month's plan lines as a starting point for this month. */
export const copyLastMonthPlan = withAction(async (input: unknown) => {
  const { userId } = await requireUser();
  const parsed = copyLastMonthInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail<CopyLastMonthInput>({ code: "validation", message: "Invalid month." });
  }
  const { monthKey } = parsed.data;
  const previousMonthKey = shiftMonthKey(monthKey as MonthKey, -1);

  await connectDb();
  const previous = await getMonthlyPlan(userId, previousMonthKey);
  if (!previous || previous.lines.length === 0) {
    return fail<CopyLastMonthInput>({ code: "not_found", message: "No plan to copy from last month." });
  }

  const copied = copyPlanLines(previous.lines);

  await MonthlyPlan.findOneAndUpdate(
    { userId, monthKey },
    { $set: { lines: copied, expectedIncomePaise: previous.expectedIncomePaise } },
    { upsert: true },
  );
  revalidateBudget(monthKey);
  return ok({ monthKey });
});

export interface RolloverResult {
  monthKey: string;
  rolledOverPaise: number;
}

/** Month-end rollover: moves this month's unspent total to next month's buffer, or into a chosen goal. */
export const applyRollover = withAction(async (input: unknown) => {
  const { userId } = await requireUser();
  const parsed = rolloverInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail<RolloverResult>({ code: "validation", message: "Invalid input." });
  }
  const { monthKey, destination } = parsed.data;

  await connectDb();
  const plan = await getMonthlyPlan(userId, monthKey);
  if (!plan) {
    return fail<RolloverResult>({ code: "not_found", message: "That plan wasn't found." });
  }
  const actuals = await getPlanActuals(userId, monthKey as MonthKey, plan.lines);
  const total = computeTotalRollover(computeRolloverCandidates(actuals));
  if (total <= 0) {
    return fail<RolloverResult>({ code: "validation", message: "Nothing to roll over this month." });
  }

  if (destination.type === "goal") {
    const result = await Goal.updateOne(
      { _id: destination.goalId, userId },
      { $inc: { savedPaise: total } },
    );
    if (result.matchedCount === 0) {
      return fail<RolloverResult>({ code: "not_found", message: "That goal wasn't found." });
    }
  } else {
    const nextMonthKey = shiftMonthKey(monthKey as MonthKey, 1);
    await MonthlyPlan.findOneAndUpdate(
      { userId, monthKey: nextMonthKey },
      {
        $push: {
          lines: {
            categoryId: null,
            label: `Rollover from ${monthKey}`,
            plannedPaise: total,
            priority: 3,
            bucket: "buffer",
            status: "planned",
          },
        },
      },
      { upsert: true },
    );
    revalidateBudget(nextMonthKey);
  }

  revalidateBudget(monthKey);
  return ok({ monthKey, rolledOverPaise: total });
});
