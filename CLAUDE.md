# CLAUDE.md — Kaasu (காசு) Personal Finance OS

> Claude Code reads this file automatically at the start of every session.
> It is the single source of truth for HOW this project is built.
> Update it whenever a decision changes (Claude: propose edits here when you make a lasting architectural choice).

## 1. What we are building
Kaasu is a personal finance operating system: daily expense capture, fixed/recurring expenses,
monthly budget + salary planning, debt & EMI tracking, goals/wishlist, bank-statement analysis,
investment tracking (INDmoney/INDstocks, mutual funds), and an AI financial advisor + personal
assistant agent. It is single-owner today, but every module must be written as a clean,
generic, multi-user-ready product (userId on every document, no hardcoded personal data).

## 2. Non-negotiable principles
1. **Money is integers.** Store all amounts as integer **paise** (`amountPaise: number`). Never floats. Format only at the UI edge with `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.
2. **Time is IST-aware.** Store UTC `Date` in DB; all "day/month" logic uses `Asia/Kolkata` via `date-fns-tz`. A "month" = calendar month in IST.
3. **Every document has `userId`** and every query filters by it. No exceptions.
4. **Validate at every boundary** with Zod: env vars, API inputs, server actions, AI tool inputs, parsed statement rows.
5. **Read-only to brokers.** The INDstocks/INDmoney client may only call GET endpoints. There is no code path that places, modifies or cancels orders. Enforce with an allowlist of endpoint paths in the client.
6. **Secrets never touch the client or the repo.** Third-party tokens stored in DB are AES-256-GCM encrypted with `ENCRYPTION_KEY`. `.env*` is gitignored. No personal financial data in seed files or fixtures (use fake data).
7. **AI proposes, user confirms.** Any AI action that writes data (add expense, mark debt paid, create task) returns a proposal the user confirms, except explicitly whitelisted low-risk actions (e.g. logging an expense the user just typed).
8. **Advice is informational.** The advisor shows reasoning and numbers, never guarantees returns, and carries a short "not a registered financial advisor" note on investment suggestions.
9. **Small, composable modules.** Feature-first folders. No file > ~300 lines; extract when it grows.
10. **Accessible and fast.** Keyboard reachable, visible focus, color never the only signal, mobile-first, LCP < 2.5s on 4G.

## 3. Tech stack (all free tier)
| Layer | Choice |
|---|---|
| Framework | Next.js (latest stable, App Router) + TypeScript `strict` |
| UI | Tailwind CSS + shadcn/ui + lucide-react icons + Recharts + cmdk (command palette) + sonner (toasts) |
| Forms | react-hook-form + Zod |
| Data | MongoDB Atlas **M0 free cluster** via Mongoose (cached connection for serverless) |
| Auth | Auth.js (NextAuth v5) with GitHub OAuth + email allowlist (`ALLOWED_EMAILS`) |
| AI | Vercel AI SDK (`ai`) — provider-agnostic; `AI_PROVIDER` = `anthropic` \| `google` \| `openai` |
| Jobs | Vercel Cron (Hobby plan: daily schedules only) |
| Messaging | Telegram Bot API (free) via webhook route |
| i18n | `next-intl` — English (`en`) default + Tamil (`ta`) |
| Tests | Vitest + Testing Library; Playwright for 3–5 critical flows |
| Hosting | Vercel Hobby, private GitHub repo |

Do not add a dependency without a one-line justification in the PR/commit message. Prefer the platform.

## 4. Folder structure
```
src/
  app/                    # routes only (thin): pages, layouts, route handlers
    (auth)/  (app)/  api/
  features/               # one folder per module
    expenses/  recurring/  budget/  salary/  debts/  goals/
    statements/  investments/  dashboard/  advisor/  assistant/  settings/
      components/  actions.ts  queries.ts  schema.ts  service.ts  *.test.ts
  lib/
    db/  (connection.ts, models/)   money.ts   dates.ts   crypto.ts
    env.ts  auth.ts  ai/  telegram/  indstocks/  utils.ts
  components/ui/          # shadcn primitives
  components/shared/      # app-wide composites (AmountInput, CategoryPicker, EmptyState…)
  messages/  en.json  ta.json
  proxy.ts                # Next 16 "proxy" (formerly middleware.ts): auth gate, see ADR-007
```
Rules: pages call `features/*/queries.ts` (reads) and `actions.ts` (server actions, writes).
Business logic lives in `service.ts` as pure functions where possible (easy to unit test).

## 5. Conventions
- Server Components by default; `"use client"` only for interactivity.
- Server Actions return `{ ok: true, data } | { ok: false, error }` — never throw to the client.
- Naming: `camelCase` vars, `PascalCase` components/models, `kebab-case` files, collections plural.
- Every list screen has: loading skeleton, empty state with a clear call to action, error state.
- Dates displayed like `30 Sep`, `Wed, 30 Sep 2026`. Amounts like `₹1,23,456`.
- Commits: Conventional Commits (`feat(expenses): quick add`). One module = one or more small commits.

## 6. Design language
Modern, calm, sleek. Neutral zinc base, one accent (emerald for money-in / positive), rose for
over-budget, amber for warnings. Rounded-2xl cards, generous spacing, subtle borders instead of
heavy shadows, tabular-nums for all figures, dark mode first-class. Mobile: bottom nav + floating
"+" quick-add. Desktop: collapsible sidebar + ⌘K command palette. Micro-interactions via CSS
transitions only (no heavy animation libs).

## 7. Workflow for Claude Code
1. Read this file and `docs/PROGRESS.md` first.
2. For each module: plan → show the plan → implement → test → run `pnpm lint && pnpm typecheck && pnpm test` → update `docs/PROGRESS.md` → commit.
3. If a requirement is ambiguous, pick the simplest option that keeps the design generic, note it in `docs/DECISIONS.md`, and continue.
4. Never delete user data in migrations; write additive migrations only.

## 8. Commands
```
pnpm dev | pnpm build | pnpm lint | pnpm typecheck | pnpm test | pnpm test:e2e | pnpm seed:demo
```
