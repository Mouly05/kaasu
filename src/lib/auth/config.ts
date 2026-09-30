/**
 * Auth.js config without database access, so src/proxy.ts can import it
 * cheaply. The full config (with the User upsert) lives in src/lib/auth.ts.
 */
import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";

import { isEmailAllowed, parseAllowlist } from "./allowlist";
import { LOGIN_PATH } from "./access";

export const DENIED_PATH = `${LOGIN_PATH}/denied`;

export const authConfig = {
  providers: [GitHub],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: LOGIN_PATH, error: LOGIN_PATH },
  trustHost: true,
  callbacks: {
    signIn({ user }) {
      // Returning a path redirects there instead of the generic error page.
      return isEmailAllowed(user.email, parseAllowlist(process.env.ALLOWED_EMAILS)) || DENIED_PATH;
    },
    session({ session, token }) {
      if (typeof token.userId === "string") session.user.id = token.userId;
      return session;
    },
  },
} satisfies NextAuthConfig;
