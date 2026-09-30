import { model, models, Schema, type Model, type Types } from "mongoose";

import { MONTHLY_PLAN_LINE_BUCKETS, MONTHLY_PLAN_LINE_STATUSES } from "@/lib/db/enums";
import { paiseField } from "@/lib/db/schema-helpers";

export type MonthlyPlanLineBucket = (typeof MONTHLY_PLAN_LINE_BUCKETS)[number];
export type MonthlyPlanLineStatus = (typeof MONTHLY_PLAN_LINE_STATUSES)[number];

const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export interface MonthlyPlanLine {
  categoryId: Types.ObjectId | null;
  label: string;
  plannedPaise: number;
  priority: number;
  bucket: MonthlyPlanLineBucket;
  status: MonthlyPlanLineStatus;
  /** Set when this line was deferred forward; the month key it was pushed to. */
  deferredTo?: string;
  /** Set when this line was created by deferring a line from an earlier month. */
  deferredFrom?: string;
  /** Auto-draft provenance, so budget-vs-actual can match this line to real spend. */
  recurringId?: Types.ObjectId;
  debtId?: Types.ObjectId;
  goalId?: Types.ObjectId;
}

export interface MonthlyPlanDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  monthKey: string;
  expectedIncomePaise: number;
  actualIncomePaise: number;
  lines: MonthlyPlanLine[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const monthlyPlanLineSchema = new Schema<MonthlyPlanLine>(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    label: { type: String, required: true, trim: true },
    plannedPaise: paiseField({ min: 0 }),
    priority: { type: Number, required: true, min: 1, max: 5 },
    bucket: { type: String, enum: MONTHLY_PLAN_LINE_BUCKETS, required: true },
    status: { type: String, enum: MONTHLY_PLAN_LINE_STATUSES, default: "planned" },
    deferredTo: { type: String, match: MONTH_KEY_RE },
    deferredFrom: { type: String, match: MONTH_KEY_RE },
    recurringId: { type: Schema.Types.ObjectId, ref: "Recurring" },
    debtId: { type: Schema.Types.ObjectId, ref: "Debt" },
    goalId: { type: Schema.Types.ObjectId, ref: "Goal" },
  },
  { _id: false },
);

const monthlyPlanSchema = new Schema<MonthlyPlanDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    monthKey: { type: String, required: true, match: MONTH_KEY_RE },
    expectedIncomePaise: paiseField({ required: false, default: 0, min: 0 }),
    actualIncomePaise: paiseField({ required: false, default: 0, min: 0 }),
    lines: { type: [monthlyPlanLineSchema], default: [] },
    notes: { type: String },
  },
  { timestamps: true, collection: "monthlyplans" },
);

monthlyPlanSchema.index({ userId: 1, monthKey: 1 }, { unique: true });

export const MonthlyPlan: Model<MonthlyPlanDoc> =
  (models.MonthlyPlan as Model<MonthlyPlanDoc>) ??
  model<MonthlyPlanDoc>("MonthlyPlan", monthlyPlanSchema);
