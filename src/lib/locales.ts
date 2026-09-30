export const LOCALES = ["en", "ta"] as const;
export type Locale = (typeof LOCALES)[number];

/** Each language named in itself, for pickers. */
export const LOCALE_LABELS: Record<Locale, string> = { en: "English", ta: "தமிழ்" };
