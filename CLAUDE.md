# Smart Order (سمارت أوردر)

⚠️ This is NOT the Next.js you know (Next 16 App Router — breaking APIs and
conventions vs training data; read `node_modules/next/dist/docs/` before
writing code). Same warning as the family: `fleet/Smart-Menu/CLAUDE.md`.

Digital storefront + checkout for Libyan businesses: shareable `/store/[slug]`
QR menu → cart → server-re-priced orders → owner dashboard (orders, products,
delivery zones, payments, staff) → public `/track/[token]` page. Third product
of the Smart family (`order.smart-link.ly`). Full product context: `PRODUCT.md`.

## Stack

- **Next.js 16 App Router** · React 19 · TypeScript (strict + noUnused*) · Tailwind CSS 4
- **Prisma 6** — `prisma/schema.prisma` (SQLite, dev/CI) and
  `prisma/schema.postgres.prisma` (PostgreSQL/Neon, prod) are HAND-KEPT twins;
  `scripts/check-schema-twins.mjs` guards the contract in CI (r134 decided
  NOT to adopt `prisma migrate` yet — see its header). Prod schema sync is
  `db push` via `scripts/vercel-db-sync.mjs` (graceful-degrade, never blocks a deploy).
- **bun** is the package manager BY CONTRACT — `bun.lock` is the lockfile,
  `package-lock.json` must never exist (Vercel package-manager detection +
  CI frozen install; pinned by parity). Node >= 22.
- Money = **integer millimes** everywhere (1 LYD = 1000; `lib/money.ts`
  parse/format — never floats). Phones = normalized Libyan numbers
  (`lib/phone.ts`): **r138 unified wider contract** — mobile `09` at 9–10
  digits (short operators, Smart-Link parity) and landline `0[1-9]` at 10.

## Commands

| Command | What it does |
| --- | --- |
| `bun install --frozen-lockfile` | Install exactly what CI/Vercel installs |
| `npm run lint` | ESLint — must be 0 errors / 0 warnings |
| `npx tsc --noEmit` | Typecheck — must be 0 errors |
| `npm run test:parity` | Design parity snapshot — the Route & Node daylight contract (`tests/parity.mjs`, dependency-free node) |
| `npm run test:unit` | node:test unit suite — Libyan money/phone seams + Tripoli day-boundary helpers + client-only display guard (`tests/unit/`, dependency-free; Node ≥ 22.18 type-strips the TS natively) |
| `npm run test:e2e` | API E2E suite — needs a LIVE server (`node tests/e2e/api-e2e.js [baseUrl]`); CI boots one on a scratch SQLite |
| `npm run test:e2e:browser` | **Playwright browser battery** (`tests/browser/`) — boots its own server: `prisma db push` on the DEDICATED scratch SQLite `file:./db/e2e.db` → `scripts/e2e-seed.mjs` → `next start` on port 3115. Requires a prior `npm run build`. Chromium only, 2 workers, locale ar-LY |
| `npm run build` | Production build (no DB needed — DB routes are force-dynamic) |
| `npm run dev` / `db:push` / `db:generate` | Dev server / schema push / client generate |

### Browser e2e (Phase 6, P6-2-f4)

- `bun run build` ONCE, then `npm run test:e2e:browser` — the webServer in
  `playwright.config.ts` does the rest (schema push → seed → `next start`).
- **Never port 3000/3111-3114** — the battery owns 3115 (`E2E_PORT` override).
- The scratch DB is `file:./db/e2e.db` (Prisma resolves it to `prisma/db/e2e.db`)
  — it never touches dev data; `scripts/e2e-seed.mjs` REFUSES to run on any
  other DATABASE_URL.
- Seeded universe: the demo store (`/store/demo-store` — 6 products, 2 zones,
  3 payment methods, identical data to `/api/seed`) + the merchant
  `owner@demo.smart-order.ly` / `E2e-Oasis-2026` (OWNER, env-overridable
  `E2E_MERCHANT_EMAIL`/`E2E_MERCHANT_PASSWORD`).
- Specs assert the real UI copy/selectors: full customer journey (store →
  dialog → cart → checkout → POST 201 → `/track?placed=1`), tracking road
  (6 stations + terminus, PICKUP hides OUT_FOR_DELIVERY, aria-live stamp, mono
  order number), merchant dashboard (login → orders list → NEW→CONFIRMED
  transition via the real PATCH), focus-visible ring + 390px overflow.
