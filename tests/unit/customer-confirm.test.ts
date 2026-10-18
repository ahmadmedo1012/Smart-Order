// W6-B7 — the customer one-tap order confirmation (the COD loop).
//
// WHAT SHIPPED: POST /api/public/track/[token]/confirm — a token-scoped,
// once-only, rate-limited write of Order.customerConfirmedAt (a SEPARATE
// persisted stamp: not a payment state, not a status transition — the
// owner's NEW→CONFIRMED stays a human decision). The tracking page
// renders «أؤكد طلبي» while the order is confirmable and the durable
// «تم تأكيد طلبك» success stamp after; owners see «مؤكد من العميل».
//
// TEST SHAPE (the repo's convention — tx-contract/seed-secret precedents):
// the route imports next/server + Prisma, so a dependency-free node --test
// pins the BEHAVIOR of the pure seam (the order-machine's confirmability
// law) and the WIRING of the route/pages via source contracts;
// HTTP-level behavior (real tokens, real races, the 429 path) lives in
// the CI e2e battery (tests/e2e/api-e2e.js section 6.5 — driven there).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  canCustomerConfirm,
  CUSTOMER_CONFIRM_HISTORY_NOTE,
} from "../../src/lib/order-machine.ts";
import { ORDER_STATUSES, type OrderStatus } from "../../src/lib/constants.ts";

const read = (p: string): string =>
  readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

/* Comments stripped — the contract is about statements, not narration
   (tx-contract.test.ts convention). */
const stripped = (src: string): string =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, " ");

const route = stripped(read("../../src/app/api/public/track/[token]/confirm/route.ts"));
const trackPage = read("../../src/app/track/[token]/page.tsx");
const trackClient = read("../../src/components/storefront/tracking-client.tsx");
const ordersListRoute = read("../../src/app/api/orders/route.ts");
const ordersPage = read("../../src/app/dashboard/orders/page.tsx");
const ordersDetail = read("../../src/app/dashboard/orders/[id]/page.tsx");
const statusBadges = read("../../src/components/shared/status-badges.tsx");
const schemaSqlite = read("../../prisma/schema.prisma");
const schemaPg = read("../../prisma/schema.postgres.prisma");

const TERMINAL: OrderStatus[] = ["DELIVERED", "CANCELLED", "REJECTED"];
const NON_TERMINAL: OrderStatus[] = ORDER_STATUSES.filter(
  (s) => !TERMINAL.includes(s),
);

/* ── behavior: the machine's confirmability law ─────────────────── */

test("behavior: canCustomerConfirm is open on every non-terminal status (the COD loop lives on live orders)", () => {
  for (const s of NON_TERMINAL) {
    assert.equal(canCustomerConfirm(s), true, `${s} must be confirmable`);
  }
});

test("behavior: terminal orders are closed to confirmation (delivered needs none; cancelled/rejected must not read as confirmable)", () => {
  for (const s of TERMINAL) {
    assert.equal(canCustomerConfirm(s), false, `${s} must refuse confirmation`);
  }
});

test("behavior: the owner-visible history ink is exactly the customer-action sentence", () => {
  assert.equal(CUSTOMER_CONFIRM_HISTORY_NOTE, "أكد العميل طلبه من رابط التتبع");
});

/* ── wiring: the endpoint's guards (source contract) ─────────────── */

test("wiring: the family's rate-limit budget — dbRateLimit 10/10min per IP on the track-confirm key (the lookup route's twin)", () => {
  assert.ok(
    route.includes('dbRateLimit(`track-confirm:${ip}`, 10, 10 * 60 * 1000)'),
    "must mirror the track-lookup budget exactly",
  );
  assert.ok(
    route.includes('fail("محاولات كثيرة جداً في وقت قصير، انتظر قليلاً", 429'),
    "the 429 copy is the family's",
  );
  assert.ok(
    route.includes('"retry-after": String(rl.retryAfterSec)'),
    "429 advertises Retry-After (r138)",
  );
});

test("wiring: token shape is validated before any DB round trip (the GET route's exact gate)", () => {
  assert.ok(route.includes("TOKEN_RE"));
  assert.ok(route.includes("/^[0-9a-f-]{16,64}$/i"));
  assert.ok(route.includes('fail("رابط التتبع غير صحيح", 400)'));
});

test("wiring: ONCE-ONLY — the CAS updateMany writes ONLY the stamp, guarded WHERE customerConfirmedAt IS NULL and status notIn terminal", () => {
  const casIdx = route.indexOf("tx.order.updateMany");
  assert.ok(casIdx !== -1, "the write is the family's updateMany CAS");
  const where = route.slice(casIdx, casIdx + 400);
  assert.ok(where.includes("customerConfirmedAt: null"), "WHERE stamp IS NULL");
  assert.ok(
    where.includes('status: { notIn: ["DELIVERED", "CANCELLED", "REJECTED"] }'),
    "WHERE non-terminal",
  );
  assert.ok(
    route.includes("data: { customerConfirmedAt: confirmedAt }"),
    "the ONLY data written is the stamp",
  );
});

test("wiring: the stamp and its history row ride ONE transaction (crash between them is impossible)", () => {
  assert.ok(route.includes("db.$transaction"));
  assert.ok(route.includes("tx.orderStatusHistory.create"));
  assert.ok(route.includes("note: CUSTOMER_CONFIRM_HISTORY_NOTE"));
  assert.ok(route.includes('changedByName: "العميل"'), "the row is authored by the customer, not a user");
});

