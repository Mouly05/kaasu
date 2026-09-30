import "server-only";

import { isValidObjectId } from "mongoose";

import { AdvisorMessage } from "@/lib/db/models/advisor-message";
import type { AdvisorMessageRole } from "@/lib/db/models/advisor-message";
import { connectDb } from "@/lib/db/connection";
import { Insight } from "@/lib/db/models/insight";
import type { InsightSeverity } from "@/lib/db/models/insight";

export interface AdvisorMessageSummary {
  id: string;
  role: AdvisorMessageRole;
  content: string;
  toolCalls: unknown[];
  createdAt: Date;
}

/** The signed-in user's advisor chat history, oldest first. */
export async function listAdvisorMessages(userId: string, limit = 50): Promise<AdvisorMessageSummary[]> {
  if (!isValidObjectId(userId)) return [];
  await connectDb();
  const messages = await AdvisorMessage.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
  return messages
    .map((m) => ({
      id: String(m._id),
      role: m.role,
      content: m.content,
      toolCalls: m.toolCalls,
      createdAt: m.createdAt,
    }))
    .reverse();
}

export interface InsightSummary {
  id: string;
  type: string;
  periodKey: string;
  title: string;
  body: string;
  severity: InsightSeverity;
  dismissedAt: Date | null;
}

/** The signed-in user's insights, most recent first, excluding dismissed ones by default. */
export async function listInsights(
  userId: string,
  options: { includeDismissed?: boolean } = {},
): Promise<InsightSummary[]> {
  if (!isValidObjectId(userId)) return [];
  await connectDb();
  const insights = await Insight.find({
    userId,
    ...(options.includeDismissed ? {} : { dismissedAt: { $exists: false } }),
  })
    .sort({ createdAt: -1 })
    .lean();
  return insights.map((i) => ({
    id: String(i._id),
    type: i.type,
    periodKey: i.periodKey,
    title: i.title,
    body: i.body,
    severity: i.severity,
    dismissedAt: i.dismissedAt ?? null,
  }));
}
