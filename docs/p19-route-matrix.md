# Smart-Order — Phase 19 Route & Interaction Matrix (P19-D2)

**Method:** code-read only (no browser, no dev server, no build). Repo state: `main @ 42e1d2c`, clean tree.
**App dir:** `src/app/` (Next.js App Router, Arabic RTL storefront + merchant dashboard).
**Counts:** **22 page routes** (9 public + 13 dashboard) · 2 route-level + 2 app-level error boundaries · 404 · 2 metadata routes · **34 API route files**.

Cart and confirmation are **not separate routes** by design: the cart is a drawer inside the store page (`src/components/storefront/cart-drawer.tsx`), and the order confirmation is the durable `/track/[token]?placed=1` landing (`src/components/storefront/checkout-client.tsx:206`) plus an in-page success screen (`checkout/success-screen.tsx`). Both are mapped in the matrix below.

---

## 1) Storefront funnel (the money path)

### `/store/[slug]` — the catalog (QR destination)
- **File:** `src/app/store/[slug]/page.tsx` (ISR 60s, `revalidate=60` + `dynamicParams` + empty `generateStaticParams`, lines 19–27); server-queries the full storefront payload (`getStoreData`, lines 60–…) and hands it to `<Storefront initialData>` (r132-F1a anti-waterfall).
- **Controls** (`src/components/storefront/storefront.tsx`): search field `q` + normalizeArabic matching (line 83), category pill strip (`activeCategory`), product cards → product dialog (`product-dialog.tsx`), cart sheet with count badge, WhatsApp store link `waLink(toE164(…))` (lines 180–186), theme toggle, skip link.
- **Cart drawer** (`src/components/storefront/cart-drawer.tsx`): per-line quantity ± / remove (113–135), per-item note input with `aria-label` (148–155), subtotal, checkout link.
- **Verdict: PASS (code + tests).** `tests/browser/journey.spec.ts:15–124` drives the whole path (h1, featured section, 6 products, dialog, add-to-cart, drawer «عرض السلة (1 عنصر)»). Unknown/inactive slug → `notFound()` (page gate reuses `getBusiness`).
- **Demo honesty:** the demo store is seeded as «مخبز الواحة — تجريبي» with description «متجر تجريبي يعرض تجربة التسوق الكاملة في سمارت أوردر» (`src/app/api/seed/route.ts:53–55`, twin in `scripts/e2e-seed.mjs:165–167`) — the word «تجريبي» is in the store name itself.

