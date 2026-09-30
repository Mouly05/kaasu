import "server-only";

import { Types } from "mongoose";

import { connectDb } from "@/lib/db/connection";
import { Category } from "@/lib/db/models/category";
import type { CategoryGroup, CategoryKind } from "@/lib/db/models/category";

export interface DefaultCategorySeed {
  name: string;
  nameTa: string;
  icon: string;
  color: string;
  kind: CategoryKind;
  /** Undefined (omitted) for income-kind categories, which don't budget into a group. */
  group?: CategoryGroup;
}

/**
 * The system default category set, in Tamil + English, with a lucide icon,
 * a hex colour, and a needs/wants/savings/debt budgeting group (income
 * categories have no group). Single source of truth for both the first-login
 * bootstrap below and `scripts/seed-demo.ts`.
 */
export const DEFAULT_CATEGORIES: readonly DefaultCategorySeed[] = [
  { name: "Rent", nameTa: "வாடகை", icon: "Home", color: "#f97316", kind: "expense", group: "needs" },
  {
    name: "Food & Groceries",
    nameTa: "உணவு மற்றும் மளிகை",
    icon: "Utensils",
    color: "#22c55e",
    kind: "expense",
    group: "needs",
  },
  {
    name: "Family Support",
    nameTa: "குடும்ப ஆதரவு",
    icon: "HeartHandshake",
    color: "#ec4899",
    kind: "expense",
    group: "needs",
  },
  {
    name: "Medical",
    nameTa: "மருத்துவம்",
    icon: "Stethoscope",
    color: "#ef4444",
    kind: "expense",
    group: "needs",
  },
  { name: "Travel", nameTa: "பயணம்", icon: "Plane", color: "#06b6d4", kind: "expense", group: "wants" },
  {
    name: "Subscriptions",
    nameTa: "சந்தாக்கள்",
    icon: "Repeat",
    color: "#8b5cf6",
    kind: "expense",
    group: "wants",
  },
  {
    name: "Utilities",
    nameTa: "பயன்பாடுகள்",
    icon: "Zap",
    color: "#eab308",
    kind: "expense",
    group: "needs",
  },
  {
    name: "Shopping",
    nameTa: "ஷாப்பிங்",
    icon: "ShoppingBag",
    color: "#f59e0b",
    kind: "expense",
    group: "wants",
  },
  {
    name: "Entertainment",
    nameTa: "பொழுதுபோக்கு",
    icon: "Clapperboard",
    color: "#d946ef",
    kind: "expense",
    group: "wants",
  },
  {
    name: "Education",
    nameTa: "கல்வி",
    icon: "GraduationCap",
    color: "#3b82f6",
    kind: "expense",
    group: "needs",
  },
  {
    name: "Gadgets",
    nameTa: "கேஜெட்டுகள்",
    icon: "Smartphone",
    color: "#64748b",
    kind: "expense",
    group: "wants",
  },
  { name: "Gold", nameTa: "தங்கம்", icon: "Gem", color: "#ca8a04", kind: "expense", group: "savings" },
  {
    name: "Investments/SIP",
    nameTa: "முதலீடு/SIP",
    icon: "TrendingUp",
    color: "#10b981",
    kind: "expense",
    group: "savings",
  },
  { name: "EMI", nameTa: "தவணை", icon: "CreditCard", color: "#6366f1", kind: "expense", group: "debt" },
  {
    name: "Debt Repayment",
    nameTa: "கடன் திருப்பிச் செலுத்துதல்",
    icon: "HandCoins",
    color: "#dc2626",
    kind: "expense",
    group: "debt",
  },
  { name: "Salary", nameTa: "சம்பளம்", icon: "Landmark", color: "#14b8a6", kind: "income" },
  {
    name: "Misc",
    nameTa: "இதர",
    icon: "MoreHorizontal",
    color: "#78716c",
    kind: "expense",
    group: "wants",
  },
];

/**
 * Idempotent per-category upsert rather than a `countDocuments === 0` gate:
 * race-safe across concurrent sign-ins, and never duplicates a category the
 * user already created with a matching name. Called from the auth `jwt`
 * callback on real sign-in, and by `scripts/seed-demo.ts`.
 */
export async function ensureDefaultCategories(userId: string): Promise<void> {
  await connectDb();
  await Category.bulkWrite(
    DEFAULT_CATEGORIES.map((category, index) => ({
      updateOne: {
        filter: { userId, name: category.name },
        update: {
          $setOnInsert: {
            ...category,
            userId: new Types.ObjectId(userId),
            isSystem: true,
            sortOrder: index,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );
}
