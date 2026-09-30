/**
 * Full Auth.js instance: the proxy-safe config plus the User upsert on sign-in.
 * Import `auth` here in server code; use `requireUser` from auth-helpers in
 * actions and route handlers.
 */
import "server-only";

import NextAuth from "next-auth";

import { authConfig } from "./auth/config";
import { upsertUserOnSignIn } from "./auth/upsert-user";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      // `user` is only present on sign-in; afterwards the token already carries userId.
      if (user?.email) {
        token.userId = await upsertUserOnSignIn({
          email: user.email,
          name: user.name,
          image: user.image,
        });
      }
      return token;
    },
  },
});
