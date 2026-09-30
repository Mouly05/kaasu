import { model, models, Schema, type Model, type Types } from "mongoose";

import { HOLDING_ASSET_TYPES, HOLDING_SNAPSHOT_SOURCES } from "@/lib/db/enums";
import { paiseField } from "@/lib/db/schema-helpers";

export type HoldingSnapshotSource = (typeof HOLDING_SNAPSHOT_SOURCES)[number];
export type HoldingAssetType = (typeof HOLDING_ASSET_TYPES)[number];

export interface Holding {
  symbol: string;
  name: string;
  assetType: HoldingAssetType;
  qty: number;
  avgCostPaise: number;
  ltpPaise: number;
  valuePaise: number;
}

export interface HoldingSnapshotTotals {
  investedPaise: number;
  currentValuePaise: number;
  pnlPaise: number;
}

export interface HoldingSnapshotDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  takenAt: Date;
  source: HoldingSnapshotSource;
  holdings: Holding[];
  totals: HoldingSnapshotTotals;
  createdAt: Date;
  updatedAt: Date;
}

const holdingSchema = new Schema<Holding>(
  {
    symbol: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    assetType: { type: String, enum: HOLDING_ASSET_TYPES, required: true },
    // Fractional units (e.g. mutual funds), not integer paise.
    qty: {
      type: Number,
      required: true,
      validate: { validator: (v: number) => Number.isFinite(v) && v >= 0, message: "qty must be a non-negative finite number" },
    },
    avgCostPaise: paiseField({ required: false, default: 0, min: 0 }),
    ltpPaise: paiseField({ required: false, default: 0, min: 0 }),
    valuePaise: paiseField({ required: false, default: 0, min: 0 }),
  },
  { _id: false },
);

const holdingSnapshotSchema = new Schema<HoldingSnapshotDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    takenAt: { type: Date, required: true, default: () => new Date() },
    source: { type: String, enum: HOLDING_SNAPSHOT_SOURCES, required: true },
    holdings: { type: [holdingSchema], default: [] },
    totals: {
      investedPaise: paiseField({ required: false, default: 0, min: 0 }),
      currentValuePaise: paiseField({ required: false, default: 0, min: 0 }),
      pnlPaise: paiseField({ required: false, default: 0, allowNegative: true }),
    },
  },
  { timestamps: true, collection: "holdingsnapshots" },
);

holdingSnapshotSchema.index({ userId: 1, takenAt: -1 });

export const HoldingSnapshot: Model<HoldingSnapshotDoc> =
  (models.HoldingSnapshot as Model<HoldingSnapshotDoc>) ??
  model<HoldingSnapshotDoc>("HoldingSnapshot", holdingSnapshotSchema);
