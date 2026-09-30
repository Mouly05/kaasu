import { model, models, Schema, type Model, type Types } from "mongoose";

import { computeOutstandingPaise } from "@/features/debts/service";
import { DEBT_DIRECTIONS, DEBT_STATUSES, DEBT_TYPES } from "@/lib/db/enums";
import { paiseField } from "@/lib/db/schema-helpers";

export type DebtType = (typeof DEBT_TYPES)[number];
export type DebtDirection = (typeof DEBT_DIRECTIONS)[number];
export type DebtStatus = (typeof DEBT_STATUSES)[number];

export interface DebtRepayment {
  date: Date;
  amountPaise: number;
  transactionId?: Types.ObjectId;
}

export interface DebtDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  counterparty: string;
  type: DebtType;
  direction: DebtDirection;
  originalPaise: number;
  interestRatePct?: number;
  dueDate?: Date;
  priority: number;
  repayments: DebtRepayment[];
  status: DebtStatus;
  createdAt: Date;
  updatedAt: Date;
  /**
   * Convenience only — Mongoose virtuals don't survive `.lean()`, so
   * `debts/queries.ts` must compute this manually on lean results.
   */
  outstandingPaise: number;
}

const debtRepaymentSchema = new Schema<DebtRepayment>(
  {
    date: { type: Date, required: true },
    amountPaise: paiseField({ min: 1 }),
    transactionId: { type: Schema.Types.ObjectId, ref: "Transaction" },
  },
  { _id: false },
);

const debtSchema = new Schema<DebtDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    counterparty: { type: String, required: true, trim: true },
    type: { type: String, enum: DEBT_TYPES, required: true },
    direction: { type: String, enum: DEBT_DIRECTIONS, required: true },
    originalPaise: paiseField({ min: 1 }),
    interestRatePct: { type: Number, min: 0 },
    dueDate: { type: Date },
    priority: { type: Number, min: 1, max: 5, default: 3 },
    repayments: { type: [debtRepaymentSchema], default: [] },
    status: { type: String, enum: DEBT_STATUSES, default: "open" },
  },
  {
    timestamps: true,
    collection: "debts",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

debtSchema.virtual("outstandingPaise").get(function (this: DebtDoc) {
  return computeOutstandingPaise(this.originalPaise, this.repayments);
});

debtSchema.index({ userId: 1, status: 1 });
// Partial, not sparse — see the comment on Transaction's dedupeHash index (ADR-017).
debtSchema.index({ userId: 1, dueDate: 1 }, { partialFilterExpression: { dueDate: { $exists: true } } });

export const Debt: Model<DebtDoc> = (models.Debt as Model<DebtDoc>) ?? model<DebtDoc>("Debt", debtSchema);
