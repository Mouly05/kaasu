"use server";

import { signIn, signOut } from "@/lib/auth";

import { safeCallbackPath } from "./access";

/** Starts the GitHub OAuth flow; the callback URL is restricted to same-origin paths. */
export async function signInWithGitHub(formData: FormData): Promise<void> {
  const callbackUrl = formData.get("callbackUrl");
  await signIn("github", {
    redirectTo: safeCallbackPath(typeof callbackUrl === "string" ? callbackUrl : null),
  });
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
