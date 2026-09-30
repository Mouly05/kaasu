/** The only shape server actions return to the client (CLAUDE.md §5). */
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: ActionError };

export type ActionError =
  | { code: "unauthorized"; message: string }
  | { code: "rate_limited"; message: string; retryAfterSeconds: number }
  | { code: "validation"; message: string; fieldErrors?: Record<string, string[]> }
  | { code: "not_found"; message: string }
  | { code: "internal"; message: string };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = <T = never>(error: ActionError): ActionResult<T> => ({ ok: false, error });
