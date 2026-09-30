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
