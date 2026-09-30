import { z } from "zod";

import { ACCOUNT_TYPES, CATEGORY_GROUPS, CATEGORY_KINDS } from "@/lib/db/enums";
import { LOCALES } from "@/lib/locales";
import { paiseSchema } from "@/lib/zod-helpers";

export const preferencesSchema = z.object({
  locale: z.enum(LOCALES, "Choose English or Tamil"),
});

export type PreferencesInput = z.infer<typeof preferencesSchema>;

export const themeSchema = z.object({
  theme: z.enum(["light", "dark", "system"], "Choose a theme"),
});

export type ThemeInput = z.infer<typeof themeSchema>;

export const onboardingSchema = z.object({
  onboardingDone: z.boolean(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const accountInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  type: z.enum(ACCOUNT_TYPES, "Choose an account type"),
  institution: z.string().trim().max(100).optional(),
  last4: z
    .string()
    .regex(/^\d{4}$/, "Must be exactly 4 digits")
    .optional(),
  openingBalancePaise: paiseSchema().optional(),
  isArchived: z.boolean().optional(),
});

export type AccountInput = z.infer<typeof accountInputSchema>;

export const categoryInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(60),
    nameTa: z.string().trim().min(1, "Tamil name is required").max(60),
    icon: z.string().trim().min(1, "Icon is required"),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex colour, e.g. #22c55e"),
    kind: z.enum(CATEGORY_KINDS, "Choose a category kind").default("expense"),
    group: z.enum(CATEGORY_GROUPS, "Choose a budgeting group").optional(),
    parentId: z.string().optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine((value) => value.kind === "income" || value.group !== undefined, {
    message: "Choose a budgeting group",
    path: ["group"],
  });

export type CategoryInput = z.infer<typeof categoryInputSchema>;
