import { z } from "zod";

import { LOCALES } from "@/lib/locales";

export const preferencesSchema = z.object({
  locale: z.enum(LOCALES, "Choose English or Tamil"),
});

export type PreferencesInput = z.infer<typeof preferencesSchema>;
