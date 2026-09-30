# Architecture Decision Records

Format: context → decision → consequences. Newest at the bottom. Never edit an accepted ADR; supersede it.

## ADR-001: Money is stored as integer paise

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** Binary floats cannot represent most decimal rupee values (`0.1 + 0.2 !== 0.3`). Sums, splits and percentages drift, and budgets must reconcile to the paisa.
- **Decision:** Every amount is an integer number of paise (`amountPaise: number`, ₹1 = 100). It is converted once at the input boundary (`toPaise`/`parseAmount`) and formatted only at the UI edge (`formatINR`, `en-IN`). Arithmetic goes through `src/lib/money.ts` helpers, which reject non-safe-integers. Percentages round half away from zero.
- **Consequences:** Exact sums and comparisons. `Number.MAX_SAFE_INTEGER` paise ≈ ₹90 trillion, far beyond need. Every schema field that holds money is named `*Paise`. Charts may call `fromPaise` for display only.

## ADR-002: Env validation is shared, with an explicit skip flag

- **Date:** 2026-09-30 · **Status:** Accepted
- **Decision:** Zod schemas live in `src/lib/env-schema.ts` (no `server-only`, so config and tests can use them). `src/lib/env.ts` (server-only) and `src/lib/env.client.ts` parse at import. `next.config.ts` also parses the env at startup so `pnpm dev`/`pnpm build` fail fast. Errors list keys and rules, never values. `SKIP_ENV_VALIDATION=1` bypasses parsing for CI jobs that have no secrets.
- **Consequences:** A misconfigured deploy fails at build time rather than on the first request. The skip flag must never be set on Vercel.

## ADR-003: AI provider keys are optional at boot

- **Date:** 2026-09-30 · **Status:** Accepted
- **Decision:** `AI_PROVIDER` is validated at boot. The matching `*_API_KEY` is checked by the AI module when it first runs, not at boot.
- **Consequences:** The app (expenses, budget, etc.) runs without any AI key. AI features show a clear "configure provider" state instead.

## ADR-004: Lint via ESLint CLI, not `next lint`

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** Next.js 16 removed `next lint`.
- **Decision:** `pnpm lint` runs `eslint .` with the flat config (`eslint-config-next` + `eslint-config-prettier`). Formatting is Prettier's job only.

## ADR-005: shadcn `field` instead of `form`; zinc tokens applied manually

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** The current shadcn CLI (v4, `radix-nova` style) no longer ships the `form` component, and its `init` has no base-colour flag (it defaulted to `neutral`).
- **Decision:** Forms use shadcn `field` primitives with `react-hook-form` + `@hookform/resolvers/zod` directly. The zinc light/dark tokens from the official registry (`/r/colors/zinc.json`) are written into `globals.css`, and `components.json` is set to `baseColor: "zinc"`.
- **Consequences:** Same form stack as CLAUDE.md (react-hook-form + Zod), with a thin wrapper to write in `components/shared` when the first form lands.

## ADR-006: `typecheck` runs `next typegen` first

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** Next 16 exposes typed route globals (`LayoutProps`, `PageProps`) generated into `.next/types`. They don't exist on a clean checkout (CI).
- **Decision:** `pnpm typecheck` = `next typegen && tsc --noEmit`.

## ADR-007: `proxy.ts` gate + split Auth.js config

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** Next 16 renamed `middleware.ts` to `proxy.ts` (Node runtime only). The proxy should stay light and must not open DB connections.
- **Decision:** `src/lib/auth/config.ts` has no DB access (GitHub provider, allowlist `signIn`, session mapping) and is used by `src/proxy.ts`. `src/lib/auth.ts` extends it with the `jwt` callback that upserts the User on sign-in and stores `userId` in the token. Access rules live in the pure `decideAccess()` (`src/lib/auth/access.ts`), which is unit-tested. Secrets are compared in constant time (sha256 + `timingSafeEqual`). The proxy is the first gate only: pages call `requirePageUser()`, and actions and route handlers call `requireUser()` or check their own secret.
- **Consequences:** JWT sessions mean no sessions collection. Revoking access = remove the email from `ALLOWED_EMAILS` and rotate `AUTH_SECRET`. Existing JWTs stay valid until expiry (30 days) otherwise.

