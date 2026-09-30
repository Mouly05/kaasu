/**
 * Session guards for server actions and route handlers.
 *
 *   export const saveThing = withAction(async (input: unknown) => {
 *     const { userId } = await requireUser();
 *     ...
 *     return ok(data);
 *   });
 */
import "server-only";

import { redirect } from "next/navigation";

import { fail, type ActionError, type ActionResult } from "./action-result";
import { auth } from "./auth";
import { LOGIN_PATH } from "./auth/access";
import { RateLimitError, UnauthorizedError } from "./errors";

export { RateLimitError, UnauthorizedError } from "./errors";

export interface CurrentUser {
  userId: string;
}

/** Returns the signed-in user's id or throws UnauthorizedError. */
export async function requireUser(): Promise<CurrentUser> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new UnauthorizedError();
  return { userId };
}

/** Maps known errors to a client-safe ActionError; unknown errors are logged and hidden. */
export function toActionError(error: unknown): ActionError {
  if (error instanceof UnauthorizedError) {
    return { code: "unauthorized", message: error.message };
  }
  if (error instanceof RateLimitError) {
    return {
      code: "rate_limited",
      message: error.message,
      retryAfterSeconds: error.retryAfterSeconds,
    };
  }
  console.error("[action] unexpected error", error);
  return { code: "internal", message: "Something went wrong. Please try again." };
}

/** Wraps a server action so it never throws to the client. */
export function withAction<Args extends unknown[], T>(
  handler: (...args: Args) => Promise<ActionResult<T>>,
): (...args: Args) => Promise<ActionResult<T>> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return fail(toActionError(error));
    }
  };
}

/** Wraps a route handler: UnauthorizedError → 401, RateLimitError → 429, else 500. */
export function withRoute<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      const body = toActionError(error);
      const status = body.code === "unauthorized" ? 401 : body.code === "rate_limited" ? 429 : 500;
      const headers: HeadersInit =
        body.code === "rate_limited" ? { "Retry-After": String(body.retryAfterSeconds) } : {};
      return Response.json({ ok: false, error: body }, { status, headers });
    }
  };
}

/**
 * For Server Component pages and layouts: returns the session or redirects to
 * /login. The proxy already guards pages; this is the check next to the data.
 */
export async function requirePageUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!session || !userId) redirect(LOGIN_PATH);
  return { userId, user: session.user };
}