- The merchant login rate limit is 10/10min per IP — the battery logs in once
  per run; rapid re-runs within 10 minutes can trip it (delete
  `prisma/db/e2e.db` and re-run for a fresh universe).

## Design canon

- **This repo's laws:** `DESIGN.md` (local, verified-in-code digest). If it and
  `src/app/globals.css` disagree, globals.css wins — fix the doc.
- **Identity — «Operational Daylight: Route & Node»** (Phase 5, r152): LIGHT is
  the default (`:root` — paper `#F7F7F4`, navy ink `#1B2A41`, delivery orange
  `#D14900` + pressed `#8F3A00`, steel `#3E5C76`, green `#1E7A46`); dark is the
  explicit `.dark` «night dispatch» override (`#0D1626` / luminous `#FF7A38`).
  The retired Madarek night/gold (`#070B16`/`#E9B44C`) must NOT be resurrected.
- Type: **Tajawal** (arabic body, 400-800) + **Barlow Semi Condensed** (latin
  display; arabic headings chain to Tajawal) + **IBM Plex Mono** (operational
  codes/numerals) — self-hosted, no external requests.
- Geometry: status/selection chips are squared **stamps** (`rounded-sm` + 1px
  family-ink border); section dividers ride the **dashed route line**
  (`.route-divider*`, `border-s-2 border-dashed`). Radius ladder
  6/8/10/12/16/20/28. Tokens only — no raw hexes outside the token files.

## Parity protocol

`tests/parity.mjs` pins globals.css + landing.css token values to the canon,
plus behavioral pins (a11y recipes, Arabic microcopy sweeps, CI/deploy
contracts). Rules:

- Every user-visible change that touches a pinned seam updates the pin **in
  the same commit**; the commit message records the new green count.
- The microcopy sweeps are comment-stripped — only shipped strings count.
- Never weaken a pin to make a change pass; change the code or change the
  canon deliberately (documented).

## Conventions (do not regress)

- **Arabic-first RTL** (`<html dir="rtl">`); logical properties only in app
  CSS (physical = sanctioned scrollbar/centering cases only).
- **فشل is banned** in user-facing copy — use **تعذّر** (WITH shadda).
  Ellipsis in Arabic strings is **«…»**, never `...`.
- **Money display** = `formatLyd` (ar-LY dot grouping ≥ 1000; **r138 decision,
  Smart-Link twin**: whole dinars clean `19 د.ل`, fractions at dirham
  precision `19.500 د.ل` — trailing `.000` zeros are gone);
  raw `formatLydAmount` only inside form round-trips.
- **`WALLET_CAP_LYD = 99`** (`lib/payment-constants.ts`): libyana/madar
  single transfers above the cap are impossible — subscriptions auto-switch
  to bank; checkout hides the USSD quick-code above the cap (r134).
- **The money path never trusts the client:** the server re-prices every
  order, re-validates zones/options/stock, decrements stock conditionally
  inside the transaction, and is idempotent per cart-session key.
- **Plan FEATURE gates (W7-D):** sold-but-ungated features are entitlement
  bugs («a paid feature with no gate is a bug»). The ladder lives in ONE
  pure source — `lib/plan-entitlements-core.ts` (`PLAN_FEATURES`):
  reports = بريميوم+ (sortOrder 3), CSV export = احترافي+ (4), enforced
  server-side at the real seams (`/api/dashboard/reports`,
  `/api/dashboard/reports/export` — 403 `PLAN_ENTITLEMENT` below tier,
  before any feature work; tier resolved with the W2-D2 currentPlan
  semantics in `lib/plan-entitlements.ts`). Pricing-owner revert knobs:
  the two `minSortOrder` constants (3→1 / 4→1 reopens the features).
  Overview KPIs (`/api/dashboard/stats`) stay universal — the free
  tier's basic-stats equivalent; never gate them.
- Server errors ride the one-seam Arabic `ApiError` (`lib/client.ts`);
  routes answer via `ok()/fail()` (`lib/api.ts`) — thrown `ApiFailError`
  carries fail-shaped responses out of `$transaction`s.
- `og:locale` is **`ar_AR`** (Facebook drops ar_LY); og:image alt family form
  is «الربط الذكي — SmartOrder».
- Dirty dialogs guard via `useDirtyClose`; page-level money forms guard via
  `beforeunload` (checkout).
- Commit author email must be the GitHub account's verified email
  (Vercel refuses unknown authors — fleet lesson).
