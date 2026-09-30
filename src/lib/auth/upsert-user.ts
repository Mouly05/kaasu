import "server-only";

import { connectDb } from "@/lib/db/connection";
import { User } from "@/lib/db/models/user";

export interface SignInProfile {
  email: string;
  name?: string | null;
  image?: string | null;
}

/**
 * Creates the User on first sign-in and refreshes name/avatar afterwards.
 * Preferences (locale, currency, timezone) are only set on insert, so a
 * sign-in never overwrites what the user chose in Settings.
 */
export async function upsertUserOnSignIn({ email, name, image }: SignInProfile): Promise<string> {
  await connectDb();
  const profile: Record<string, string> = {};
  if (name) profile.name = name;
  if (image) profile.image = image;

  const user = await User.findOneAndUpdate(
    { email: email.trim().toLowerCase() },
    {
      $set: profile,
      $setOnInsert: { locale: "en", currency: "INR", timezone: "Asia/Kolkata" },
    },
    { upsert: true, returnDocument: "after", runValidators: true, projection: { _id: 1 } },
  ).lean();

  if (!user) throw new Error("User upsert returned no document");
  return String(user._id);
}
