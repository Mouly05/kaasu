import { model, models, Schema, type Model, type Types } from "mongoose";

import { ACCOUNT_TYPES } from "@/lib/db/enums";
import { paiseField } from "@/lib/db/schema-helpers";

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export interface AccountDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  type: AccountType;
  institution?: string;
  last4?: string;
  openingBalancePaise: number;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const accountSchema = new Schema<AccountDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ACCOUNT_TYPES, required: true },
    institution: { type: String, trim: true },
    last4: { type: String, match: /^\d{4}$/ },
    // Credit facilities can open already-drawn, so this may be negative.
    openingBalancePaise: paiseField({ required: false, default: 0, allowNegative: true }),
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "accounts" },
);

accountSchema.index({ userId: 1, isArchived: 1 });
accountSchema.index({ userId: 1, type: 1 });

export const Account: Model<AccountDoc> =
  (models.Account as Model<AccountDoc>) ?? model<AccountDoc>("Account", accountSchema);
