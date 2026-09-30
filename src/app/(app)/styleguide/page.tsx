import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/shared/page-header";
import { listAccounts, listCategories } from "@/features/settings/queries";
import { requirePageUser } from "@/lib/auth-helpers";

import { StyleguideContent } from "./styleguide-content";

export const metadata: Metadata = { title: "Style guide · Kaasu" };

/** Dev-only: showcases every shared component. Unreachable in production even when signed in. */
export default async function StyleguidePage() {
  if (process.env.NODE_ENV !== "development") notFound();

  const { userId } = await requirePageUser();
  const t = await getTranslations("styleguide");
  const [categories, accounts] = await Promise.all([listCategories(userId), listAccounts(userId)]);

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} description={t("description")} />
      <StyleguideContent categories={categories} accounts={accounts} />
    </div>
  );
}
