import "server-only";

import { isValidObjectId } from "mongoose";

import type { AccountType } from "@/lib/db/models/account";
import { Account } from "@/lib/db/models/account";
import type { CategoryKind } from "@/lib/db/models/category";
import { Category } from "@/lib/db/models/category";
import { connectDb } from "@/lib/db/connection";
import { User } from "@/lib/db/models/user";
import type { Locale } from "@/lib/locales";

export interface SettingsProfile {
  name: string | null;
  email: string;
  image: string | null;
  locale: Locale;
  theme: "light" | "dark" | "system";
  currency: string;
  timezone: string;
  onboardingDone: boolean;
  createdAt: Date | null;
}

/** The signed-in user's profile and preferences, or null if the record is missing. */
export async function getSettingsProfile(userId: string): Promise<SettingsProfile | null> {
  if (!isValidObjectId(userId)) return null;
  await connectDb();
  const user = await User.findById(userId)
    .select({
      name: 1,
      email: 1,
      image: 1,
      locale: 1,
      theme: 1,
      currency: 1,
      timezone: 1,
      onboardingDone: 1,
      createdAt: 1,
    })
    .lean();
  if (!user) return null;
  return {
    name: user.name ?? null,
    email: user.email,
    image: user.image ?? null,
    locale: user.locale ?? "en",
    theme: user.theme ?? "system",
    currency: user.currency ?? "INR",
    timezone: user.timezone ?? "Asia/Kolkata",
    onboardingDone: user.onboardingDone ?? false,
    createdAt: user.createdAt ?? null,
  };
}

export interface CategorySummary {
  id: string;
  name: string;
  nameTa: string;
  icon: string;
  color: string;
  kind: CategoryKind;
  group: string | null;
  parentId: string | null;
  isSystem: boolean;
  sortOrder: number;
}

/** The signed-in user's categories, optionally filtered by kind, sorted for display. */
export async function listCategories(
  userId: string,
  options: { kind?: CategoryKind } = {},
): Promise<CategorySummary[]> {
  if (!isValidObjectId(userId)) return [];
  await connectDb();
  const categories = await Category.find({ userId, ...(options.kind ? { kind: options.kind } : {}) })
    .sort({ sortOrder: 1, name: 1 })
    .lean();
  return categories.map((c) => ({
    id: String(c._id),
    name: c.name,
    nameTa: c.nameTa,
    icon: c.icon,
    color: c.color,
    kind: c.kind,
    group: c.group ?? null,
    parentId: c.parentId ? String(c.parentId) : null,
    isSystem: c.isSystem,
    sortOrder: c.sortOrder,
  }));
}

export interface AccountSummary {
  id: string;
  name: string;
  type: AccountType;
  institution: string | null;
  last4: string | null;
  openingBalancePaise: number;
  isArchived: boolean;
}

/** The signed-in user's accounts, active first unless `includeArchived` is set. */
export async function listAccounts(
  userId: string,
  options: { includeArchived?: boolean } = {},
): Promise<AccountSummary[]> {
  if (!isValidObjectId(userId)) return [];
  await connectDb();
  const accounts = await Account.find({
    userId,
    ...(options.includeArchived ? {} : { isArchived: false }),
  })
    .sort({ name: 1 })
    .lean();
  return accounts.map((a) => ({
    id: String(a._id),
    name: a.name,
    type: a.type,
    institution: a.institution ?? null,
    last4: a.last4 ?? null,
    openingBalancePaise: a.openingBalancePaise,
    isArchived: a.isArchived,
  }));
}
