import { model, models, Schema, type Model, type Types } from "mongoose";

import { TRANSACTION_DIRECTIONS, TRANSACTION_SOURCES } from "@/lib/db/enums";
import { paiseField } from "@/lib/db/schema-helpers";

export type TransactionDirection = (typeof TRANSACTION_DIRECTIONS)[number];
export type TransactionSource = (typeof TRANSACTION_SOURCES)[number];

export interface TransactionDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  date: Date;
  amountPaise: number;
  direction: TransactionDirection;
  categoryId?: Types.ObjectId;
  accountId: Types.ObjectId;
  merchant?: string;
  note?: string;
  tags: string[];
  source: TransactionSource;
  recurringId?: Types.ObjectId;
  debtId?: Types.ObjectId;
  goalId?: Types.ObjectId;
  statementImportId?: Types.ObjectId;
  /** Set only for automated sources that can double-fire; see ADR-013. */
  dedupeHash?: string;
  isReviewed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<TransactionDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: Date, required: true },
    amountPaise: paiseField({ min: 1 }),
    direction: { type: String, enum: TRANSACTION_DIRECTIONS, required: true },
    // Nullable: "quick add, categorize later" flows (AI/telegram/statement).
    categoryId: { type: Schema.Types.ObjectId, ref: "Category" },
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    merchant: { type: String, trim: true },
    note: { type: String, trim: true, maxlength: 500 },
    tags: { type: [String], default: [] },
    source: { type: String, enum: TRANSACTION_SOURCES, required: true, default: "manual" },
    recurringId: { type: Schema.Types.ObjectId, ref: "Recurring" },
    debtId: { type: Schema.Types.ObjectId, ref: "Debt" },
    goalId: { type: Schema.Types.ObjectId, ref: "Goal" },
    statementImportId: { type: Schema.Types.ObjectId, ref: "StatementImport" },
    dedupeHash: { type: String },
    isReviewed: {
      type: Boolean,
      default(this: TransactionDoc) {
        return this.source === "manual";
      },
    },
  },
  { timestamps: true, collection: "transactions" },
);

transactionSchema.index({ userId: 1, date: -1 });
// A plain `sparse` compound index only excludes a document when *every*
// indexed field is missing — since `userId` is always present, `sparse`
// alone would include every document regardless of `dedupeHash`. A partial
// index with an explicit filter is the correct way to scope uniqueness to
// only the documents that actually have a hash. See docs/DECISIONS.md ADR-017.
transactionSchema.index(
  { userId: 1, dedupeHash: 1 },
  { unique: true, partialFilterExpression: { dedupeHash: { $exists: true } } },
);
transactionSchema.index({ merchant: "text", note: "text" });
transactionSchema.index({ userId: 1, accountId: 1 });
transactionSchema.index(
  { userId: 1, recurringId: 1 },
  { partialFilterExpression: { recurringId: { $exists: true } } },
);
transactionSchema.index(
  { userId: 1, debtId: 1 },
  { partialFilterExpression: { debtId: { $exists: true } } },
);
transactionSchema.index(
  { userId: 1, goalId: 1 },
  { partialFilterExpression: { goalId: { $exists: true } } },
);

export const Transaction: Model<TransactionDoc> =
  (models.Transaction as Model<TransactionDoc>) ??
  model<TransactionDoc>("Transaction", transactionSchema);
