# Kaasu — Progress

Status: ⬜ not started · 🟡 in progress · ✅ done

| #   | Module                                                                  | Status | Notes                |
| --- | ----------------------------------------------------------------------- | ------ | -------------------- |
| 0   | Setup & accounts (GitHub, Vercel, Atlas, OAuth app, env)                | ✅     | `.env.local` present |
| 1   | Foundation (scaffold, tooling, shadcn, env, money, dates, CI)           | ✅     | 2026-09-30           |
| 2   | DB connection + Auth (Mongoose, Auth.js GitHub, allowlist, crypto)      | ✅     | 2026-09-30           |
| 3   | Data layer (Mongoose models, Zod schemas, default categories, seed)     | ✅     | 2026-09-30           |
| 4   | App shell & design system (sidebar, bottom nav, ⌘K, theme, i18n wiring) | ✅     | 2026-09-30           |
| 5   | Expenses (quick add, list, categories)                                  | ✅     | 2026-09-30           |
| 6   | Recurring / fixed expenses                                              | ⬜     |                      |
| 7   | Monthly budget                                                          | ⬜     |                      |
| 8   | Salary planning                                                         | ⬜     |                      |
| 9   | Debts & EMIs                                                            | ⬜     |                      |
| 10  | Goals & wishlist                                                        | ⬜     |                      |
| 11  | Bank-statement import & analysis                                        | ⬜     |                      |
| 12  | Investments (INDstocks/INDmoney read-only, mutual funds)                | ⬜     |                      |
| 13  | Dashboard                                                               | ⬜     |                      |
| 14  | AI financial advisor                                                    | ⬜     |                      |
| 15  | Personal assistant agent + Telegram                                     | ⬜     |                      |
| 16  | Settings, Tamil (ta) translations, data export                          | ⬜     |                      |
| 17  | Hardening: Playwright E2E, a11y/perf pass, Vercel cron & deploy         | ⬜     |                      |

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
- Not yet verified end to end: the real GitHub OAuth round-trip in a browser (needs a manual sign-in). Playwright covers it in Module 17.
- `/` is now a protected placeholder home under `(app)`. Module 4 replaces the minimal header with the real shell.

## Module 3 — Data layer

