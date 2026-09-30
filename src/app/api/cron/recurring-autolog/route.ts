import { logRecurringPayment } from "@/features/recurring/actions";
import { listAutoLogDueToday } from "@/features/recurring/queries";
import { UnauthorizedError, withRoute } from "@/lib/auth-helpers";
import { isCronAuthorized } from "@/lib/auth/access";
import { env } from "@/lib/env";

/**
 * Daily job (see vercel.json): logs a Transaction for every autoLog
 * recurring item due today. src/proxy.ts already gates /api/cron/*, but
 * route handlers re-check their own secret per CLAUDE.md's cron convention.
 */
export const GET = withRoute(async (request: Request) => {
  if (!isCronAuthorized(request.headers, env.CRON_SECRET)) {
    throw new UnauthorizedError();
  }

  const now = new Date();
  const due = await listAutoLogDueToday(now);
  const results = await Promise.allSettled(
    due.map((item) => logRecurringPayment(item.userId, item.recurringId, now)),
  );
  const logged = results.filter((result) => result.status === "fulfilled" && result.value).length;
  const failed = results.length - logged;

  if (failed > 0) {
    console.error(`[cron] recurring-autolog: ${failed} of ${results.length} payments failed to log`);
  }

  return Response.json({ ok: true, due: due.length, logged, failed });
});
