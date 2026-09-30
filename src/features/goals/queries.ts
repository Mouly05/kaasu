import "server-only";

import { isValidObjectId } from "mongoose";

import { connectDb } from "@/lib/db/connection";
import { Goal } from "@/lib/db/models/goal";
import type { GoalKind, GoalStatus } from "@/lib/db/models/goal";

export interface GoalSummary {
  id: string;
  title: string;
  kind: GoalKind;
  targetPaise: number;
  savedPaise: number;
  targetDate: Date | null;
  priority: number;
  status: GoalStatus;
  linkedCategoryId: string | null;
  notes: string | null;
  url: string | null;
}

function toSummary(g: {
  _id: unknown;
  title: string;
  kind: GoalKind;
  targetPaise: number;
  savedPaise: number;
  targetDate?: Date;
  priority: number;
  status: GoalStatus;
  linkedCategoryId?: unknown;
  notes?: string;
  url?: string;
}): GoalSummary {
  return {
    id: String(g._id),
    title: g.title,
    kind: g.kind,
    targetPaise: g.targetPaise,
    savedPaise: g.savedPaise,
    targetDate: g.targetDate ?? null,
    priority: g.priority,
    status: g.status,
    linkedCategoryId: g.linkedCategoryId ? String(g.linkedCategoryId) : null,
    notes: g.notes ?? null,
    url: g.url ?? null,
  };
}

/** The signed-in user's goals, active first unless `status` narrows it. */
export async function listGoals(
  userId: string,
  options: { status?: GoalStatus } = {},
): Promise<GoalSummary[]> {
  if (!isValidObjectId(userId)) return [];
  await connectDb();
  const goals = await Goal.find({ userId, ...(options.status ? { status: options.status } : {}) })
    .sort({ priority: 1, targetDate: 1 })
    .lean();
  return goals.map(toSummary);
}

/** A single goal by id, scoped to the signed-in user. */
export async function getGoalById(userId: string, goalId: string): Promise<GoalSummary | null> {
  if (!isValidObjectId(userId) || !isValidObjectId(goalId)) return null;
  await connectDb();
  const goal = await Goal.findOne({ _id: goalId, userId }).lean();
  return goal ? toSummary(goal) : null;
}
