import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { decideAccess } from "@/lib/auth/access";
import { authConfig } from "@/lib/auth/config";

const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const decision = decideAccess({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    isAuthenticated: Boolean(request.auth?.user),
    headers: request.headers,
    secrets: {
      cronSecret: process.env.CRON_SECRET,
      telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET,
    },
  });

  switch (decision.type) {
    case "allow":
      return NextResponse.next();
    case "redirect":
      return NextResponse.redirect(new URL(decision.location, request.nextUrl));
    case "unauthorized":
      return NextResponse.json(
        { ok: false, error: decision.status === 404 ? "not_found" : "unauthorized" },
        { status: decision.status },
      );
  }
});

export const config = {
  // All API routes, plus every page except Next internals and public static assets.
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpe?g|gif|svg|webp|avif|ico|txt|xml|webmanifest|woff2?)$).*)",
  ],
};
