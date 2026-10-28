# P30 — Route Inventory (canonical verification pass)

- **Task**: P30 §4 (four-product route-inventory deliverable)
- **Repo HEAD audited**: `main @ 2c19304` (post P30-A + P30-B)
- **Method**: source scan of every page under `src/app/` + production HTTP probes on https://order.smart-link.ly (this session) + internal-link sweep (26 links across 6 key pages, 0 broken — the single `/r92-hero-entrance` hit was a false positive: React 19 `<style href>` identity key, not a navigation link) + the CI e2e battery (87/87 at `2c19304`, incl. the new §12 public-surface gates) + sitemap reconciliation.
- **Delta since docs/p19-route-matrix.md**: no routes added/removed; the sitemap gained the QA-fixture gate (P30-B).

## Classification legend

Valid public (VP) · Valid authenticated (VA) · Valid dynamic (VD) · Intended alias/redirect (AR) · Intentional demo/fixture (DF) · Unreachable/broken (BK) · Duplicate content (DP) · Obsolete (OB)

## Page routes

| Route | Class | Auth | Prod status | P30 verification |
|---|---|---|---|---|
| `/` | VP | none | 200 | landing; roadmark board + trust pill now QA-fixture-free (P30-B: «+2 متجر» was «+9», «+7 طلب» was «+83» — live-verified) |
| `/pricing` | VP | none | 200 | plan cards — unchanged |
| `/privacy` `/terms` | VP | none | 200 | policy pages — unchanged |
| `/register` | VP | none | 200 | merchant signup (robots-disallowed, correctly absent from sitemap) |
| `/login` | VP | none | 200 | session login |
| `/track` | VP | none | 200 | order-tracking entry |
| `/track/[token]` | VD | token (unguessable) | 200/404 by token | customer tracking — public token contract holds |
| `/store/[slug]` | VD | none | 200 known / 404 unknown | storefront ISR-60s; demo-store 6/6 photos (P29-C3 holds post-P30-A deploy — re-verified); QA-fixture storefronts stay reachable by policy (exclusion = no crawl budget, never a broken link) |
| `/store/[slug]/checkout` | VD | none | 200 via store flow | checkout — e2e covers the full order lifecycle |
| `/dashboard` + 12 sub-routes | VA | session (merchant/staff) | **307 → /login** unauth | auth gate verified on `/dashboard`; sub-routes (orders/products/categories/delivery/payments/customers/reports/settings/staff/onboarding/admin) per P19 matrix — unchanged |
| `*` catch-all | BK→404 (correct) | none | 404 | verified |

## API routes (44)

| Group | Routes | Auth | P30 verification |
|---|---|---|---|
| auth | login/logout/me/register | session/none | register now rate-limited 5/h/IP (verified live: 429 + Retry-After) |
| business/catalog | business/categories/products/customers/delivery-zones/payment-methods/staff (+[id]) | session + tenant isolation | e2e tenant-isolation battery green (cross-tenant spoofing → 403) |
| orders | orders/[id] (+ public variants) | session / public create | full lifecycle in e2e (incl. idempotency, money re-pricing, plan limits) |
| public | public/store/[slug], public/track/[token](/confirm), public/orders | none | demo-store API 6/6 photos; tracking token contract holds |
| subscriptions | list/status/receipt/[id]/review | session/admin | e2e CAS review battery green |
| reports | dashboard/reports(/export) | session + plan tier | W7-D entitlement gates green in e2e |
| infra | health, seed, media(/id), plans | none / admin+secret | health 200; **seed: P30-A ownership guard** (409 on non-demo row at the slug) + timing-safe secret + 429 rate limit |

## Sitemap/robots reconciliation (P30-B — the defect found & fixed)

- **FOUND (live defect)**: `sitemap.xml` carried 14 URLs including **7 QA-fixture stores** («mkhbz-alakhtbar-a» + `-2`…`-7` — the e2e battery's own «مخبز الاختبار أ» registrations, published in production by a long-ago e2e run pointed at production) — the Smart-Menu r96/P29-D1 defect family, Smart-Order twin.
- **FIXED (2c19304)**: `lib/qa-fixtures.ts` single truth + sitemap gate + landing-counter gate + e2e BASE guard (refuses non-local targets — the residue can never be created again) + CI sitemap gates. **Live-verified post-deploy: sitemap = 6 URLs** (4 static + the real merchant «مطعم برقة الذهبي» + demo-store).
- **Classification**: `mtam-brqa-aldhhby` = REAL merchant (kept — NOT misclassified); `demo-store` = seed-owned flagship demo (kept); the 7 test bakeries = QA residue (excluded from every public surface; DB rows = owner cleanup, documented non-urgent).
- `robots.txt` (200): unchanged contract.

## P30 findings & gates

- **Defects found & fixed this wave**: (1) deploy-seed ownership/preview hazards (P30-A `23fea41`); (2) QA-fixture sitemap/counter pollution (P30-B `2c19304`).
- Regression gates: unit 187/187 (+23 new this wave: slug, seed-isolation, qa-fixtures, landing-stats full-behavioral) · parity 505/505 · e2e 87/87 (+4 §12 gates: sitemap sanity, fixture exclusion, storefront reachability, slug capture) · CI all-green on `23fea41` + `2c19304` · both deploys production-verified.
