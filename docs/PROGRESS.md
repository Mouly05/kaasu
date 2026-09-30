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
| 6   | Recurring / fixed expenses                                              | ✅     | 2026-09-30           |
| 7   | Monthly budget                                                          | ✅     | 2026-09-30           |
| 8   | Salary planning                                                         | ✅     | 2026-09-30 (built with Module 7, see below) |
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

## Module 6 — Recurring & EMIs

- [x] `src/features/recurring/emi.ts` (pure, no I/O): reducing-balance EMI calculator — monthly EMI, full amortization schedule, total paid, total interest, processing fee + GST, extra cost vs. cash price, effective annual cost % (ADR-036), `isNoCostEmi`/`noCostGapPaise` no-cost checker
- [x] `src/features/recurring/service.ts` (pure): `computeNextDueDate` (monthly/yearly/weekly; `custom` always `null`, ADR-035), `isPaidForMonth`, `computeMonthlyTotal`, `computeYearlySubscriptionCost`, `computeEmiLoadPercent` (10% default soft warning, fixed 20% hard warning), `buildEmiInstallments` (stamps calendar due dates onto the pure schedule)
- [x] New generic `src/lib/dates.ts` helpers backing the above: `daysUntilIST`, `nthMonthlyOccurrenceIST`, `nextAnniversaryIST`, `nextIntervalOccurrenceIST` — all IST-aware, all with Feb-clamping/leap-year tests; `src/lib/money.ts`'s `roundToPaise` is now exported (was module-private) for `emi.ts`'s schedule rounding
- [x] `src/features/recurring/queries.ts` extended: `listRecurringWithStatus` (next due date, days until, paid-this-month, grouped by `kind` in the page layer), `getUpcomingDues` (next 7 days, built to be reused as-is by a later Dashboard module), `listAutoLogDueToday` (cron-only, across all users, already-paid-this-month excluded); `src/features/debts/queries.ts` gained `getEmiById` next to the existing `listEmis` (ADR-038)
- [x] `src/features/recurring/actions.ts`: `createRecurring`/`updateRecurring`/`deleteRecurring`/`toggleAutoLog`, `markRecurringPaid` (thin wrapper around a plain `logRecurringPayment` also called by the cron route), `createEmi` (writes `Recurring` then `Emi` sequentially, compensating delete on failure, ADR-037), `markEmiInstallmentPaid`
- [x] `/recurring`: kind-grouped cards (Rent/Family support/SIP/Subscriptions/EMIs/Other fixed, matching `RECURRING_KINDS` 1:1), monthly total + yearly-subscription-cost stat tiles, EMI load meter, 7-day upcoming panel, an "Add fixed item" dialog and an EMI calculator/creator dialog (live-computed schedule, no-cost warning banner, payment-method reminder note) — both self-contained with their own trigger button, following `ConfirmDialog`'s local-state pattern rather than a page-level orchestrator
- [x] First cron route in the repo: `GET /api/cron/recurring-autolog` (re-checks `isCronAuthorized` itself per CLAUDE.md's convention, on top of `src/proxy.ts`'s gate) + `vercel.json` (new file; one daily entry, `30 18 * * *` UTC = 00:00 IST, Hobby plan's daily-only limit)
- [x] `recurring` message namespace added to both `en.json`/`ta.json`, mirroring `expenses`' nesting; `shell.nav.recurring` already existed and pointed at this page since Module 4

Notes:

- 395 unit tests (up from 346): +12 `dates.ts` (the four new helpers above, including Feb leap/non-leap clamping and a future-anchor weekly cycle case), +17 `emi.test.ts` (the user's real numbers as the primary cases — ₹25,000 tab and ₹13,000 phone, 9 and 12 month no-cost EMI, ₹199 processing fee + 18% GST — plus a closed-form single-installment sanity check and a multi-month reducing-balance invariant check), +20 `service.test.ts`. `queries.ts`/`actions.ts`/the cron route/every client component follow this repo's existing convention (no `queries.test.ts`/`actions.test.ts` anywhere) and were verified manually instead.
- Verified against the real Atlas cluster with a one-off script (not committed): created the user's actual recurring items (Rent ₹7,000, Mom ₹5,000, SIP ₹3,500, subscriptions ₹200/₹130/₹189 → confirmed ₹519/mo = ₹6,228/yr exactly), confirmed `listAutoLogDueToday` finds a due autoLog item and then correctly finds zero after `logRecurringPayment` runs (cron idempotency), created the real ₹25,000/9-month no-cost EMI (confirmed `noCostGapPaise` = ₹234.82, matching ₹199 + 18% GST exactly) and marked its first installment paid, checked the EMI load meter's percentage, and checked `getUpcomingDues`. All verification documents were deleted at the end of the run. Also a from-scratch `rm -rf .next && pnpm build`, which correctly generated `/recurring` and `/api/cron/recurring-autolog` as dynamic routes.
- Not verified in an actual browser this module: the EMI calculator dialog's live-typing behaviour, the mark-as-paid/autoLog-toggle interactions, and dark/light rendering of the new cards — same environment gap Modules 2/4/5 flagged (no way to drive a signed-in browser session here; Playwright lands in Module 17).
- `RecurringCard`'s "mark as paid" calls `markEmiInstallmentPaid` (not the generic `markRecurringPaid`) for EMI-kind items, targeting the first installment without a `paidAt`, so the `Emi.installments` schedule and the generic "paid this month" badge (driven by the linked `Transaction`) never drift out of sync with each other.

## Post-Module-5 fix — self-hosted fonts

The first Vercel deploy of this branch failed (`next/font/google queries have exactly one entry`, a known intermittent Turbopack + Google Fonts build-time bug — see ADR-034), even though it wasn't caught by `pnpm build` locally. Switched both fonts in `src/app/layout.tsx` from `next/font/google` to `next/font/local`, with the actual `.woff2` files checked into `src/app/fonts/`. Re-verified with a from-scratch `rm -rf .next && pnpm build` (no cache to hide the issue) plus lint/typecheck/the full test suite, all clean, with zero network calls to Google Fonts during the build.

## Module 7 — Budget & salary (bundles Module 8, Salary planning)

- [x] `MonthlyPlanLine` (Module 3's model) extended, additively: `deferredFrom` (the defer trail) and `recurringId`/`debtId`/`goalId` (auto-draft provenance, so budget-vs-actual can match a line back to real spend); `User` gains `needsTargetPct`/`wantsTargetPct`/`savingsTargetPct`/`debtTargetPct` (default 50/30/20/0) for the salary analyser's editable target split
- [x] `features/budget/service.ts` (pure, no I/O): bucketing (`Recurring.kind` → must/save/want/emi, `Goal.kind` → want/save, `Category.group` → must/want/save/debt), `computeSuggestedDebtRepayment` (repeats the last repayment, else the full balance, clamped to what's owed), `computeSuggestedGoalContribution` (paces to `targetDate` if set, else the goal's own recent average), `buildDraftLines` (the auto-draft composer), `computeBucketTotals`/`computePlanSummary` (over-allocation), `swapLinePriority` (reorder), `deferLineToNextMonth` (the defer trail, including chained re-defers), `computeWhatIfFunding` (priority-ordered funding of the extra between min and max salary), `computeRolloverCandidates`/`computeTotalRollover`, `copyPlanLines`, `computeBudgetVsActual` (under/tight/over)
- [x] `features/salary/service.ts` (new, pure): `computeBudgetSplit` (needs/wants/savings/debt as % of income, plus a true "savings rate" — leftover after needs/wants/debt, distinct from savings-category spend, can go negative under deficit spending), `compareToTarget`, `computeFixedCostRatio`, `computeRunwayMonths`, `generateTrendInsights` (rule-based, savings-rate deltas + a 3-month average + a fixed-cost warning)
- [x] `features/budget/queries.ts`: `getDraftInputs` (active monthly Recurring, open `i_owe` Debts, active Goals, last-3-months average variable spend per category — zero-filled, debt-group categories skipped since Debts already cover that bucket), `getPlanActuals` (actual spend per line via its recurring/debt/goal/category link); `getMonthlyPlan`/`listMonthlyPlans` now convert every line's ObjectId fields to plain strings (`PlanLine`, not the raw Mongoose `MonthlyPlanLine`) — required for the plan to cross the RSC boundary into `PlannerClient` at all
- [x] `features/salary/queries.ts`: `getMonthlyFinancialsHistory` (income + needs/wants/savings/debt actuals, 6 months, oldest first), `getBudgetTargets`, `getEmergencyFundSavedPaise`
- [x] `features/budget/actions.ts`: `saveMonthlyPlanLines` (the one write primitive behind add/edit/delete/reorder/status-toggle — replaces the month's whole `lines` array, since lines have no `_id` to address individually), `autoDraftPlan` (only when the month has no lines yet, plans on `salaryMinPaise`), `deferPlanLine` (writes both months), `copyLastMonthPlan`, `applyRollover` (to next month's buffer or a chosen goal)
- [x] `features/salary/actions.ts` gains `updateSalaryPreferences` (payday + min/max) and `updateBudgetTargets` (must sum to 100%)
- [x] `/budget` redirects to `/budget/[monthKey]` for the current IST month; the planner: `PlanSummaryBar` (Income/Planned/Unallocated, "every rupee has a job" at ₹0), six collapsible `WaterfallSection`s (Must→Debt→Save→EMI→Want→Buffer) with `PlanLineRow` (▲/▼ priority reorder, paid toggle, edit/delete, swipe-to-defer on mobile via the existing `SwipeableRow`), `LineFormDialog` (add/edit), `WhatIfSlider` (shadcn `slider`, added via CLI — same precedent as the sidebar in ADR-020) showing which want/deferred lines a higher salary would fund first, `BudgetVsActualList` (progress bars, under/tight/over), `RolloverDialog`
- [x] `/salary`: `IncomeHistoryChart` (Recharts, first chart in the app — `recharts` added as a dependency per CLAUDE.md's own tech-stack table; single-series bar, `dataviz` skill's guidance followed: no legend needed for one series, `currentColor`/`text-positive` for the fill rather than a new palette, hover tooltip), `BudgetSplitCard` (actual-vs-target bars with a target tick, status-coloured), `TargetSplitEditor`, `RunwayCard`, `TrendInsightsList`
- [x] Settings gains a "Salary" section (`SalaryProfileForm`: payday + min/max) — no onboarding wizard exists anywhere in the app yet (`onboardingDone`/`onboardingSchema` are still unused Module-3 stubs), so this is the only place to set it for now
- [x] `budget`/`salary` message namespaces added to both `en.json`/`ta.json`

Notes:

- 440 unit tests (up from 395): +31 `budget/service.test.ts` (including the user's real October plan against their real ₹50,000 minimum salary — confirms `unallocatedPaise` = ₹141, `status: "under"` — a what-if funding-order case using their real ₹4,000 min–max gap funding "extra gold" before "air fryer" by priority, and a two-hop deferral chain), +14 `salary/service.test.ts`.
- Verified against the real Atlas cluster with a one-off script (not committed, deleted after): `getDraftInputs`/`buildDraftLines` against the demo user's real Recurring/Debt/Goal/category data; confirmed `getMonthlyPlan` now returns plain string ids (not Mongoose `ObjectId`s — the bug this module's `PlanLine` refactor exists to fix, since the planner page passes the plan straight into a Client Component); `getPlanActuals` → `computeBudgetVsActual` and the rollover total against the demo user's seeded plan and transactions; a full auto-draft → defer-to-next-month → copy-last-month → rollover-into-a-goal chain end to end (each step's DB state checked, then the goal's `savedPaise` reverted and the extra test months deleted so the seed is left exactly as `pnpm seed:demo` produced it); every `salary/queries.ts` function. Also a from-scratch `rm -rf .next && pnpm build`, which correctly generated `/budget`, `/budget/[monthKey]` and `/salary` as dynamic routes.
- Not verified in an actual browser this module: the planner's ▲/▼ reorder buttons, swipe-to-defer, the what-if slider's live feel, and dark/light rendering of the new chart — same environment gap every prior module has flagged (no way to drive a signed-in browser session here; Playwright lands in Module 17).
- `docs/DECISIONS.md` gained ADR-039 through ADR-046 for this module's design calls: recurring/goal/category bucketing, suggested-repayment/contribution formulas, the additive schema fields, ▲/▼ over pointer drag-and-drop, whole-array `lines` replacement (no per-line `_id`), the leftover-based savings rate, deferring the onboarding step, and rollover/budget-vs-actual being computed at page-load rather than kept live-reactive to unsaved client-side plan edits.
