import type { Metadata } from "next";

import { SettingsPage } from "@/features/settings/components/settings-page";
import { getSettingsProfile } from "@/features/settings/queries";
import { requirePageUser } from "@/lib/auth-helpers";

export const metadata: Metadata = { title: "Settings · Kaasu" };

export default async function Page() {
  const { userId, user } = await requirePageUser();
  const profile = (await getSettingsProfile(userId)) ?? {
    // The User record should always exist after sign-in; fall back to the session.
    name: user.name ?? null,
    email: user.email ?? "",
    image: user.image ?? null,
    locale: "en" as const,
    theme: "system" as const,
    currency: "INR",
    timezone: "Asia/Kolkata",
    onboardingDone: false,
    createdAt: null,
  };
  return <SettingsPage profile={profile} />;
}
