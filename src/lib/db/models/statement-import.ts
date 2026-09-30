import { model, models, Schema, type Model, type Types } from "mongoose";

import { STATEMENT_IMPORT_STATUSES } from "@/lib/db/enums";

export type StatementImportStatus = (typeof STATEMENT_IMPORT_STATUSES)[number];

export interface StatementImportDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  fileName: string;
  bank: string;
  period: { from: Date; to: Date };
  rowCount: number;
  importedCount: number;
  duplicateCount: number;
  status: StatementImportStatus;
  createdAt: Date;
  updatedAt: Date;
}

const statementImportSchema = new Schema<StatementImportDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fileName: { type: String, required: true, trim: true },
    bank: { type: String, required: true, trim: true },
    period: {
      from: { type: Date, required: true },
      to: { type: Date, required: true },
    },
    rowCount: { type: Number, required: true, min: 0 },
    importedCount: { type: Number, required: true, default: 0, min: 0 },
    duplicateCount: { type: Number, required: true, default: 0, min: 0 },
    status: { type: String, enum: STATEMENT_IMPORT_STATUSES, default: "pending" },
  },
  { timestamps: true, collection: "statementimports" },
);

statementImportSchema.index({ userId: 1, createdAt: -1 });

export const StatementImport: Model<StatementImportDoc> =
  (models.StatementImport as Model<StatementImportDoc>) ??
  model<StatementImportDoc>("StatementImport", statementImportSchema);
