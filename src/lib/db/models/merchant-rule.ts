import { model, models, Schema, type Model, type Types } from "mongoose";

/**
 * `pattern` is a plain literal-with-wildcard string, never compiled as a
 * live user-controlled RegExp. See docs/DECISIONS.md ADR-014.
 */
export interface MerchantRuleDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  pattern: string;
  categoryId: Types.ObjectId;
  confidence: number;
  hits: number;
  createdAt: Date;
  updatedAt: Date;
}

const merchantRuleSchema = new Schema<MerchantRuleDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    pattern: { type: String, required: true, trim: true, maxlength: 100 },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    confidence: { type: Number, required: true, min: 0, max: 1, default: 0.5 },
    hits: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true, collection: "merchantrules" },
);

merchantRuleSchema.index({ userId: 1, pattern: 1 }, { unique: true });
merchantRuleSchema.index({ userId: 1, categoryId: 1 });

export const MerchantRule: Model<MerchantRuleDoc> =
  (models.MerchantRule as Model<MerchantRuleDoc>) ??
  model<MerchantRuleDoc>("MerchantRule", merchantRuleSchema);