## ADR-008: Static CSP with `'unsafe-inline'` scripts (no nonces)

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** A nonce CSP forces every page to be dynamically rendered and rules out static/PPR pages. Next's bootstrap scripts and next-themes' no-flash script are inline.
- **Decision:** The CSP is built in `src/lib/security-headers.ts` and applied from `next.config.ts` `headers()`. `script-src 'self' 'unsafe-inline'` (+ `'unsafe-eval'` in dev only), `style-src 'self' 'unsafe-inline'`, `frame-ancestors 'none'`, `object-src 'none'`, `form-action 'self' https://github.com`, `img-src` allows GitHub avatars.
- **Consequences:** XSS defence rests on React escaping plus Zod validation more than on the CSP. Revisit with nonces or experimental SRI once the app is stable. Add third-party origins here explicitly if one is ever needed.

## ADR-009: Rate limiting = fixed window in Mongo, memory fallback

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** Serverless instances don't share memory; no paid Redis on the free tier.
- **Decision:** `createRateLimiter` counts per `name:userId` per window using an atomic `$inc` upsert in `ratelimitbuckets` (TTL index on `expiresAt`). If Mongo throws, it falls back to an in-process memory store (logged) instead of failing open completely.
- **Consequences:** One small write per limited request. Fixed windows allow up to 2× the limit across a window boundary, which is acceptable for cost protection.

## ADR-010: `MONGODB_DB` selects the database

- **Date:** 2026-09-30 · **Status:** Accepted
- **Decision:** Optional `MONGODB_DB` (default `kaasu`) is passed as Mongoose `dbName`, overriding any path in `MONGODB_URI`, so an Atlas URI copied without a database never writes to `test`.

## ADR-011: `userId` is an ObjectId ref, not a raw string

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** `RateLimitBucket.userId` is a raw string because it's part of a composite `_id`, not a document relationship.
- **Decision:** Every Module 3+ model uses `userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }`, matching `User._id`'s real type — idiomatic Mongoose ref semantics, and `.populate()`-able if ever needed.
- **Consequences:** Query helpers accept `userId: string` and Mongoose casts it. Every new `queries.ts` guards with `isValidObjectId(userId)` first, the same pattern `settings/queries.ts` already used.

## ADR-012: `paiseField()` — one shared Mongoose validator for every money field

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** ~30 `*Paise` fields across 16 new models all need the same "safe integer, no floats" guarantee that Zod already enforces at the action boundary (ADR-001).
- **Decision:** `src/lib/db/schema-helpers.ts` exports `paiseField(options)`, composing `required`/`default`/`min`/`allowNegative`, used on every money field.
- **Consequences:** One place to change the invariant later; defense-in-depth if a write action, script, or migration ever bypasses Zod.

## ADR-013: `Transaction.dedupeHash` is a sparse unique index, computed only for automated sources

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** Bank-statement re-imports and retried webhook/AI calls can create duplicate rows; manual, deliberate same-day/same-amount entries (two coffees) are legitimate and must never collide, and a `recurring` auto-log entry is deliberately repeated every cycle by design.
- **Decision:** `computeDedupeHash` (`src/features/expenses/service.ts`) hashes an IST-calendar-day-normalised date, the amount, direction, and a whitespace/case-normalised merchant (sha256). It is computed only for `source: "statement" | "telegram" | "ai"` — never `manual` or `recurring`. The Mongo index is `{userId, dedupeHash}` **unique and partial** (not `sparse` — see ADR-017), so documents without a hash never participate in the uniqueness constraint.
- **Consequences:** A duplicate statement row fails to insert (surfaced as a "duplicate" by the statements-import feature in a later module); manual entries are always free to repeat.