### `/store/[slug]/checkout` — checkout
- **File:** `src/app/store/[slug]/checkout/page.tsx` — server gate: business must exist + `isActive` + `isPublished` (lines 15–19), `noindex` (robots line 10).
- **Composition root:** `src/components/storefront/checkout-client.tsx` — 3-node journey indicator with `aria-current="step"` (60–64, 270–311); the form is a real `<form onSubmit>` with `noValidate` (332–340); submit flow = client validation → `POST /api/public/orders` → success screen + `router.replace(/track/{token}?placed=1)` (206).
- **Sections** (`src/components/storefront/checkout/`): fulfillment DELIVERY/PICKUP, customer info, delivery zone tiles + address, payment (provider tiles from the store's DB methods, transfer-number copy row, USSD quick-code copy, wallet-cap gate), note, cart summary, sticky submit bar; plus `empty-cart-screen`, `checkout-hold` (pre-hydration), `success-screen`.
- **Verdict: PASS (code + tests).** Journey spec pins the exact submit contract: response 201, `SO-YYYYMMDD-NNNN` order number, redirect to `?placed=1`, «تم استلام طلبك!» banner (`tests/browser/journey.spec.ts:100–115`). Validation is two-sided (see §5).

### `/track/[token]` — tracking + confirmation
- **File:** `src/app/track/[token]/page.tsx` — token-shape guard (50), SSR of the full order + **history rows** (66), `deliveredAt` derived from the first `DELIVERED` history row, never fabricated (72–77), `?placed=1` → confirmation banner prop (46–49, 81).
- **Controls** (`src/components/storefront/tracking-client.tsx`): 6-station road + destination terminus (TRACKING_FLOW), live `role="status"` stamp, per-station real timestamps, 15s visibility-gated poll (219–233) that also refreshes the history log (194–205), offline hint + manual retry (738–755), WhatsApp/call actions, receipt with mono tabular totals.
- **Verdict: PASS (code + tests).** `tests/browser/tracking.spec.ts:33–84` (7 `ol li` nodes, all six station labels, active node pulse, dashed terminus, mono total); PICKUP hides the «في الطريق إليك» station (85–96); invalid/unknown token → 404 (16–31). Stamps pinned in `tests/unit/station-stamp.test.ts`.

## 2) Marketing / legal pages

### `/` — landing (the claims carrier)
- **File:** `src/app/page.tsx` (ISR 60s, line 18) — server-rendered h1, chapters 00–06, JSON-LD Organization/WebSite (22–45).
- **Controls:** nav + megamenu + burger (`LandingHeader.tsx:131–242`), hero CTAs `/register` + `/store/demo-store` (`hero-section.tsx:99–104`), draggable dotted globe (`GlobeMount`/`GlobeScene`, decorative `aria-hidden`), journey tablist (WAI-ARIA roving tabindex, `OrderJourneySection.tsx:33–35`), dashboard interactive demo (`DashboardSection.tsx`), `<details>` FAQ (zero JS, `LandingFaq.tsx:62`), theme toggle, roadmark CountUp figures.
- **Verdict: PASS.** Parity pins the roadmark board + CountUp presence (`tests/parity.mjs:932–933`). Claims audit in §4.

### `/pricing`
- **File:** `src/app/pricing/page.tsx` — plans from the DB (`getPlans`, 26–40; self-seeding family catalog in `src/app/api/plans/route.ts:24–66`: Free 0 / Basic 19 / Pro 129), SSR'd initial data. `PricingClient` renders plan cards + limits block + FAQ + «ابدأ مجاناً بدون بطاقة ائتمان» CTA (349, 390–395).
- **Verdict: PASS.** Prices are DB-backed, not hard-coded; the free plan exists (price 0) backing every «مجاناً» claim.

### `/privacy`, `/terms` — static legal
- `src/app/privacy/page.tsx:54–55`, `src/app/terms/page.tsx:54–55` — «آخر تحديث: سبتمبر 2026 — منصة سمارت أوردر، من عائلة الربط الذكي». No interactive controls beyond anchor nav. **PASS (code-read).**

## 3) Auth

### `/login`
- **File:** `src/app/login/page.tsx` — email/password with Arabic per-field validation + `aria-invalid` + first-invalid focus (36–60, 4-c contract), password eye toggle 44px (209–217), expired-session banner from the 401 funnel (38–52), family brand card «الربط الذكي / لوحة تحكم المتاجر» (137–146 — the family umbrella brand, consistent with privacy/terms «من عائلة الربط الذكي»).
- **Verdict: PASS (code).** API side `src/app/api/auth/login/route.ts` (+ rate limiting in `lib/rate-limit.ts`).

### `/register`
- **File:** `src/app/register/page.tsx` — 2-step wizard (`plan` → `account`, lines 66, 254–…), `?plan=` deep-link preselect (65–66), plan cards from `/api/plans` (`PlanSelector`), business profile + city select (LIBYA_CITIES) + password confirmation. **PASS (code).**

## 4) Claims verification (the advertised metrics)

| Claim (rendered) | Where | Source | Verdict |
|---|---|---|---|
| «+N متجر على الطريق» / «+N طلب عبر المنصّة» (roadmark board, aria-label «أرقام المنصّة الحقيقية») | `hero-section.tsx:39–49,129–140` | **REAL DB** — `getLandingStats()` in `page.tsx:48–58`: `db.business.count({isActive, isPublished})` + `db.order.count()`, ISR 60s, fail-closed to 0 | TRUE — real counts, no invention; «+» convention documented in-code (`hero-section.tsx:35`) |
| Trust pill «أكثر من {trustCount} متجر يثقون بنا» (only when > 0) | `hero-section.tsx:107–123` | same DB count | TRUE (real count). «أكثر من N» is the verbal form of the roadmark «+N» idiom — documented as the family convention; strictly-exact phrasing would be «N متجر». Left unchanged (convention, not fabrication). |
| «6 طرق دفع» (roadmark) | `hero-section.tsx:48` | **was hard-coded "6"** — true today (`PAYMENT_TYPES.length === 6`, `src/lib/constants.ts:60`) but anchored only by a comment | **FIXED this task** → now derived `PAYMENT_TYPES.length` so the hero can never drift from the toll-station list (same class as the r140 «القالب يتبع الثابت» WALLET_CAP_LYD fix). Rendered value unchanged («6»). |
| «ست طرق دفع حقيقية تُدار من لوحة التاجر وتظهر في صفحة الطلب» + the six plates | `PaymentsSection.tsx:53,61–80` | `PAYMENT_TYPES`/`PAYMENT_TYPE_AR`/`PAYMENT_TYPE_DESCRIPTIONS` verbatim (`constants.ts:60–79`) | TRUE — merchant-managed: dashboard `/dashboard/payments` + `api/payment-methods` `z.enum(PAYMENT_TYPES)` (`route.ts:13`, one per type via `businessId_type` unique); checkout renders the store's **active** methods from `/api/public/store/[slug]` (`route.ts:103–107`) into `PaymentSection` tiles |
| USSD sample «النمط (نموذج لـ 45 د.ل)» | `PaymentsSection.tsx:39–41,92–94` | generated by the REAL `libyanaUssdCode()` (`lib/payment-constants.ts:22–28`) | TRUE and **explicitly labeled «نموذج» (sample)** — the same generator checkout shows (`payment-section.tsx:169–172`) |
| «سقف التحويل الواحد 99 د.ل … والمنصّة تتحقق منه قبل إتمام الطلب» | `PaymentsSection.tsx:100–105` | `WALLET_CAP_LYD = 99` (`payment-constants.ts:13`); enforced at checkout `use-checkout-state.ts:66` + `payment-section.tsx:153–158` | TRUE |
| «الدفع عند التوصيل محطة في الرحلة … الحالة تنتقل من غير مدفوع إلى مدفوع» | `PaymentsSection.tsx:110–115` | payment-status machine (`api/orders/[id]/route.ts:80–98`, `canMarkPaid` `order-machine.ts:58–60`) | TRUE |
| Landing FAQ: «كل طلب يصل فوراً إلى لوحة التحكم مع تنبيه عند وصول الطلبات الجديدة» | `LandingFaq.tsx:16` | dashboard orders 20s visibility-gated poll + «وصلت طلبات جديدة» toast (`dashboard/orders/page.tsx:106–163`) + pending banner on `/dashboard` (`page.tsx:185–188`) | TRUE |
| FAQ: «سننبّهك عند الاقتراب من الحد الأقصى للمنتجات أو الطلبات الشهرية» | `LandingFaq.tsx:32` | `PlanUsageBadge` usage bars, amber warn at ≥80% (`plan-usage-badge.tsx:36–37,88–99`) | TRUE — a persistent in-dashboard warning indicator (not a push notification); wording is fair |
| FAQ: «الباقة المجانية متاحة للأبد مع حدود واضحة» | `LandingFaq.tsx:24` | Free plan price 0, limits 15 products/100 orders (`api/plans/route.ts:27–32`) | TRUE for the shipped catalog; «للأبد» is a business commitment (documented as such) |
| FAQ payment answer «الدفع نقداً عند الاستلام، أو تحويل عبر مدار وليبيانا …» | `LandingFaq.tsx:19–21` | accurate **subset** (COD/MADAR/LIBYANA of the six; the full list is chapter 04 one screen below) | TRUE, partial by design — no fix needed |
| «التسجيل يستغرق أقل من دقيقتين» (FAQ + `StorefrontSection.tsx:16`) | UX-duration claim | **unverifiable-by-reading** — the wizard is 2 steps (plan + account) so it is plausible, but no static measurement exists | Documented as marketing puffery; no change |
| Storefront-scene cart «بيتزا مارغريتا ×2 / 90 د.ل» + payment chips | `storefront-scene.tsx:181–205` | illustrative phone graphic — values EXACTLY match the seeded demo store (45 د.ل pizza, 9 د.ل juice; `api/seed/route.ts:14–21`) and its 3 methods (COD/Libyana/Madar) | consistent illustration, CTA below is labeled «المتجر التجريبي» |
| Dashboard chapter demo | `DashboardSection.tsx:102,119` | «نموذج تفاعلي» chip + lede «هذا نموذج تفاعلي يعمل بآلة الحالات» | **explicitly labeled demo** — runs the REAL order-machine |

**Payment methods: advertised vs implemented — MATCH.** The landing advertises exactly `PAYMENT_TYPES` (6); the merchant dashboard can enable each of those 6 (API-validated); checkout renders whichever the store activated, with per-type behavior: COD/CASH footnote «الدفع نقداً عند وصول طلبك» (`payment-section.tsx:203–207`), transfer types show number + USSD quick-code with the wallet cap. No advertised method is unimplemented; no implemented method is unadvertised.

**Tracking visualization: real data only.** Station stamps come exclusively from `OrderStatusHistory` DB rows (SSR'd `track/[token]/page.tsx:66`, poll-refreshed `tracking-client.tsx:194–205`); a station without a row renders no stamp (`tracking-client.tsx:498–508`, terminus 591–598 «never a fabricated arrival»). No demo/fabricated timestamps exist on the tracking surface.

## 5) Checkout / tracking spot check (this task's re-verification)

- **Checkout validation (client):** one-pass field collection — name ≥ 2 chars, `normalizeLibyanPhone`, zone + address required for DELIVERY, payment required; first failing field gets `aria-invalid` + focus/scroll (`checkout-client.tsx:120–148`); empty-cart and min-order guards (125–129); idempotency key minted once per cart-session, retired only on confirmed success (110–118, 150–196); stale-error toast retired at commit (179–196).
- **Checkout validation (server):** zod `createSchema` (`api/public/orders/route.ts:31–46`) re-validates name/phone/address, phone re-normalized server-side (89–93), server re-prices every line (header comment 1–8), idempotency replay returns the full original order shape (74–…), rate-limit 8/min (68–70).
- **Order status machine:** transition table `src/lib/order-machine.ts:11–34` (terminal states 31–33, PICKUP skips dispatch 36–46); enforced server-side with permission gates + destructive `orders.cancel` + payment sub-machine + **CAS conditional write** and history rows inside one transaction (`api/orders/[id]/route.ts:58–98, 109–179`). Initial `NEW` history row written at creation (`api/public/orders/route.ts:298–302`). **Pinned by `tests/unit/order-machine.test.ts`** (full legal edge list, pickup branch, invalid jumps, terminal + canMarkPaid).
- **Tracking per-station timestamps:** `stationTimes` memo = first arrival per status (`tracking-client.tsx:188–192`, first occurrence wins because payment rows repeat the current status); stamps mount-gated clock text (hydration-safe, 176–186); formatter `formatStationStampAr` two-tier contract (clock-only same-day, day+clock across midnight) **pinned by `tests/unit/station-stamp.test.ts:30–53`**; the 15s cadence claim on the landing (`OrderJourneySection.tsx:85`) matches `setInterval(…, 15000)` (`tracking-client.tsx:227`).
- **Dashboard side of the machine:** transitions rendered from `getAllowedTransitions` (`dashboard/orders/[id]/page.tsx:38, 261`), destructive actions behind `ConfirmDialog` (782–813), WhatsApp customer confirmation via `waLink + buildCustomerConfirmationMessage` (274–276).

## 6) Merchant dashboard (auth-gated, `dashboard/layout.tsx:17–19` redirect)

| Route | Purpose | Key controls | Verdict / evidence |
|---|---|---|---|
| `/dashboard` | KPI home | 4 KPI cards (todayOrders/pending/todayRevenue/avgOrder `page.tsx:148–173`), pending banner → orders?status=NEW (185–188), `PlanUsageBadge`, 20s visibility-gated poll (92–96) | PASS — real `/api/dashboard/stats` |
| `/dashboard/orders` | order ops | status `UnderlineTabs` (252), search (272), table + pagination, **new-order toast poll** (106–163), new-count badge (215–229) | PASS — `tests/browser/dashboard-orders.spec.ts` |
| `/dashboard/orders/[id]` | order detail | machine transition buttons + note, payment confirm, history timeline (700), WhatsApp confirm (274) | PASS — code + machine unit tests |
| `/dashboard/products` | catalog CRUD | search (150), product editor dialog (image auto-compress 500KB `product-editor.tsx:223,481`), price validation (239) | PASS (code) |
| `/dashboard/categories` | section CRUD | editor + `ConfirmDialog` (36, 61) | PASS (code) |
| `/dashboard/customers` + `/[id]` | CRM | search (106), detail w/ addresses & orders | PASS (code) |
| `/dashboard/delivery` | zones | fee + minOrder rows, `Switch` active toggle (10, 72) | PASS (code) |
| `/dashboard/payments` | payment methods | enable/ configure the 6 types, transfer number + instructions (80–82) | PASS — API `z.enum(PAYMENT_TYPES)` |
| `/dashboard/staff` | team | role accounts (OWNER/ADMIN/STAFF) (78) | PASS — `ROLE_PERMISSIONS` enforced API-side |
| `/dashboard/settings` | business profile | copy store link / open store (223–239) | PASS (code) |
| `/dashboard/onboarding` | first-run setup | wizard «إعداد متجرك» (234) | PASS (code) |
| `/dashboard/admin/payments` | platform-admin subscription approvals | approve / reject-with-note + receipt preview (54–94, 255–264) | PASS (code) — gated by `isPlatformAdmin` |

## 7) Boundaries, 404, metadata, API

- **404** `src/app/not-found.tsx` (mono 404 + links); **app errors** `error.tsx` / `global-error.tsx`; **route-level** `store/[slug]/error.tsx` + `track/[token]/error.tsx` (ErrorState + retry, error logged server-side, never leaked to the customer). Code-read only — not deliberately triggered this session (documented gap).
- **robots.ts:** allows `/` + store pages, disallows `/dashboard, /api, /track, /login, /register, /store/*/checkout` (checkout noindex also per-page). **sitemap.ts:** static marketing entries only + live store URLs (DB, `dynamic = "force-dynamic"`); `/register` dropped from sitemap to resolve the robots↔sitemap contradiction (r132-F1c).
- **API (34 route files):** public — `/api/public/store/[slug]` (GET/HEAD, active+published gates), `/api/public/orders` (POST money path), `/api/public/track/[token]` (GET, safe subset + history), `/api/plans` (self-seeding catalog), `/api/health` (in-memory rate-limited SELECT 1), `/api/seed` (secret/admin-gated demo-store + plans). Auth — login/logout/me/register. Business (session + `requireBusiness` + `requirePermission` + tenant-scoped queries throughout): business, categories, customers, dashboard/stats, delivery-zones, media, orders, payment-methods, products, staff, subscriptions (list/receipt/status/review).

## 8) Honest gaps (documented, not fixed here)

1. **No in-browser verification this session** (task constraint): all verdicts are code-read + test-evidence; the Playwright battery (`tests/browser/*.spec.ts`) needs a seeded dev server and was **not** re-run.
2. «أكثر من N متجر يثقون بنا» rides the documented «+N» convention with an exact count (see §4) — judgment call, left as-is for the coordinator.
3. «التسجيل أقل من دقيقتين» remains unverifiable-by-reading (marketing puffery).
4. «للأبد» (free plan) is a business commitment, not a code-verifiable fact.
5. error/global-error boundaries not live-triggered (would require fault injection).

---

## 9) W7-F audit addendum (2026-10-20, `main @ cc30df2`)

Back-fill audit of this matrix's open items, re-verified by code-read at HEAD
(19 commits after the 42e1d2c snapshot):

- **Counts drifted (expected — this matrix is a dated snapshot):** HEAD has
  **24 page routes** (10 public + 14 dashboard) and **37 API route files**.
  Added since 42e1d2c: `/track` public lookup (W2-D1) · `/dashboard/reports`
  (W6-B4, gated بريميوم+ since W7-D) · `/api/public/track` (W2-D1) ·
  `/api/public/track/[token]/confirm` (W6-B7) · `/api/dashboard/reports`
  (W6-B4) · `/api/dashboard/reports/export` (W7-D server seam).
  (The header count "34 API route files" was 33 by `git ls-tree` at 42e1d2c —
  recorded as-is; the canonical count at HEAD is the one above.)
- **§4 claims re-verified at HEAD — still hold:** the «6 طرق دفع» roadmark
  still derives from `PAYMENT_TYPES.length` (`hero-section.tsx:52`); the
  trust pill still renders only when the real DB count is > 0
  (`showTrustBadge`, `hero-section.tsx:34`).
- **§8 gaps — dispositions unchanged:** «أقل من دقيقتين» (still in
  `LandingFaq.tsx:12` + `StorefrontSection.tsx:16`) and «للأبد» remain
  documented marketing/commitment wording; the error-boundary live-trigger
  gap remains (the browser battery pins the boundaries' existence and retry
  copy, not fault injection). The W2-D3 wave additionally truthtened the
  limit-FAQ answer the matrix quoted in §4 — live copy at
  `LandingFaq.tsx:32` now states the enforced stop-at-the-cap behavior.
