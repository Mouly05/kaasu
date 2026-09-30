/**
 * Full Auth.js instance: the proxy-safe config plus the User upsert on sign-in.
 * Import `auth` here in server code; use `requireUser` from auth-helpers in
 * actions and route handlers.
 */
import "server-only";

import NextAuth from "next-auth";

// A deliberate lib → features import: category/account-seed ownership lives
// in settings/service.ts (the Zod schemas for both live there too), and this
// is the only hook that fires once per real sign-in rather than every token
// refresh.
import { ensureDefaultAccounts, ensureDefaultCategories } from "@/features/settings/service";

import { authConfig } from "./auth/config";
import { upsertUserOnSignIn } from "./auth/upsert-user";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      // `user` is only present on sign-in; afterwards the token already carries userId.
      if (user?.email) {
        const userId = await upsertUserOnSignIn({
          email: user.email,
          name: user.name,
          image: user.image,
        });
        token.userId = userId;
        // Never let a bootstrap failure block sign-in.
        await ensureDefaultCategories(userId).catch((error: unknown) => {
          console.error("[auth] failed to bootstrap default categories", error);
        });
        await ensureDefaultAccounts(userId).catch((error: unknown) => {
          console.error("[auth] failed to bootstrap default accounts", error);
        });
      }
      return token;
    },
  },
});