## ADR-014: `MerchantRule.pattern` is a safe literal-with-wildcard, never a live user-controlled `RegExp`

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** Compiling arbitrary user input directly into `new RegExp(input)` is a ReDoS and injection risk.
- **Decision:** `pattern` is stored as a plain string (`maxlength: 100`). Matching (implemented in the statements-import module) escapes every regex metacharacter except `*` (treated as a wildcard → `.*`), so no nested-quantifier syntax is ever reachable and catastrophic backtracking is structurally impossible.
- **Consequences:** Rules are less expressive than full regex (no anchors, character classes, alternation) — an acceptable trade for guaranteed-safe matching on user-supplied patterns.

## ADR-015: `pnpm seed:demo` runs via `tsx` + Node's native `--env-file`

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** No standalone TS script runner existed yet; the project prefers the platform over extra dependencies where it suffices (CLAUDE.md §3).
- **Decision:** Added `tsx` as a devDependency to run `scripts/seed-demo.ts` directly. `.env.local` loads via Node 22's built-in `--env-file` flag rather than `dotenv` — verified directly that `tsx --env-file=<path>` forwards the flag to the underlying Node process, and that `tsx` resolves the project's `@/*` tsconfig path alias without extra config. The real `server-only` package throws unconditionally outside Next's webpack build (it has no special-case for plain Node), so `scripts/tsconfig.json` (used only via `tsx --tsconfig`, never by `pnpm typecheck`) adds a `paths` alias remapping `server-only` to the same no-op stub Vitest already uses (`src/test/server-only.ts`) — verified directly that `tsx --tsconfig` honours a `paths` override for a real npm package specifier, not just local aliases.
- **Consequences:** One new devDependency (`tsx`), zero others. `scripts/seed-demo.ts` uses the same `@/lib/...` imports, including `server-only`-guarded modules, as the rest of the app.

## ADR-016: Minor field/enum shapes not fully specified in the Module 3 brief

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** Several fields were named in the Module 3 brief without an exact enum or shape: `StatementImport.status`, `Connection.status`, `Goal.status`, `Insight.severity`/`type`, `AdvisorMessage.toolCalls`, `HoldingSnapshot.totals`, `MonthlyPlan.lines[].categoryId` nullability, `Category.group` requiredness, uniqueness on `Category.name`/`Connection.provider`/`MerchantRule.pattern`, and clamping behaviour for `Debt.outstandingPaise` on overpayment.
- **Decision:** Picked the simplest option consistent with the rest of the schema in each case (see `docs/DATA_MODEL.md` and the model files themselves for the exact resolution) rather than opening a design discussion per field, per CLAUDE.md §7.3 ("pick the simplest option that keeps the design generic, note it, and continue").
- **Consequences:** Any of these can be revisited additively later (a new enum value, a follow-up ADR) without a breaking migration, since Mongoose enums/validators only reject at write time, not at read time.

## ADR-017: Partial indexes, not `sparse`, for compound "optional field" indexes

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** Verified live against Atlas (`pnpm seed:demo`): a plain `sparse` compound index only excludes a document when _every_ indexed field is missing. Since `userId` is always present, `{userId, dedupeHash}` with `sparse: true` indexed every `Transaction` regardless of `dedupeHash`, so the unique constraint collided on the first two manual transactions (both indexed with an effective `dedupeHash: null`). Separately, the MongoDB driver's BSON serializer writes an unset field as an explicit `null` by default rather than omitting the key, which also defeats `$exists`-based exclusion unless disabled.
- **Decision:** `src/lib/db/connection.ts` passes `ignoreUndefined: true` to `mongoose.connect`, so a field that was never set is genuinely absent from the stored document instead of `null`. Every compound index over an optional field (`Transaction.dedupeHash`/`recurringId`/`debtId`/`goalId`, `Debt.dueDate`, `Emi.recurringId`, `Insight.dismissedAt`) uses `partialFilterExpression: { <field>: { $exists: true } }` instead of `sparse: true`.
- **Consequences:** Both changes are required together — `ignoreUndefined` without the partial filter still indexes explicit `null`s (if some other write path set one); the partial filter without `ignoreUndefined` still includes docs whose field was serialized to `null`. Any future compound index over an optional field must follow the same pattern, not plain `sparse`.

