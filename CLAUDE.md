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
| `npm run test:parity` | Madarek parity snapshot (`tests/parity.mjs`, dependency-free node) |
| `npm run test:unit` | node:test unit suite — Libyan money/phone seams + Tripoli day-boundary helpers + client-only display guard (`tests/unit/`, dependency-free; Node ≥ 22.18 type-strips the TS natively) |
| `npm run test:e2e` | API E2E suite — needs a LIVE server (`node tests/e2e/api-e2e.js [baseUrl]`); CI boots one on a scratch SQLite |
| `npm run build` | Production build (no DB needed — DB routes are force-dynamic) |
| `npm run dev` / `db:push` / `db:generate` | Dev server / schema push / client generate |

## Design canon

- **Fleet canon:** `fleet/madarek` `DESIGN.md` + `frontend/src/styles/tokens.css` — the
  single source of truth for colors/radius/motion/z/type across the family.
- **This repo's laws:** `DESIGN.md` (local, verified-in-code digest). If it and
  `src/app/globals.css` disagree, globals.css wins — fix the doc.
- Night = default (`#070B16` ground / `#E9B44C` gold), light = cream/copper
  (`#FBFAF9` / `#B57438`). Tokens only — no raw hexes outside the token files.
  Radius ladder 6/8/10/12/16/20/28. IBM Plex Sans Arabic self-hosted (no external requests).

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
- Server errors ride the one-seam Arabic `ApiError` (`lib/client.ts`);
  routes answer via `ok()/fail()` (`lib/api.ts`) — thrown `ApiFailError`
  carries fail-shaped responses out of `$transaction`s.
- `og:locale` is **`ar_AR`** (Facebook drops ar_LY); og:image alt family form
  is «الربط الذكي — SmartOrder».
- Dirty dialogs guard via `useDirtyClose`; page-level money forms guard via
  `beforeunload` (checkout).
- Commit author email must be the GitHub account's verified email
  (Vercel refuses unknown authors — fleet lesson).
