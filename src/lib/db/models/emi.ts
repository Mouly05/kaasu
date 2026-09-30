import { model, models, Schema, type Model, type Types } from "mongoose";

import { paiseField } from "@/lib/db/schema-helpers";

export interface EmiInstallment {
  dueDate: Date;
  amountPaise: number;
  paidAt?: Date;
  transactionId?: Types.ObjectId;
}

export interface EmiDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  principalPaise: number;
  tenureMonths: number;
  interestRatePct: number;
  processingFeePaise: number;
  downPaymentPaise: number;
  startDate: Date;
  lender?: string;
  recurringId?: Types.ObjectId;
  installments: EmiInstallment[];
  createdAt: Date;
  updatedAt: Date;
}

const emiInstallmentSchema = new Schema<EmiInstallment>(
  {
    dueDate: { type: Date, required: true },
    amountPaise: paiseField({ min: 1 }),
    paidAt: { type: Date },
    transactionId: { type: Schema.Types.ObjectId, ref: "Transaction" },
  },
  { _id: false },
);

const emiSchema = new Schema<EmiDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    principalPaise: paiseField({ min: 1 }),
    tenureMonths: { type: Number, required: true, min: 1 },
    // 0 means a no-cost EMI.
    interestRatePct: { type: Number, required: true, default: 0, min: 0 },
    processingFeePaise: paiseField({ required: false, default: 0, min: 0 }),
    downPaymentPaise: paiseField({ required: false, default: 0, min: 0 }),
    startDate: { type: Date, required: true },
    lender: { type: String, trim: true },
    recurringId: { type: Schema.Types.ObjectId, ref: "Recurring" },
    installments: { type: [emiInstallmentSchema], default: [] },
  },
  { timestamps: true, collection: "emis" },
);

// Partial, not sparse — see the comment on Transaction's dedupeHash index (ADR-017).
emiSchema.index(
  { userId: 1, recurringId: 1 },
  { partialFilterExpression: { recurringId: { $exists: true } } },
);
emiSchema.index({ userId: 1, startDate: 1 });

export const Emi: Model<EmiDoc> = (models.Emi as Model<EmiDoc>) ?? model<EmiDoc>("Emi", emiSchema);