## ADR-018: i18n resolved server-side, no `[locale]` URL routing

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** Module 4 needed real `next-intl` wiring for `en`/`ta`. `User.locale` already existed as a persisted per-user preference with a working settings UI (`LanguageSelect`); there is no anonymous multi-locale surface or SEO need (a private, single-tenant-per-login finance app), and `[locale]` segment routing would require rewriting `decideAccess`/`PUBLIC_PAGES` and every existing `Link`/`redirect()` across Modules 1–3.
- **Decision:** `next-intl` runs without URL routing. `src/lib/session-preferences.ts` (`server-only`, `cache()`-wrapped) resolves `{ locale, theme }` once per request: signed-in users get `User.locale`/`User.theme` from one `findById`; everyone else falls back to `NEXT_LOCALE`/`kaasu-theme` cookies, defaulting to `en`/`system`. `src/i18n/request.ts` feeds this into `next-intl/plugin`'s `createNextIntlPlugin`, and the root layout wraps `children` in `NextIntlClientProvider`. `updatePreferences` also sets the `NEXT_LOCALE` cookie and revalidates the whole layout (not just `/settings`), so a logged-out visit after changing language still lands in the right language.
- **Consequences:** No `/en`/`/ta` URLs, ever — if a future module needs locale-aware URLs (e.g. public marketing pages), that's a breaking change requiring a new ADR. Every server component that needs translated text uses `getTranslations`/`useTranslations` from `next-intl`, scoped by area (`shell.*`, `commandPalette.*`, `settings.*`, `shared.*`, `styleguide.*` in `src/messages/{en,ta}.json`).

## ADR-019: Theme is next-themes-first; `User.theme` is a best-effort cross-device seed, not a live source of truth

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** `next-themes` (already a dependency) is flash-free and instant because it reads `localStorage` via its own injected script before hydration. `User.theme` already existed on the model with no action wired to it.
- **Decision:** The root layout passes `defaultTheme={preferences.theme}` (from `getSessionPreferences()`) to `next-themes`' `ThemeProvider`; next-themes' script always prefers an existing `localStorage` value over `defaultTheme`, so the DB value only matters on a first-ever visit or a cleared/new device. A new `updateTheme` server action (`src/features/settings/actions.ts`, mirroring `updatePreferences`) persists changes to `User.theme` and a `kaasu-theme` cookie, called fire-and-forget alongside `next-themes`' `setTheme` so the UI never waits on a network round trip to switch.
- **Consequences:** Two theme switchers (Settings page, user menu) share one `ThemeSelect` component and one `updateTheme` action — no second persistence path to keep in sync. A user who changes theme on one device sees it seeded (not forced) on another the next time that device has no local theme preference of its own.

## ADR-020: shadcn's `sidebar.tsx` block is generated, not hand-rolled

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** Every primitive in `components/ui/` up to this point was generated via the shadcn CLI (`radix-nova` style, zinc tokens), and the `--sidebar-*` CSS variables already existed in `globals.css` from the initial `shadcn init`, unused until now.
- **Decision:** Ran `pnpm dlx shadcn@latest add sidebar`, which generated `src/components/ui/sidebar.tsx` and `src/hooks/use-mobile.ts` on top of already-installed primitives (`sheet`, `separator`, `tooltip`) — no new npm dependency. `src/components/shared/app-sidebar.tsx` thin-wraps it with the app's own nav list, active-route highlighting, and emerald accent color, following the same `components/ui` (generated) vs `components/shared` (app-specific) split as every other primitive.
- **Consequences:** Desktop collapse, mobile Sheet fallback, `Cmd/Ctrl+B` toggle, and cookie-persisted collapsed state all come for free. `src/hooks/use-mobile.ts`'s generated `useIsMobile` was rewritten to delegate to `src/hooks/use-media-query.ts` (a `useSyncExternalStore`-based hook already needed for the Quick Add drawer/dialog breakpoint) instead of its original `setState`-inside-`useEffect` body, to satisfy the repo's `react-hooks/set-state-in-effect` lint rule without changing behavior.

