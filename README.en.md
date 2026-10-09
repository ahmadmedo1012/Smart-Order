# 🛍️ Smart Order | سمارت أوردر

**منصة الطلبات الرقمية للأعمال في ليبيا — متجر رقمي، لوحة تحكم كاملة، توصيل بمناطق، ومدفوعات محلية.**

> 🌐 [العربية](./README.md) · **English**

**The digital-ordering platform for businesses in Libya** — any business launches a professional storefront in minutes: a QR-ready public store with cart and checkout, a fully audited order engine, zone-based delivery with fees, Libyan-native payments, WhatsApp confirmations, and a complete owner dashboard.

> **Production:** <https://order.smart-link.ly> · Next.js 16 · PostgreSQL (Neon) · Vercel

[![CI](https://github.com/ahmadmedo1012/Smart-Order/actions/workflows/ci.yml/badge.svg)](https://github.com/ahmadmedo1012/Smart-Order/actions/workflows/ci.yml)
[![Live](https://img.shields.io/badge/live-order.smart--link.ly-E9B44C)](https://order.smart-link.ly)
[![License](https://img.shields.io/badge/license-proprietary-%23B57438)](./LICENSE)

---

## 🖼 Quick Look

| Light ☀️ | Dark 🌙 |
|:---:|:---:|
| [![Landing page in light mode — headline "متجر رقمي لمتجرك — الطلبات تصلك في لوحة واحدة" with the orders phone mockup](docs/screenshots/hero-light.jpg)](docs/screenshots/hero-light.jpg) | [![Landing page in dark mode — the same hero band in the Madarek night/gold identity](docs/screenshots/hero-dark.jpg)](docs/screenshots/hero-dark.jpg) |

> More shots (storefront, checkout, dashboard) in the *Screenshots* section below — full captions and dimensions in [`docs/screenshots/README.md`](docs/screenshots/README.md).

---

## 🧭 What is Smart Order?

**Smart Order** lets any Libyan business launch a complete digital-ordering storefront with no code and no middleman:

- **QR-ready public storefront** — a public URL per business (`/store/[slug]`) rendered server-side, so products appear in the first paint of a QR scan, with categories, search, and variants (sizes + add-on groups).
- **Cart & checkout** — a full customer cart with a checkout page: contact details, address, delivery zones with fees and minimums (enforced server-side), and local payment methods.
- **Audited order engine** — validated state machine (NEW → CONFIRMED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED / CANCELLED / REJECTED), public order numbers (`SO-20260917-0042`), a full audit history, and an unguessable public tracking page (`/track/[token]`).
- **Libyan-native payments** — Cash / COD / Madar / Libyana transfers, with manual store-side confirmation (no fake gateway success).
- **WhatsApp-first** — structured order messages via `wa.me` deep links for customers and businesses.
- **Owner dashboard** — today's stats, actionable alerts, orders with filters/search, and management for products, categories, customers, delivery, payments, and staff — fully Arabic RTL on the Madarek design system.

---

## ✨ Features

- 🛍️ **Storefront** — public menu with categories, instant search, product variants (sizes) and option groups (add-ons), Arabic-first RTL UX.
- 🧾 **Order engine** — server-validated state machine, public order numbers, per-status audit history, public tracking page.
- 🚚 **Delivery zones** — per-zone fees + minimum order, enforced server-side at checkout (nothing from the client is trusted).
- 💳 **Libya-native payments** — Cash / COD / Madar / Libyana transfers / manual confirmation — provider-agnostic architecture.
- 💬 **WhatsApp-first** — structured order messages via `wa.me` deep links for customers and businesses.
- 📊 **Dashboard** — today's stats, actionable alerts, orders with filters/search, products/categories/customers/delivery/payments/staff management.
- 🔐 **Multi-tenant SaaS** — strict tenant isolation, role-based access (OWNER / ADMIN / STAFF), server-enforced permissions.

---

## 🧰 Tech Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS 4** + shadcn/ui (Radix) — Madarek design system: night/gold dark + cream/copper light, both themes.
- **Prisma ORM** — SQLite for local dev, PostgreSQL (Neon) in production.
- **Custom session auth** — PBKDF2-SHA512 (600k iterations), hashed session tokens, httpOnly cookies.
- **Money** — integer millimes everywhere (1 LYD = 1000 dirham), zero floating-point math.
- **Self-hosted fonts** — IBM Plex Sans Arabic subsets (400–700, arabic + latin) under OFL — literal Madarek parity, no external requests.

---

## 🏗️ Architecture Notes

- All money paths re-price server-side; client-sent prices are ignored.
- Order creation is idempotent (client-generated key) — double submits replay the same order.
- Tenant isolation: every query is scoped by `businessId` after membership check.
- Images: validated by magic bytes, compressed client-side, stored in the DB (survives redeploys — no external storage credentials needed).
- API envelope: `{ success, data, meta }` with Arabic user-facing errors — internals never leak.

---

## 🚀 Getting Started

> Install with **bun** (`bun.lock` is the repo lockfile — `npm install` pulls versions the lock rejects).

```bash
git clone https://github.com/ahmadmedo1012/Smart-Order.git
cd Smart-Order
bun install --frozen-lockfile
cp .env.example .env          # set DATABASE_URL (the SQLite default works out of the box)
bunx prisma db push           # create the local schema
bun run dev                   # http://localhost:3000
bun run build                 # production build
```

### Environment variables

The canonical source is [`.env.example`](.env.example) — the table shows the required set:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Database: SQLite file for dev (`file:…`) or PostgreSQL (Neon) connection string for production |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL (SEO / Open Graph / sitemap) — must be a real URL or left unset |
| `GIT_COMMIT_SHA` | Serving-commit reporting in `/api/health` for self-hosted deploys (Vercel injects it automatically — never fabricated; `null` when unset) |

---

## 📜 Commands

| Command | Description |
|---|---|
| `bun run dev` | Dev server on port 3000 |
| `bun run build` | Vercel production build (`next build`) |
| `bun run build:selfhost` | Standalone build for self-hosting (copies `static/` + `public/` into the bundle) |
| `bun run start` | Run the production build locally |
| `bun run start:selfhost` | Run the standalone bundle (`NODE_ENV=production`) |
| `bun run lint` | ESLint |
| `bun run test:parity` | Madarek parity tests (colors / radius / motion / z / elevations + consumption gates) |
| `bun run test:e2e` | API E2E suite: auth, tenant isolation, order lifecycle, money re-pricing, rate limits — runs against any base URL |
| `bun run db:push` | Push the Prisma schema to the database (`--accept-data-loss`) |
| `bun run db:generate` | Generate the Prisma client |
| `bun run db:migrate` | Create/apply dev migrations |
| `bun run db:reset` | Reset the database and re-migrate |

> Test counts are documented per round in [`CHANGELOG.md`](CHANGELOG.md) — no hard numbers in this file (doc-engineering doctrine: no stale numbers).

---

## 🧪 Running against a live deployment

```bash
bun run dev                                  # start the dev server
bun run test:parity                          # Madarek parity
node tests/e2e/api-e2e.js https://order.smart-link.ly   # E2E against any deployment
```

---

## 🚢 Deployment (Vercel + Neon PostgreSQL)

Primary production path — same architecture as the Smart ecosystem siblings (Smart Menu, Smart Bot): **Vercel + Neon PostgreSQL**. `vercel.json` is included; the full runbook (env vars, DB setup, the `order.smart-link.ly` custom domain, post-deploy checklist) lives in [`DEPLOYMENT.md`](DEPLOYMENT.md).

```bash
vercel link
vercel env add DATABASE_URL production        # Neon PostgreSQL connection string
vercel env add NEXT_PUBLIC_SITE_URL production
DATABASE_URL="<neon-url>" bunx prisma db push --schema=prisma/schema.postgres.prisma
vercel --prod
```

> **vercel-db-sync note:** the real build command (`vercel.json`) runs `scripts/vercel-db-sync.mjs` before Prisma generate and the Next build — flexible schema sync from the production DB (the fix for a 3-week deploy freeze, commit `fdd57ff`).

Self-host fallback: `bun run build:selfhost` + `start:selfhost` (standalone) — see DEPLOYMENT.md §5.

---

## 📁 Project Structure

```
src/
  app/
    page.tsx                  # SaaS landing (hero + sections + pricing + FAQ)
    login/ register/          # auth (multi-step register wizard)
    dashboard/                # business app: overview, orders, products, categories,
                              #   customers, delivery, payments, staff, settings, onboarding
    store/[slug]/             # public storefront + checkout
    track/[token]/            # public order tracking
    api/                      # REST endpoints (auth, business CRUD, public order path, media)
  components/  dashboard/ storefront/ shared/ ui/
  lib/         constants, auth, order-machine, money, phone, whatsapp, storage, api, ...
prisma/        schema.prisma (SQLite dev) + schema.postgres.prisma (PostgreSQL prod)
tests/         parity.mjs + e2e/api-e2e.js
```

---

## 🖼️ Screenshots

| Public storefront "مخبز الواحة" (demo) | Checkout |
|:---:|:---:|
| [![Public storefront — search, category filters, and a product grid with images and prices](docs/screenshots/storefront.jpg)](docs/screenshots/storefront.jpg) | [![Checkout page — delivery zones, local payment methods, and the cart summary](docs/screenshots/checkout.jpg)](docs/screenshots/checkout.jpg) |

| Owner dashboard |
|:---:|
| [![Owner dashboard — today's stats, alerts, recent orders with status badges, and the sales chart](docs/screenshots/dashboard.jpg)](docs/screenshots/dashboard.jpg) |

> Full captions and dimensions in [`docs/screenshots/README.md`](docs/screenshots/README.md).

---

## 🛰️ Part of the Madarek Ecosystem — جزء من منظومة مدارك

> One design system across all projects · the Madarek identity: night/gold `#070B16`/`#E9B44C` dark — cream/copper `#FBFAF9`/`#B57438` light — IBM Plex Sans Arabic

| Project | Role | GitHub | Live |
|---|---|---|---|
| 🎓 **Madarek / مدارك** | Smart-learning platform for University of Zawia — the design-system reference | [github.com/ahmadmedo1012/madarek](https://github.com/ahmadmedo1012/madarek) | [madarek.onrender.com](https://madarek.onrender.com) |
| 🔗 **Smart-Link / سمارت لينك** | Digital umbrella for Libyan businesses | [github.com/ahmadmedo1012/Smart-Link](https://github.com/ahmadmedo1012/Smart-Link) | [smart-link.ly](https://smart-link.ly) |
| 🍽️ **Smart Menu / سمارت منيو** | Digital menu & WhatsApp ordering for restaurants | [github.com/ahmadmedo1012/Smart-Menu](https://github.com/ahmadmedo1012/Smart-Menu) | [menu.smart-link.ly](https://menu.smart-link.ly) |
| 🤖 **SmartBot / سمارت بوت** | Messenger bot & automation for Facebook pages | [github.com/ahmadmedo1012/SmartBot](https://github.com/ahmadmedo1012/SmartBot) | [bot.smart-link.ly](https://bot.smart-link.ly) |
| 🛍️ **Smart Order / سمارت أوردر** | Digital storefront, orders & delivery for businesses | [github.com/ahmadmedo1012/Smart-Order](https://github.com/ahmadmedo1012/Smart-Order) | [order.smart-link.ly](https://order.smart-link.ly) |

## 📜 License & Ownership

Proprietary software — all rights reserved © 2026 Ahmad Medo (`ahmadmedo1012`). The full legal text is in [`LICENSE`](LICENSE).

### Fonts
The primary typeface **IBM Plex Sans Arabic** (400–700, arabic + latin subsets) alongside IBM Plex Mono — self-hosted with zero external requests, both under the **SIL Open Font License 1.1**.
