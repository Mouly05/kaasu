/**
 * Response security headers applied to every route from next.config.ts.
 *
 * The CSP is static (no nonces) so pages stay statically renderable. Next's
 * inline bootstrap scripts and next-themes' no-flash script need
 * 'unsafe-inline' for scripts; Radix/shadcn set inline styles. See ADR-008.
 */

export interface SecurityHeaderOptions {
  isDev: boolean;
}

/** Remote image hosts we render (GitHub avatars). */
const IMAGE_HOSTS = ["https://avatars.githubusercontent.com"];
/** Where the OAuth sign-in form may post/redirect to. */
const FORM_TARGETS = ["https://github.com"];

export function buildCsp({ isDev }: SecurityHeaderOptions): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "blob:", "data:", ...IMAGE_HOSTS],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...(isDev ? ["ws:"] : [])],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'", ...FORM_TARGETS],
    "frame-ancestors": ["'none'"],
    ...(isDev ? {} : { "upgrade-insecure-requests": [] }),
  };
  return Object.entries(directives)
    .map(([name, values]) => [name, ...values].join(" "))
    .join("; ");
}

export function buildSecurityHeaders(options: SecurityHeaderOptions) {
  const headers = [
    { key: "Content-Security-Policy", value: buildCsp(options) },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: [
        "camera=()",
        "microphone=()",
        "geolocation=()",
        "payment=()",
        "usb=()",
        "browsing-topics=()",
        "interest-cohort=()",
      ].join(", "),
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
  if (!options.isDev) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    });
  }
  return headers;
}