## ADR-021: Income entries write to `Income`, never `Transaction`

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** Quick Add's Income mode needs somewhere to log salary/reimbursement/other. `Income` already exists as its own collection (Module 3), with no `categoryId`/`accountId`/`tags` — a different shape from `Transaction`.
- **Decision:** `features/salary/actions.ts::submitIncome` writes to `Income` only. Income never appears in the `/expenses` list, its filters, or CSV export (confirmed with the product owner) — a dedicated income view is a later module's job.
- **Consequences:** `getSafeToSpendData`'s no-plan "expected income" falls back to this month's logged `Income` sum when no salary range is set, so logging income here still feeds the safe-to-spend number even though it's invisible on `/expenses` itself.

## ADR-022: No-plan "fixed recurring items" = active, monthly-frequency `Recurring` only

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** The no-plan safe-to-spend fallback needs a "fixed recurring items" figure. `Recurring.frequency` can be `monthly | weekly | yearly | custom`; prorating weekly/yearly amounts into a monthly figure is a real design question the brief didn't specify.
- **Decision:** Only `isActive: true, frequency: "monthly"` items count, and only those with no `Transaction` yet this IST month carrying their `recurringId` (so a recurring item already paid and logged isn't double-subtracted from both "fixed" and "variable spend"). Weekly/yearly/custom recurring items are excluded from this formula for now.
- **Consequences:** Once Module 6 (Recurring) ships an "upcoming this month" query that handles prorating properly, this module's fallback formula should switch to call it instead of re-deriving its own subset here.

## ADR-023: Safe-to-spend status uses a fixed 0.2 "tight" ratio threshold

- **Date:** 2026-09-30 · **Status:** Accepted
- **Decision:** Both `computeSafeToSpendNoPlan` and `computeSafeToSpendWithPlan` (`features/expenses/safe-to-spend.ts`) derive status as: 🔴 `over` iff the raw remaining amount is ≤ 0; 🟡 `tight` iff `0 < raw/basis < 0.2` (basis = expected income, no-plan; planned discretionary budget, plan-based); 🟢 `on_track` otherwise. The threshold is a module-level constant, not user-configurable.
- **Consequences:** Simple, deterministic, fully unit-tested. Revisit if user feedback (once there are real users) suggests the threshold should be a Settings preference.

## ADR-024: Week-over-week comparison is a rolling trailing-7-day window, not calendar weeks

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** "This week vs same week last month" needs a week boundary. Calendar weeks (e.g. ISO weeks, or locale-dependent Sunday/Monday starts) add complexity `src/lib/dates.ts` didn't already have an opinion on.
- **Decision:** New `trailingWeekRangeIST(date)` helper returns the 7 IST calendar days ending on `date`, inclusive. "Same week last month" is the same window shifted back exactly 28 days — no month-boundary-aware logic.
- **Consequences:** Always compares like-for-like day-of-week distance (e.g. "the last 7 days" vs "the 7 days starting 4 weeks before that"), never a real calendar month's worth of drift. No new `MonthSwitcher`-style UI needed for this comparison.

## ADR-025: `MerchantRule` upserts on every save with a merchant + category, not only on a detected correction

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** "When the user corrects a category for a merchant, upsert a MerchantRule" could mean tracking client-side whether the category differs from what the parser guessed, versus a simpler unconditional upsert.
- **Decision:** `submitQuickAdd`/`updateTransaction` upsert a `MerchantRule` any time both `merchant` and `categoryId` are present on the save — no client-side "was this a correction" state. `nextRuleState` (`features/expenses/merchant-rules.ts`) reinforces confidence when the category matches what's already learned, and resets it when it doesn't.
- **Consequences:** Zero extra state to plumb through the Quick Add UI; the rule self-corrects over a few uses either way. A single accidental wrong pick lowers confidence via the next correct save rather than requiring an explicit "teach" action.

## ADR-026: `MerchantRule` matching stays case-insensitive exact-string for this module

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** ADR-014 already scoped `pattern` to a safe literal-with-wildcard string, with the actual wildcard-matching engine deferred to a later statements-import module.
- **Decision:** `matchMerchantRule` (`features/expenses/merchant-rules.ts`) matches the whole normalised phrase first, then each individual token — plain equality, no wildcard expansion. The demo seed's existing `"swiggy*"`-style rows are exercised by the future engine, not this one.
- **Consequences:** A learned rule from Quick Add matches only when the merchant text is later typed identically (case/whitespace aside). Acceptable for a first version; upgrading to wildcard matching later is additive.

## ADR-027: Quick Add's Undo is commit-then-delete, not a staged commit

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** A 5s Undo window could either delay the actual database write until the window closes, or write immediately and let Undo reverse it.
- **Decision:** `submitQuickAdd` writes immediately; the success toast's Undo action calls `deleteTransaction` with the new id.
- **Consequences:** Never loses data to a closed tab mid-window. The cost is one throwaway document if the user does hit Undo — negligible, and simpler than resumable staged state.

## ADR-028: Expenses list pagination is cursor-based on `(date, _id)` desc; search mode drops the cursor

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** `skip`/`limit` pagination is unstable under concurrent inserts (a new Quick Add entry while scrolling shifts every subsequent page by one). `$text` search relevance ordering (`$meta: "textScore"`) doesn't compose with a `(date, _id)` cursor.
- **Decision:** `listTransactionsPage` (`features/expenses/queries.ts`) paginates non-search requests with `{$or: [{date: {$lt: cursorDate}}, {date: cursorDate, _id: {$lt: cursorId}}]}`, sorted `{date: -1, _id: -1}`. A `search` filter instead returns one relevance-ranked, capped page with `nextCursor: null`.
- **Consequences:** Search results beyond the first page aren't reachable via scroll — acceptable, since search narrows the result set enough in practice; revisit if that stops being true.

## ADR-029: CSV export is a `GET` route handler, not a server action

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** `ActionResult`'s `{ok, data} | {ok, error}` JSON shape (CLAUDE.md §5) doesn't fit a file download — the browser needs to drive the download natively via a real HTTP response.
- **Decision:** `GET /expenses/export` (`src/app/(app)/expenses/export/route.ts`), wrapped in `withRoute`, re-checks `requireUser()`, returns `Content-Type: text/csv` + `Content-Disposition: attachment`. It isn't listed in `decideAccess`'s public routes — `src/proxy.ts` treats any non-`/api` path as a page requiring authentication (redirect, not 401 JSON), same as every other page.
- **Consequences:** One deliberate exception to "server actions return `ActionResult`" — files are the documented case where a route handler is the right tool instead.

## ADR-030: `DEFAULT_ACCOUNTS` seeded via the same `jwt`-callback pattern as `DEFAULT_CATEGORIES`

- **Date:** 2026-09-30 · **Status:** Accepted
- **Decision:** `ensureDefaultAccounts` (`features/settings/service.ts`) mirrors `ensureDefaultCategories`'s idempotent per-item `bulkWrite`/`$setOnInsert`/`upsert` exactly, seeding Cash + UPI, called from `src/lib/auth.ts`'s `jwt` callback right next to `ensureDefaultCategories`, same non-blocking `.catch(console.error)`.
- **Consequences:** `listAccounts(userId)` is never empty by the time the app shell renders, so Quick Add never needs a lazy create-on-first-submit fallback. Verified idempotent against the real Atlas cluster (calling it twice produced exactly one Cash and one UPI account).

## ADR-031: `parseRelativeDateToken` lives in `lib/dates.ts`; a year-less `dd-mm` always uses the current IST year

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** Quick Add's parser needs to read "today"/"yesterday"/`dd-mm`/`dd-mm-yyyy` tokens. This is generic date parsing, not expense-specific.
- **Decision:** The token parser lives in `src/lib/dates.ts` alongside the other IST helpers, not in `features/expenses/`. A `dd-mm` with no year always resolves to the current IST year — including when that date is still in the future this year (e.g. parsing "31-12" in September) — no heuristic tries to guess whether the user meant last year instead.
- **Consequences:** Simple and predictable. A user backdating an expense to a genuinely different year must type the year explicitly (`dd-mm-yyyy`).

## ADR-032: Quick Add's own building blocks stay in `components/shared/`; the Expenses list page's UI lives in `features/expenses/components/`

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** Module 4 already placed `QuickAddSheet` (and the pickers it uses) in `components/shared/`, wired directly into the app shell. The Expenses list page is new in this module and has no such precedent.
- **Decision:** New Quick Add pieces (`quick-add-textbox.tsx`, `quick-add-structured-form.tsx`, `tag-input.tsx`, `income-source-picker.tsx`, `swipeable-row.tsx`) extend the existing `components/shared/` set rather than moving `QuickAddSheet` into a feature folder, minimizing churn to Module 4's shell wiring. The Expenses list's own UI (day grouping, filters bar, bulk action bar, safe-to-spend/guidance cards, the edit dialog) lives in `features/expenses/components/`, per CLAUDE.md's folder convention for feature-specific screens.
- **Consequences:** `swipeable-row.tsx` is generic enough (no expenses-specific logic) that a later module can reuse it directly from `components/shared/`.

## ADR-033: Safe-to-spend/guidance cards live only on `/expenses`; a brand-new user sees ₹0/day with a hint, not an empty state

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** Three open product questions from the Module 5 plan, resolved directly with the product owner rather than picked unilaterally.
- **Decision:** (1) The "Safe to spend today" hero and Daily guidance card render at the top of `/expenses` only — Home keeps its Module-4 "dashboard coming later" placeholder untouched. (2) For a brand-new user with no salary configured and no income logged, the hero card still renders (🔴, ₹0/day, "Set your salary in Settings for a real number") rather than an empty state, so the guidance card stays visible from day one.
- **Consequences:** Both are easy to revisit later (e.g. once Module 13 builds the real Dashboard, or if new-user feedback prefers a softer empty state) without a data-model change — purely presentational calls.

## ADR-034: Fonts are self-hosted via `next/font/local`, not fetched from Google at build time

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** A Vercel deploy of the Module 5 commit failed with `Turbopack build failed with 12 errors`, all `Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'` / `next/font/google queries have exactly one entry`, all from `Noto_Sans_Tamil`'s generated CSS module. The same commit built cleanly with `pnpm build` locally. This is a known, intermittent upstream Next.js/Turbopack bug (multiple open `vercel/next.js` issues): at build time, Turbopack fetches the font's CSS from `fonts.googleapis.com`, and Google's CDN occasionally returns a URL shape (`/l/font?kit=...`, multiple `&`-joined query params) that Turbopack's font-file resolver rejects, since it expects exactly one query entry. Non-deterministic per request, so it can pass on one machine and fail on another for the identical commit.
- **Decision:** `src/app/layout.tsx` now uses `next/font/local` for both fonts instead of `next/font/google`, with the actual `.woff2` files checked into `src/app/fonts/`: `inter-latin-variable.woff2` (weight `100 900`, the single variable-font file Google already serves for Inter's latin subset) and `noto-sans-tamil-{400,500,600,700}.woff2` (only the `tamil` unicode-range file per weight — the `latin`/`latin-ext` range files Google also serves for accented-Latin coverage were dropped, since `--font-sans: var(--font-tamil), var(--font-inter)` (Module 4) already falls through to Inter per-glyph for any character Noto Sans Tamil's file doesn't cover, with or without an explicit `unicode-range`; `next/font/local` has no `unicode-range` option in the first place). The exported `--font-inter`/`--font-tamil` CSS variables are unchanged, so `globals.css` needed no edits.
- **Consequences:** Zero build-time network dependency on Google Fonts — this class of flake can't recur, for either `pnpm build` or a Vercel build, without touching Turbopack itself (still the build engine everywhere, per Module 1). Bumping either font (a new Noto Sans Tamil weight, Inter's next major version) is now a manual re-download into `src/app/fonts/` rather than an automatic one; the font files are static build inputs and never need to change unless the design intentionally adds a weight.

## ADR-035: `custom` recurring frequency never computes a next due date

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** `Recurring.frequency` includes `"custom"` (Module 3), but the model has no interval field — no `intervalDays`, no cadence description — for it to compute against.
- **Decision:** `computeNextDueDate` (`features/recurring/service.ts`) returns `null` for `custom` unconditionally, same as a `monthly` item with no `dayOfMonth`. The UI shows "Custom schedule" in place of a due date, and such items never appear in `getUpcomingDues`. Per CLAUDE.md §7.3, this is the simplest option that keeps the module shippable without a schema change.
- **Consequences:** A genuinely irregular recurring cost (e.g. "every other paycheck") can be logged and mark-as-paid'd manually, but never nudges the upcoming panel or auto-logs. A later module could add an `intervalDays` field and a real cadence calculation without touching any other frequency's logic.

## ADR-036: `effectiveAnnualCostPercent` is a flat-rate approximation, not an XIRR

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** The EMI calculator (`features/recurring/emi.ts`) needs a single "how expensive is this, really" percentage the no-cost-EMI checker and the UI can show alongside the ₹ figures.
- **Decision:** `effectiveAnnualCostPercent = (totalInterest + processingFeeWithGst) / principal / (tenureMonths / 12) * 100` — total extra cost as a share of principal, annualised by tenure. This is not an internal-rate-of-return calculation (it ignores the time value of the fee being paid upfront vs. interest accruing monthly); it is the same "flat rate" convention Indian lenders themselves quote alongside "reducing balance" for comparison.
- **Consequences:** Close enough for the comparison this feature exists to support (should I take the 9-month or 12-month no-cost EMI?) without pulling in a numerical solver for XIRR. The code comment next to the formula flags the simplification explicitly so a future module doesn't treat it as a precise APR.

## ADR-037: Creating an EMI writes `Recurring` then `Emi` sequentially, with a compensating delete on failure

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** `createEmi` (`features/recurring/actions.ts`) must create both a `Recurring` doc (for the generic due-date/mark-paid/upcoming machinery) and an `Emi` doc (for the installment schedule) as one logical unit — either both exist or neither should.
- **Decision:** Two sequential `Model.create()` calls, not a Mongoose multi-document transaction. If the `Emi` write throws, the handler deletes the `Recurring` doc it just created and re-throws. This repo has no existing transaction usage to follow as precedent, and a compensating delete is simpler to write, read and test than a session/transaction wrapper for a two-document, single-user write.
- **Consequences:** A crash between the two writes (process killed mid-request, not a normal validation failure) could theoretically leave an orphaned `Recurring` with `kind: "emi"` and no matching `Emi`. Acceptable for a single-owner-today app on Vercel's serverless runtime; worth revisiting with a real transaction if multi-document EMI writes ever need to be bulletproof against mid-request crashes specifically (not just validation errors, which the try/catch already covers).

## ADR-038: EMI reads stay in `features/debts/queries.ts`, not duplicated into `features/recurring/`

- **Date:** 2026-09-30 · **Status:** Accepted
- **Context:** `listEmis`/`EmiSummary` already existed in `features/debts/queries.ts` before this module (Module 3), for the Debts overview. Module 6 also needs to read `Emi` docs, to drive the "mark as paid" button on EMI-kind recurring cards.
- **Decision:** Extend the existing `debts/queries.ts` (added `getEmiById`, and `recurringId`/a shared `toEmiSummary` mapper to the existing `EmiSummary`) rather than adding a second, near-identical set of Emi queries under `features/recurring/`. `features/recurring/` imports `listEmis`/`getEmiById` from `@/features/debts/queries` directly.
- **Consequences:** One cross-feature read import, in exchange for a single source of truth for "what is an EMI, as read from the DB." If `debts/queries.ts` ever needs to shed the recurring-specific `recurringId` field for its own simplicity, that's a signal to finally give Emi reads their own `features/emi/` (or similar) home — not a decision worth making preemptively here.
