import { model, models, Schema, type Model, type Types } from "mongoose";

import { GOAL_KINDS, GOAL_STATUSES } from "@/lib/db/enums";
import { paiseField } from "@/lib/db/schema-helpers";

export type GoalKind = (typeof GOAL_KINDS)[number];
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export interface GoalDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  kind: GoalKind;
  targetPaise: number;
  savedPaise: number;
  targetDate?: Date;
  priority: number;
  status: GoalStatus;
  linkedCategoryId?: Types.ObjectId;
  notes?: string;
  url?: string;
  createdAt: Date;
  updatedAt: Date;
}

const goalSchema = new Schema<GoalDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    kind: { type: String, enum: GOAL_KINDS, required: true },
    targetPaise: paiseField({ min: 1 }),
    savedPaise: paiseField({ required: false, default: 0, min: 0 }),
    targetDate: { type: Date },
    priority: { type: Number, min: 1, max: 5, default: 3 },
    status: { type: String, enum: GOAL_STATUSES, default: "active" },
    linkedCategoryId: { type: Schema.Types.ObjectId, ref: "Category" },
    notes: { type: String },
    url: { type: String, trim: true },
  },
  { timestamps: true, collection: "goals" },
);

goalSchema.index({ userId: 1, status: 1 });

export const Goal: Model<GoalDoc> = (models.Goal as Model<GoalDoc>) ?? model<GoalDoc>("Goal", goalSchema);
