import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

import { THEMES } from "@/lib/db/enums";
import { paiseField } from "@/lib/db/schema-helpers";
import { LOCALES } from "@/lib/locales";

/**
 * The account root. Its `_id` is the `userId` stored on every other document.
 * Module 3 extends this with preferences and Telegram linking; keep future
 * changes additive.
 */
const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, trim: true },
    image: { type: String },
    locale: { type: String, enum: LOCALES, default: "en" },
    currency: { type: String, enum: ["INR"], default: "INR" },
    timezone: { type: String, default: "Asia/Kolkata" },
    theme: { type: String, enum: THEMES, default: "system" },
    payday: { type: Number, min: 1, max: 31 },
    salaryMinPaise: paiseField({ required: false }),
    salaryMaxPaise: paiseField({ required: false }),
    // 24h "HH:mm", e.g. "20:00".
    dailyReminderTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    // `encrypt()` ciphertext (v1:iv:tag:data), never plaintext. Never selected
    // by default so a stray `.find()` can't leak it; opt in with `.select("+telegramChatId")`.
    telegramChatId: { type: String, select: false },
    onboardingDone: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "users" },
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: Schema.Types.ObjectId };

export const User: Model<InferSchemaType<typeof userSchema>> =
  (models.User as Model<InferSchemaType<typeof userSchema>>) ?? model("User", userSchema);
