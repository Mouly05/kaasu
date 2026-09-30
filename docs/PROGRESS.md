# Kaasu — Progress

Status: ⬜ not started · 🟡 in progress · ✅ done

| #   | Module                                                                  | Status | Notes                |
| --- | ----------------------------------------------------------------------- | ------ | -------------------- |
| 0   | Setup & accounts (GitHub, Vercel, Atlas, OAuth app, env)                | ✅     | `.env.local` present |
| 1   | Foundation (scaffold, tooling, shadcn, env, money, dates, CI)           | ✅     | 2026-09-30           |
| 2   | DB connection + Auth (Mongoose, Auth.js GitHub, allowlist, crypto)      | ⬜     |                      |
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
