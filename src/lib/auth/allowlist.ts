/**
 * Email allowlist for sign-in. Pure and dependency-free so both the Auth.js
 * config (used by the proxy) and tests can import it.
 */

/** Parses a comma-separated allowlist into trimmed, lower-cased, de-duplicated emails. */
export function parseAllowlist(raw: string | undefined | null): string[] {
  if (!raw) return [];
  const emails = raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(emails)];
}

/** True when `email` is on the allowlist (case-insensitive, whitespace-tolerant). */
export function isEmailAllowed(
  email: string | undefined | null,
  allowlist: readonly string[],
): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return allowlist.includes(normalized);
}
