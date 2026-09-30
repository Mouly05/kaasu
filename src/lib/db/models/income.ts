import { model, models, Schema, type Model, type Types } from "mongoose";

import { INCOME_SOURCES } from "@/lib/db/enums";
import { paiseField } from "@/lib/db/schema-helpers";

export type IncomeSource = (typeof INCOME_SOURCES)[number];

export interface IncomeDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  date: Date;
  amountPaise: number;
  source: IncomeSource;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const incomeSchema = new Schema<IncomeDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: Date, required: true },
    amountPaise: paiseField({ min: 1 }),
    source: { type: String, enum: INCOME_SOURCES, required: true },
    note: { type: String, trim: true },
  },
  { timestamps: true, collection: "incomes" },
);

incomeSchema.index({ userId: 1, date: -1 });

export const Income: Model<IncomeDoc> =
  (models.Income as Model<IncomeDoc>) ?? model<IncomeDoc>("Income", incomeSchema);
