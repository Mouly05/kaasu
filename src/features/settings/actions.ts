"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { fail, ok } from "@/lib/action-result";
import { requireUser, withAction } from "@/lib/auth-helpers";
import { connectDb } from "@/lib/db/connection";
import { User } from "@/lib/db/models/user";
import { NEXT_LOCALE_COOKIE, THEME_COOKIE } from "@/lib/session-preferences";

import { preferencesSchema, themeSchema, type PreferencesInput, type ThemeInput } from "./schema";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const updatePreferences = withAction(async (input: unknown) => {
  const { userId } = await requireUser();
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) {
    return fail<PreferencesInput>({
      code: "validation",
      message: "Please check your preferences.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    });
  }

  await connectDb();
  const result = await User.updateOne({ _id: userId }, { $set: parsed.data });
  if (result.matchedCount === 0) {
    return fail<PreferencesInput>({ code: "not_found", message: "Your profile wasn’t found." });
  }

  (await cookies()).set(NEXT_LOCALE_COOKIE, parsed.data.locale, { maxAge: COOKIE_MAX_AGE });
  revalidatePath("/", "layout");
  return ok(parsed.data);
});

export const updateTheme = withAction(async (input: unknown) => {
  const { userId } = await requireUser();
  const parsed = themeSchema.safeParse(input);
  if (!parsed.success) {
    return fail<ThemeInput>({
      code: "validation",
      message: "Choose a theme.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    });
  }

  await connectDb();
  const result = await User.updateOne({ _id: userId }, { $set: parsed.data });
  if (result.matchedCount === 0) {
    return fail<ThemeInput>({ code: "not_found", message: "Your profile wasn’t found." });
  }

  (await cookies()).set(THEME_COOKIE, parsed.data.theme, { maxAge: COOKIE_MAX_AGE });
  revalidatePath("/", "layout");
  return ok(parsed.data);
});
