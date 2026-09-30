# Kaasu — Progress

Status: ⬜ not started · 🟡 in progress · ✅ done

| #   | Module                                                                  | Status | Notes                |
| --- | ----------------------------------------------------------------------- | ------ | -------------------- |
| 0   | Setup & accounts (GitHub, Vercel, Atlas, OAuth app, env)                | ✅     | `.env.local` present |
| 1   | Foundation (scaffold, tooling, shadcn, env, money, dates, CI)           | ✅     | 2026-09-30           |
| 2   | DB connection + Auth (Mongoose, Auth.js GitHub, allowlist, crypto)      | ✅     | 2026-09-30           |
| 3   | App shell & design system (sidebar, bottom nav, ⌘K, theme, i18n wiring) | ⬜     |                      |
| 4   | Expenses (quick add, list, categories)                                  | ⬜     |                      |
| 5   | Recurring / fixed expenses                                              | ⬜     |                      |
| 6   | Monthly budget                                                          | ⬜     |                      |
| 7   | Salary planning                                                         | ⬜     |                      |
| 8   | Debts & EMIs                                                            | ⬜     |                      |
| 9   | Goals & wishlist                                                        | ⬜     |                      |
| 10  | Bank-statement import & analysis                                        | ⬜     |                      |
| 11  | Investments (INDstocks/INDmoney read-only, mutual funds)                | ⬜     |                      |
| 12  | Dashboard                                                               | ⬜     |                      |
| 13  | AI financial advisor                                                    | ⬜     |                      |
| 14  | Personal assistant agent + Telegram                                     | ⬜     |                      |
| 15  | Settings, Tamil (ta) translations, data export                          | ⬜     |                      |
| 16  | Hardening: Playwright E2E, a11y/perf pass, Vercel cron & deploy         | ⬜     |                      |

## Module 1 — Foundation

- [x] Next.js (App Router, src/, TS strict, Tailwind, ESLint) with pnpm
- [x] Prettier (+ tailwind plugin), Vitest + Testing Library + jsdom, Playwright config
- [x] shadcn/ui (zinc, CSS variables) and base components
- [x] Folder structure per CLAUDE.md §4
- [x] `src/lib/env.ts`: Zod-validated server/client env, `.env.example`
- [x] `src/lib/money.ts` with 100% test coverage
- [x] `src/lib/dates.ts` IST helpers with boundary tests
- [x] Scripts, docs, CI workflow, `.gitignore`

Notes:

- Next.js 16.3 (Turbopack), React 19.2, Tailwind v4, Zod 4, Vitest 5, shadcn `radix-nova` style with zinc tokens.
- shadcn `form` is not in the current registry; `field` + react-hook-form + @hookform/resolvers are used instead (ADR-005).
- 139 unit tests; `money.ts` and `dates.ts` at 100% coverage (enforced for money.ts). Dates tests also pass under `TZ=America/New_York`.
- Playwright is configured, but the browsers are not installed yet (`pnpm exec playwright install` when E2E starts in Module 16).

## Module 2 — Auth & Security

- [x] Auth.js v5 (`next-auth@beta`) with GitHub, JWT sessions, `ALLOWED_EMAILS` allowlist (case-insensitive) in the `signIn` callback
- [x] User upserted on sign-in (`jwt` callback); minimal `User` model (email, name, image, locale, currency, timezone, timestamps)
- [x] Cached Mongoose connection (`src/lib/db/connection.ts`), `MONGODB_DB` (default `kaasu`)
- [x] `src/proxy.ts` (Next 16 replacement for `middleware.ts`): pages → `/login?callbackUrl=…`, `/api/*` → 401 JSON, `/api/auth/*` public, `/api/cron/*` Bearer `CRON_SECRET`, `/api/telegram/webhook` secret header (404 when the bot is not configured)
- [x] `/login` (GitHub button, error alerts) and `/login/denied` (friendly page for emails not on the allowlist)
- [x] `src/lib/crypto.ts`: AES-256-GCM, `v1:iv:tag:data`, `DecryptionError` on tampering; 100% coverage
- [x] `src/lib/auth-helpers.ts`: `requireUser`, `requirePageUser`, `UnauthorizedError`, `withAction` / `withRoute` wrappers (401 / 429 + Retry-After / 500 with details hidden)
- [x] `src/lib/rate-limit`: per-user fixed window, Mongo store (TTL buckets) with in-memory fallback; presets `ai` (20/min) and `upload` (5/min)
- [x] Security headers from `next.config.ts` (CSP, XFO DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP, HSTS in prod)
- [x] `/settings` skeleton: Profile (+ sign out), Preferences (language saved via server action; theme placeholder), Connections, Data

Notes:

- 230 unit tests. 100% coverage enforced for `crypto.ts`, `auth/allowlist.ts`, `auth/access.ts`.
- Smoke-tested against `pnpm build && pnpm start`: redirects, 401/404 JSON, cron bearer, headers. Atlas ping OK.
- Not yet verified end to end: the real GitHub OAuth round-trip in a browser (needs a manual sign-in). Playwright covers it in Module 16.
- `/` is now a protected placeholder home under `(app)`. Module 3 replaces the minimal header with the real shell.
