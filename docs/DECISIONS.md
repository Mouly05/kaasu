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
- **Context:** Verified live against Atlas (`pnpm seed:demo`): a plain `sparse` compound index only excludes a document when *every* indexed field is missing. Since `userId` is always present, `{userId, dedupeHash}` with `sparse: true` indexed every `Transaction` regardless of `dedupeHash`, so the unique constraint collided on the first two manual transactions (both indexed with an effective `dedupeHash: null`). Separately, the MongoDB driver's BSON serializer writes an unset field as an explicit `null` by default rather than omitting the key, which also defeats `$exists`-based exclusion unless disabled.
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
