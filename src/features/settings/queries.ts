import "server-only";

import { isValidObjectId } from "mongoose";

import { connectDb } from "@/lib/db/connection";
import { User } from "@/lib/db/models/user";
import type { Locale } from "@/lib/locales";

export interface SettingsProfile {
  name: string | null;
  email: string;
  image: string | null;
  locale: Locale;
  currency: string;
  timezone: string;
  createdAt: Date | null;
}

/** The signed-in user's profile and preferences, or null if the record is missing. */
export async function getSettingsProfile(userId: string): Promise<SettingsProfile | null> {
  if (!isValidObjectId(userId)) return null;
  await connectDb();
  const user = await User.findById(userId)
    .select({ name: 1, email: 1, image: 1, locale: 1, currency: 1, timezone: 1, createdAt: 1 })
    .lean();
  if (!user) return null;
  return {
    name: user.name ?? null,
    email: user.email,
    image: user.image ?? null,
    locale: user.locale ?? "en",
    currency: user.currency ?? "INR",
    timezone: user.timezone ?? "Asia/Kolkata",
    createdAt: user.createdAt ?? null,
  };
}
