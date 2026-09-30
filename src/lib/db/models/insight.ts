import { model, models, Schema, type Model, type Types } from "mongoose";

import { INSIGHT_SEVERITIES } from "@/lib/db/enums";

export type InsightSeverity = (typeof INSIGHT_SEVERITIES)[number];

export interface InsightDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  /** Free-form key (e.g. "overspend_category"); grows independently of the schema. */
  type: string;
  /** Free-form period key (day/week/month/quarter), not strictly a MonthKey. */
  periodKey: string;
  title: string;
  body: string;
  severity: InsightSeverity;
  dismissedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const insightSchema = new Schema<InsightDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true, trim: true, maxlength: 50 },
    periodKey: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    severity: { type: String, enum: INSIGHT_SEVERITIES, required: true, default: "info" },
    dismissedAt: { type: Date },
  },
  { timestamps: true, collection: "insights" },
);

insightSchema.index({ userId: 1, type: 1, periodKey: 1 }, { unique: true });
// Partial, not sparse — see the comment on Transaction's dedupeHash index (ADR-017).
insightSchema.index(
  { userId: 1, dismissedAt: 1 },
  { partialFilterExpression: { dismissedAt: { $exists: true } } },
);

export const Insight: Model<InsightDoc> =
  (models.Insight as Model<InsightDoc>) ?? model<InsightDoc>("Insight", insightSchema);
