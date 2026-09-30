import { model, models, Schema, type Model, type Types } from "mongoose";

import { CATEGORY_GROUPS, CATEGORY_KINDS } from "@/lib/db/enums";

export type CategoryKind = (typeof CATEGORY_KINDS)[number];
export type CategoryGroup = (typeof CATEGORY_GROUPS)[number];

export interface CategoryDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  nameTa: string;
  icon: string;
  color: string;
  kind: CategoryKind;
  group?: CategoryGroup;
  parentId?: Types.ObjectId;
  isSystem: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<CategoryDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    nameTa: { type: String, required: true, trim: true },
    icon: { type: String, required: true },
    color: { type: String, required: true, match: /^#[0-9a-fA-F]{6}$/ },
    kind: { type: String, enum: CATEGORY_KINDS, required: true, default: "expense" },
    // Income categories (e.g. Salary) don't budget into a needs/wants/savings/debt bucket.
    group: {
      type: String,
      enum: CATEGORY_GROUPS,
      required(this: CategoryDoc) {
        return this.kind !== "income";
      },
    },
    parentId: { type: Schema.Types.ObjectId, ref: "Category" },
    isSystem: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "categories" },
);

categorySchema.index({ userId: 1, name: 1 }, { unique: true });
categorySchema.index({ userId: 1, kind: 1 });

export const Category: Model<CategoryDoc> =
  (models.Category as Model<CategoryDoc>) ?? model<CategoryDoc>("Category", categorySchema);
