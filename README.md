# Smart Order — سمارت أوردر

منصة الطلبات الرقمية للأعمال في ليبيا — متجر رقمي، لوحة تحكم كاملة، توصيل بمناطق، ومدفوعات محلية.
Part of the Smart ecosystem (smart-link.ly): sibling of [Smart Menu](https://menu.smart-link.ly) and [Smart Bot](https://bot.smart-link.ly).

## What is this?

**Smart Order** lets any Libyan business launch a professional digital ordering storefront in minutes:

- 🛍️ **Storefront** — public menu with categories, search, product variants (sizes) and option groups (add-ons), Arabic-first RTL UX
- 🧾 **Order engine** — validated state machine (NEW → CONFIRMED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED / CANCELLED / REJECTED), public order numbers (`SO-20260917-0042`), full audit history, customer tracking page
- 🚚 **Delivery zones** — per-zone fees + minimum order, enforced server-side at checkout
- 💳 **Libya-native payments** — Cash / COD / Madar / Libyana transfers / manual confirmation (provider-agnostic architecture, no fake gateway success)
- 💬 **WhatsApp-first** — structured order messages via wa.me deep links for customers and businesses
- 📊 **Dashboard** — today's stats, actionable alerts, orders with filters/search, products/categories/customers/delivery/payments/staff management
- 🔐 **Multi-tenant SaaS** — strict tenant isolation, role-based access (OWNER/ADMIN/STAFF), server-enforced permissions

## Tech Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS 4** + shadcn/ui (Radix) — custom emerald/saffron design system, light & dark themes
- **Prisma ORM** — SQLite for local dev, PostgreSQL (Neon) in production
- **Custom session auth** — PBKDF2-SHA512 (600k iterations), hashed session tokens, httpOnly cookies
- **Money** — integer millimes everywhere (1 LYD = 1000 dirham), zero floating-point math
- Self-hosted **Cairo + Readex Pro** Arabic font subsets (fast, no external requests)

## Architecture Notes

- All money paths re-price server-side; client-sent prices are ignored
- Order creation is idempotent (client-generated key) — double submits replay the same order
- Tenant isolation: every query is scoped by `businessId` after membership check
- Images: validated by magic bytes, client-side compression, stored in DB (survives redeploys, no external storage credentials needed)
- API envelope: `{ success, data, meta }` with Arabic user-facing errors — internals never leak

## Local Development

```bash
git clone https://github.com/ahmadmedo1012/Smart-Order.git
cd Smart-Order
npm install
cp .env.example .env       # set DATABASE_URL (SQLite default works out of the box)
npx prisma db push          # create local schema
npm run dev                 # http://localhost:3000
```

## Deployment (Render + Neon PostgreSQL)

The app deploys as a Render web service backed by any PostgreSQL (Neon used in production):

```
Build: npm install && npx prisma generate --schema=prisma/schema.postgres.prisma && npx prisma db push --schema=prisma/schema.postgres.prisma && npx next build
Start: npx next start -p $PORT
```

Environment variables (see `.env.example`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (prod) / SQLite file (dev) |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for SEO/OG metadata |

A `render.yaml` is included for one-click blueprint deploys.

## Project Structure

```
src/
  app/
    page.tsx                  # SaaS landing
    login/ register/          # auth
    dashboard/                # business app (overview, orders, products, categories,
                              #   customers, delivery, payments, staff, settings, onboarding)
    store/[slug]/             # public storefront + checkout
    track/[token]/            # public order tracking
    api/                      # REST endpoints (auth, business CRUD, public order path, media)
  components/  dashboard/ storefront/ shared/ ui/
  lib/         constants, auth, order-machine, money, phone, whatsapp, storage, api, ...
prisma/        schema.prisma (SQLite dev) + schema.postgres.prisma (PostgreSQL prod)
```

## License

Proprietary — © 2026 Smart ecosystem.
