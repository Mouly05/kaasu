import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

import { LOCALES } from "@/lib/locales";

/**
 * The account root. Its `_id` is the `userId` stored on every other document.
 * Module 3 extends this; keep changes additive.
 */
const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, trim: true },
    image: { type: String },
    locale: { type: String, enum: LOCALES, default: "en" },
    currency: { type: String, enum: ["INR"], default: "INR" },
    timezone: { type: String, default: "Asia/Kolkata" },
  },
  { timestamps: true, collection: "users" },
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: Schema.Types.ObjectId };

export const User: Model<InferSchemaType<typeof userSchema>> =
  (models.User as Model<InferSchemaType<typeof userSchema>>) ?? model("User", userSchema);
