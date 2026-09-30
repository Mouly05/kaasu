/**
 * Resolves the locale and theme to render for the current request, without
 * URL-based locale routing (ADR-018). Signed-in users get their persisted
 * `User.locale`/`User.theme`; everyone else falls back to cookies. Wrapped in
 * `cache()` so the one DB read is shared between `i18n/request.ts` and the
 * root layout within a single request.
 */
import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import { auth } from "@/lib/auth";
import { connectDb } from "@/lib/db/connection";
import { THEMES } from "@/lib/db/enums";
import { User } from "@/lib/db/models/user";
import { LOCALES, type Locale } from "@/lib/locales";

export type Theme = (typeof THEMES)[number];

export interface SessionPreferences {
  locale: Locale;
  theme: Theme;
}

export const NEXT_LOCALE_COOKIE = "NEXT_LOCALE";
export const THEME_COOKIE = "kaasu-theme";

function asLocale(value: string | undefined): Locale | null {
  return LOCALES.includes(value as Locale) ? (value as Locale) : null;
}

function asTheme(value: string | undefined): Theme | null {
  return THEMES.includes(value as Theme) ? (value as Theme) : null;
}

export const getSessionPreferences = cache(async (): Promise<SessionPreferences> => {
  const cookieStore = await cookies();
  const fallback: SessionPreferences = {
    locale: asLocale(cookieStore.get(NEXT_LOCALE_COOKIE)?.value) ?? "en",
    theme: asTheme(cookieStore.get(THEME_COOKIE)?.value) ?? "system",
  };

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return fallback;

  await connectDb();
  const user = await User.findById(userId).select({ locale: 1, theme: 1 }).lean();
  if (!user) return fallback;

  return {
    locale: asLocale(user.locale) ?? fallback.locale,
    theme: asTheme(user.theme) ?? fallback.theme,
  };
});