test("wiring: repeat taps are idempotent success (same stamp + already:true), never an error the customer could read as failure", () => {
  assert.ok(route.includes("already: false"));
  assert.ok(route.includes("already: true"));
});

test("wiring: honesty without enumeration or PII — the unknown-token 404 is the lookup route's copy, and the response never carries name/phone/totals", () => {
  assert.ok(
    route.includes('fail("لا يوجد طلب بهذه البيانات", 404, "NOT_FOUND")'),
    "the SAME honest 404 the lookup route answers",
  );
  assert.ok(route.includes('fail("لا يمكن تأكيد طلب منتهٍ", 409, "INVALID_STATE")'));
  for (const banned of ["customerName", "customerPhone", "total:"]) {
    assert.ok(!route.includes(banned), `route must never ship \`${banned}\``);
  }
});

test("wiring: no body is read — the token IS the credential (nothing else can be supplied or leaked)", () => {
  assert.ok(!route.includes("readJson"));
});

/* ── wiring: the schema twins carry the additive nullable stamp ──── */

test("schema: the stamp is additive and nullable in BOTH hand-kept twins (the r134 contract)", () => {
  for (const [name, schema] of [
    ["sqlite", schemaSqlite],
    ["postgres", schemaPg],
  ] as const) {
    const lines = schema.match(/customerConfirmedAt DateTime\?/g) ?? [];
    assert.equal(lines.length, 1, `${name}: exactly one Order.customerConfirmedAt declaration`);
  }
});

/* ── wiring: the customer surface (page + client) ────────────────── */

test("track page: SSR seeds the stamp + passes the token down (the success state survives reload)", () => {
  assert.ok(trackPage.includes("customerConfirmedAt: true"));
  assert.ok(trackPage.includes("customerConfirmedAt={order.customerConfirmedAt"));
  assert.ok(trackPage.includes("confirmToken={token}"));
});

test("track client: the prompt renders ONLY while confirmable — the canCustomerConfirm client twin", () => {
  assert.ok(
    trackClient.includes(
      'const confirmable = !isCancelled && status !== "DELIVERED" && !confirm.confirmedAt;',
    ),
    "not-cancelled, not-delivered, not-yet-stamped",
  );
  assert.ok(trackClient.includes('{confirmable && ('));
});

test("track client: the button speaks «أؤكد طلبي» on the 44px floor (h-11) with a visible busy state", () => {
  assert.ok(trackClient.includes("أؤكد طلبي"));
  assert.ok(trackClient.includes('className="mt-4 flex h-11 w-full'));
});

test("track client: the durable success state is the family success stamp — «تم تأكيد طلبك», role=status + aria-live, never on a cancelled order", () => {
  assert.ok(trackClient.includes("تم تأكيد طلبك"));
  // the stamp's whole block, from its render gate to the bold copy, carries the live-region contract
  const gateIdx = trackClient.indexOf("{confirm.confirmedAt && !isCancelled && (");
  const copyIdx = trackClient.indexOf('>تم تأكيد طلبك</div>');
  assert.ok(gateIdx !== -1 && copyIdx !== -1 && gateIdx < copyIdx);
  const block = trackClient.slice(gateIdx, copyIdx);
  assert.ok(block.includes('role="status"'));
  assert.ok(block.includes('aria-live="polite"'));
  // the family success-stamp grammar (the placed banner's classes)
  assert.ok(block.includes("border-success/30 bg-success/10"));
});

test("track client: failures land in an inline role=alert (no sonner on the storefront surface)", () => {
  assert.ok(trackClient.includes('role="alert"'));
  assert.ok(trackClient.includes("{confirm.error && ("));
});

test("track client: the 15s poll refreshes the stamp (another tab's confirmation lands without a reload)", () => {
  assert.ok(
    trackClient.includes('typeof body.data.order.customerConfirmedAt === "string"'),
  );
});

/* ── wiring: the owner surface (list + detail + badge) ───────────── */

test("owner list API: the rows select the stamp", () => {
  assert.ok(ordersListRoute.includes("createdAt: true, customerConfirmedAt: true"));
});

test("owner badges: status-badges exports the mint «مؤكد من العميل» stamp (the family badge grammar)", () => {
  assert.ok(statusBadges.includes("export function CustomerConfirmedBadge"));
  assert.ok(statusBadges.includes("مؤكد من العميل"));
  assert.ok(statusBadges.includes("BadgeCheck"));
});

test("owner list UI: the compact mint flag rides desktop rows AND mobile cards, speaking to screen readers", () => {
  for (const surface of [ordersPage]) {
    const flags = surface.match(/aria-label="مؤكد من العميل"/g) ?? [];
    assert.ok(flags.length >= 2, "both the table twin and the mobile card twin carry the flag");
    assert.ok(surface.includes("BadgeCheck"));
  }
});

test("owner detail: the full badge + the mono confirmation time line ride the header (metadata follows the created-at voice)", () => {
  assert.ok(ordersDetail.includes("<CustomerConfirmedBadge"));
  assert.ok(ordersDetail.includes("مؤكد من العميل — {formatArabicDateTime(order.customerConfirmedAt)}"));
  assert.ok(ordersDetail.includes("customerConfirmedAt: string | null;"));
});