- [x] `src/lib/db/schema-helpers.ts`: `paiseField()` shared Mongoose validator for every `*Paise` field
- [x] `src/lib/db/enums.ts`: enum tuples shared between Mongoose schemas and Zod input schemas (kept mongoose-free so feature `schema.ts` files stay client-bundleable per ADR-005)
- [x] 16 new Mongoose models in `src/lib/db/models/`: Account, Category, Transaction, Recurring, Emi, MonthlyPlan, Income, Debt, Goal, StatementImport, MerchantRule, Connection, HoldingSnapshot, Task, AdvisorMessage, Insight — every model has `userId` (ref `User`, indexed) + `timestamps: true`
- [x] `User` model extended: `theme`, `payday`, `salaryMinPaise`, `salaryMaxPaise`, `dailyReminderTime`, `telegramChatId` (encrypted, `select: false`), `onboardingDone`
- [x] Zod input schemas per model, in the owning feature's `schema.ts` (expenses, recurring, budget, salary, debts, goals, statements, investments, assistant, advisor, settings)
- [x] Read-only `queries.ts` repository helpers per feature, always scoped by `userId`, `.lean()`
- [x] `computeDedupeHash` (`expenses/service.ts`) + unique partial `(userId, dedupeHash)` index on Transaction (not `sparse` — see ADR-017)
- [x] `computeOutstandingPaise` (`debts/service.ts`) + Mongoose virtual on Debt (virtuals don't survive `.lean()`, so `debts/queries.ts` computes it manually)
- [x] `DEFAULT_CATEGORIES` + `ensureDefaultCategories(userId)` in `settings/service.ts`, wired into `src/lib/auth.ts`'s `jwt` callback right after `upsertUserOnSignIn`
- [x] `scripts/seed-demo.ts` + `pnpm seed:demo` (new `tsx` devDependency); idempotent, fake data only, scoped to one fixed demo user
- [x] `docs/DATA_MODEL.md`: Mermaid ER diagram + prose
- [x] ADR-011..ADR-017 in `docs/DECISIONS.md`

Notes:

- 244 unit tests (up from 230): new suites cover `computeDedupeHash` (expenses) and `computeOutstandingPaise` (debts), including the IST-day boundary and overpayment-clamping edge cases.
- `tsx` resolves the `@/*` tsconfig path alias and forwards `--env-file` to Node out of the box. The real `server-only` package throws unconditionally outside Next's build, so `scripts/tsconfig.json` (used only by `tsx --tsconfig`, not by `pnpm typecheck`) aliases it to the same no-op stub Vitest uses.
- `pnpm seed:demo` **was** run against the real Atlas cluster (`.env.local`'s `MONGODB_URI`), twice in a row to confirm idempotency (identical counts both times, no duplicate-key errors on the second run): 3 Accounts, 17 Categories, 50 Transactions, 4 Recurring, 1 Emi, 2 MonthlyPlan, 2 Income, 2 Debt, 2 Goal, 1 StatementImport, 3 MerchantRule, 1 Connection, 1 HoldingSnapshot, 3 Task, 3 AdvisorMessage, 2 Insight. Indexes spot-checked live via `Model.collection.indexes()`: Transaction has `(userId,date)`, the unique partial `(userId,dedupeHash)`, and the text index; MonthlyPlan has the unique `(userId,monthKey)`. First-login bootstrap verified separately (fresh user → exactly 17 categories, unchanged on a second call).
- This live run caught a real bug — a plain `sparse` compound index doesn't exclude a document just because _one_ field is missing (only when _all_ indexed fields are missing), so `{userId, dedupeHash}` was indexing every transaction and colliding. Fixed with `ignoreUndefined: true` on the connection plus `partialFilterExpression` on every compound index over an optional field, see ADR-017.
- Every module from the previous Module 3 onward shifted down by one (old "3 App shell" → 4, ... old "16 Hardening" → 17) to make room for this module.

## Module 4 — App shell & design system

- [x] Theme: `next-themes` wired into the root layout (`attribute="class"`, `enableSystem`), seeded from `User.theme` server-side and persisted back via a new `updateTheme` action; `prefers-reduced-motion`-guarded colour transition on `<body>`
- [x] Fonts: `Inter` (UI) + `Noto Sans Tamil` (auto-applied via `[data-locale="ta"]` overriding `--font-sans`); money/number figures use `tabular-nums`, not a separate monospace face
- [x] New CSS tokens: `--positive`/`--warning`/`--negative` (emerald/amber/rose, light + dark), backing `MoneyText` and `ProgressRing`
- [x] `next-intl` wired without URL routing (ADR-018): `src/lib/session-preferences.ts` + `src/i18n/request.ts` resolve locale/theme once per request; `src/messages/{en,ta}.json` populated for every string this module introduces; Settings' Language/Theme rows and the home page greeting now go through `t()`
- [x] App shell for `(app)`: shadcn-generated `sidebar.tsx` (ADR-020) wrapped as `AppSidebar` (11 nav destinations), mobile `BottomNav` (Home/Expenses/floating "+"/Budget/More sheet), `UserMenu` (theme + language + settings + sign out)
- [x] Global Quick Add (`⌘/Ctrl+N`, "+", or command palette): responsive Dialog/Drawer, wired to a real (if minimal) `submitQuickAdd` action in `src/features/expenses/actions.ts` that validates and returns `ok()` without persisting — Module 5 fills in the write
- [x] Command palette (`⌘K`): navigate to any of the 11 destinations, or trigger Quick Add / a "coming soon" toast for Plan-this-month and Ask-advisor
- [x] Shared components in `src/components/shared/`: `AmountInput`, `MoneyText`, `CategoryPicker`, `AccountPicker`, `DatePickerIST`, `MonthSwitcher`, `StatCard`, `ProgressRing`, `EmptyState`, `PageHeader`, `ConfirmDialog` — all built on `src/lib/money.ts`/`src/lib/dates.ts` (two new date helpers: `shiftMonthKey`, `formatMonthLabel`), never reimplementing formatting/parsing
- [x] `/styleguide` (dev-only, `requirePageUser()` + `NODE_ENV` guard): one instance of every shared component, themed/localised via the real shell switchers
- [x] Component tests: `amount-input.test.tsx`, `money-text.test.tsx`

Notes:

- 260 unit tests (up from 244): +11 for `shiftMonthKey`/`formatMonthLabel`, +11 for `AmountInput`, +6 for `MoneyText`. Testing Library's auto-cleanup needed an explicit `afterEach(cleanup)` in `src/test/setup.ts` since `vitest.config.mts` doesn't set `test.globals`.
- `pnpm dlx shadcn@latest add sidebar` also generated `src/hooks/use-mobile.ts`; its `setState`-inside-`useEffect` body tripped the repo's `react-hooks/set-state-in-effect` lint rule, so it was rewritten to delegate to a new `src/hooks/use-media-query.ts` (`useSyncExternalStore`-based, also used for the Quick Add drawer/dialog breakpoint switch) — same behavior, no lint violation. The same rule required a `useSyncExternalStore`-based `useHydrated()` hook in `ThemeSelect` instead of the common `useEffect(() => setMounted(true), [])` idiom.
- Verified against the real Atlas cluster: signed in as the seeded demo user (`demo@kaasu.local`) via a locally-minted session JWT, `pnpm build && pnpm start` smoke test (redirects, security headers, `/styleguide` 404s outside dev), then `pnpm dev` with the same session to confirm `/`, `/settings`, and `/styleguide` render every new component with no server errors, and that switching the demo user's `User.locale` to `ta` correctly flips `<html lang>`/nav copy to Tamil end-to-end.
- Not yet verified in an actual browser: the real GitHub OAuth round-trip, visual dark-mode/light-mode appearance, and keyboard-only operation of the command palette / Quick Add — same gap Module 2 left for Playwright (Module 17).
- Nav links to `/expenses`, `/budget`, `/recurring`, `/debts`, `/goals`, `/statements`, `/investments`, `/advisor`, `/tasks` intentionally 404 until their modules ship — no "coming soon" flags to retire later.

## Module 5 — Expenses

- [x] `submitQuickAdd` (`src/features/expenses/actions.ts`) now writes a real `Transaction` — `dedupeHash` never set (source is always `"manual"`, ADR-013) — plus `updateTransaction`, `deleteTransaction`, `bulkDeleteTransactions`, and `loadMoreTransactions` (a read, exposed as a server action so the client-side infinite scroll can call it)
- [x] Quick Add's smart text box: `src/features/expenses/parser.ts` (`parseQuickAddText`, pure, no I/O) — amount via the existing `parseAmount`, date via a new `parseRelativeDateToken` (`src/lib/dates.ts`), account/category via keyword maps (English + Tamil-English), a learned `MerchantRule` winning over the keyword map. Rendered as tappable, pin-on-edit chips in `src/components/shared/quick-add-textbox.tsx`
- [x] Structured fallback form (`quick-add-structured-form.tsx`, extracted from `quick-add-sheet.tsx` to stay under ~300 lines): amount, category, account, date, merchant, note, tags (new `tag-input.tsx`)
- [x] Income entry: a third Quick Add mode, `IncomeSourcePicker` + `features/salary/actions.ts::submitIncome` — writes to `Income`, never `Transaction` (ADR-021)
- [x] Last-used category/account remembered via `localStorage` (`use-local-storage-value.ts`, `useSyncExternalStore`-based to stay SSR-safe and avoid the repo's `set-state-in-effect` lint rule), Enter-to-save, and a 5s Undo toast (commit-then-`deleteTransaction`, ADR-027)
- [x] Merchant learning: `features/expenses/merchant-rules.ts` (`normaliseMerchant`, `matchMerchantRule`, `nextRuleState`) — upserts on every save with a merchant + category, reinforcing confidence on a repeat, resetting on a correction (ADR-025); matching is case-insensitive exact-string for now (ADR-026)
- [x] `ensureDefaultAccounts` (`features/settings/service.ts`, mirroring `ensureDefaultCategories`'s idempotent `bulkWrite`) seeds Cash + UPI on every sign-in, wired into `src/lib/auth.ts`'s `jwt` callback — a brand-new user's Quick Add always has an account to log against
- [x] `/expenses`: day-grouped list with sticky headers + day totals (`expense-list.tsx`, `expense-day-group.tsx`), filters (month/category/account/source/search) synced to the URL (`expense-filters-bar.tsx`), cursor-paginated (`date desc, _id desc`) infinite scroll via `IntersectionObserver`, swipe-to-edit/delete on mobile (new generic `swipeable-row.tsx`, raw Pointer Events + CSS transitions only) and checkbox bulk-select + a bulk delete bar on desktop, an edit dialog reusing the structured form
- [x] CSV export: `GET /expenses/export` route handler (not a server action — the browser needs to drive the download), pure `transactionsToCsv` (`features/expenses/csv.ts`) — plain decimal amounts, never `formatINR`, RFC-4180 escaping
- [x] "Safe to spend today" engine (`features/expenses/safe-to-spend.ts`, pure): a no-plan fallback formula and a plan-based formula (switches automatically once a `MonthlyPlan` exists for the month, per ADR-022/023) with a fixed 🟢/🟡/🔴 ratio threshold; data gathered in the new `features/expenses/insights-queries.ts` (kept separate from `queries.ts` to stay under ~300 lines)
- [x] Daily guidance card (`features/expenses/guidance.ts`, pure): up to 3 ranked nudges — per-category plan progress, the safe-to-spend status (always present), and a this-week-vs-same-week-last-month pace check (ADR-024)
- [x] Decided with the product owner: Income entries never appear in the `/expenses` list/filters/export; the safe-to-spend/guidance cards live only on `/expenses`, not Home; a brand-new user with no salary data sees the hero card anyway (🔴, ₹0/day, with a hint to set salary in Settings) rather than an empty state

Notes:

- 346 unit tests (up from 260): +12 `dates.ts` (`parseRelativeDateToken`, `endOfDayIST`, `trailingWeekRangeIST`), 24 `parser.test.ts`, 9 `merchant-rules.test.ts`, 16 `safe-to-spend.test.ts`, 10 `guidance.test.ts`, 8 `csv.test.ts`. `queries.ts`/`insights-queries.ts`/`actions.ts` and every new client component are, per this repo's existing convention (no `queries.test.ts`/`actions.test.ts` exists anywhere), verified manually instead.
- Verified against the real Atlas cluster (not just `pnpm build`, which also passed cleanly with `/expenses` and `/expenses/export` both correctly generated as dynamic routes): a one-off script exercised every new read (`listMerchantRules`, cursor pagination with no overlap between pages, `$text` search, uncapped export, `getSafeToSpendData` against the demo user's real seeded `MonthlyPlan`, `getGuidanceCategoryProgress`) and every new write (`Transaction.create` with `dedupeHash` confirmed unset, `isReviewed` defaulting `true` for `manual`, the merchant-rule reinforce/reset cycle, update, delete) end-to-end with real numbers.
- Not verified in an actual browser this module: the interactive Quick Add flow (smart-text chip tap-to-edit, mode switching), swipe gestures, and infinite scroll — this environment has no way to drive a signed-in browser session (GitHub OAuth needs a real redirect; Playwright's browsers aren't installed, see Module 1's note). Same gap as Modules 2 and 4 leave for Playwright (Module 17); flagging explicitly rather than claiming it was checked.
- The demo seed's existing `MerchantRule` rows use a trailing-wildcard `pattern` (e.g. `"swiggy*"`) anticipating the fuller pattern-matching engine ADR-014 defers to a later statements-import module; this module's exact-string matcher does not match those wildcard rows against plain "swiggy" text — expected, not a bug, given ADR-026.
