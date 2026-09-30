import { model, models, Schema, type Model, type Types } from "mongoose";

import { RECURRING_FREQUENCIES, RECURRING_KINDS } from "@/lib/db/enums";
import { paiseField } from "@/lib/db/schema-helpers";

export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];
export type RecurringKind = (typeof RECURRING_KINDS)[number];

export interface RecurringDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  amountPaise: number;
  categoryId: Types.ObjectId;
  accountId: Types.ObjectId;
  frequency: RecurringFrequency;
  dayOfMonth?: number;
  startDate: Date;
  endDate?: Date;
  kind: RecurringKind;
  autoLog: boolean;
  reminderDaysBefore: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const recurringSchema = new Schema<RecurringDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    amountPaise: paiseField({ min: 1 }),
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    frequency: { type: String, enum: RECURRING_FREQUENCIES, required: true },
    dayOfMonth: { type: Number, min: 1, max: 31 },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    kind: { type: String, enum: RECURRING_KINDS, required: true },
    autoLog: { type: Boolean, default: false },
    reminderDaysBefore: { type: Number, min: 0, default: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "recurrings" },
);

recurringSchema.index({ userId: 1, isActive: 1 });
recurringSchema.index({ userId: 1, categoryId: 1 });

export const Recurring: Model<RecurringDoc> =
  (models.Recurring as Model<RecurringDoc>) ?? model<RecurringDoc>("Recurring", recurringSchema);
