// P43 SO-2c — the reconciliation builders' pins (src/lib/reports-
// reconciliation.ts): the per-payment-method collapse (gross − discount
// = net, paid vs unpaid, REFUNDED never counts as collected) and the
// coupon usage ledger (case-insensitive type match, deleted coupons
// read «—», sorted by discount given). Pure functions, DB-shaped rows.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildCouponUsageRows,
  buildPaymentMethodBreakdown,
  type CouponUsageGroupRow,
  type PaymentMethodGroupRow,
} from "../../src/lib/reports-reconciliation.ts";
import { COUPON_TYPE_AR } from "../../src/lib/coupon.ts";

function pmRow(
  over: Partial<PaymentMethodGroupRow> = {},
): PaymentMethodGroupRow {
  return {
    paymentMethodName: "نقداً عند التسليم",
    paymentType: "CASH",
    paymentStatus: "UNPAID",
    _count: { _all: 1 },
    _sum: { subtotal: 10_000, deliveryFee: 2_000, discount: 0, total: 12_000 },
    ...over,
  };
}

/* ── buildPaymentMethodBreakdown ─────────────────────────────────── */

test("breakdown: one row per method — (method × status) groups collapse, gross − discount = net", () => {
  const rows = [
    pmRow({ paymentStatus: "PAID", _count: { _all: 1 }, _sum: { subtotal: 10_000, deliveryFee: 2_000, discount: 500, total: 11_500 } }),
    pmRow({ paymentStatus: "UNPAID", _count: { _all: 2 }, _sum: { subtotal: 20_000, deliveryFee: 4_000, discount: 1_000, total: 23_000 } }),
    // طريقة أخرى — صفها الخاص
    pmRow({ paymentMethodName: "تحويل مدار", paymentType: "MADAR", _count: { _all: 1 }, _sum: { subtotal: 8_000, deliveryFee: 0, discount: 0, total: 8_000 } }),
  ];
  const out = buildPaymentMethodBreakdown(rows);
  assert.equal(out.length, 2);
  const cash = out.find((r) => r.type === "CASH")!;
  assert.equal(cash.orders, 3);
  assert.equal(cash.gross, 36_000); // (10+2) + (20+4) — subtotal + deliveryFee
  assert.equal(cash.discount, 1_500);
  assert.equal(cash.net, 34_500); // 11.5 + 23 — المجاميع الملزمة
  assert.equal(cash.gross - cash.discount, cash.net); // قانون الدفتر الواحد
  assert.equal(cash.paid, 1);
  assert.equal(cash.unpaid, 2);
  const madar = out.find((r) => r.type === "MADAR")!;
  assert.equal(madar.net, 8_000);
});

test("breakdown: REFUNDED is never collected money — it counts as unpaid (the method's takings are never overstated)", () => {
  const out = buildPaymentMethodBreakdown([
    pmRow({ paymentStatus: "PAID" }),
    pmRow({ paymentStatus: "REFUNDED" }),
    pmRow({ paymentStatus: "UNPAID" }),
  ]);
  assert.equal(out[0]!.paid, 1);
  assert.equal(out[0]!.unpaid, 2); // UNPAID + REFUNDED
});

test("breakdown: null method name buckets to «غير محدد»; same name different type keeps two rows; sorted by net desc", () => {
  const out = buildPaymentMethodBreakdown([
    pmRow({ paymentMethodName: null, paymentType: null, _sum: { subtotal: 5_000, deliveryFee: 0, discount: 0, total: 5_000 } }),
    pmRow({ paymentMethodName: "محفظة", paymentType: "LIBYANA", _sum: { subtotal: 20_000, deliveryFee: 0, discount: 0, total: 20_000 } }),
    // نفس الاسم بنوع مختلف — صفان (الاسم التجاري قد يتكرر عبر العائلات)
    pmRow({ paymentMethodName: "محفظة", paymentType: "MANUAL", _sum: { subtotal: 1_000, deliveryFee: 0, discount: 0, total: 1_000 } }),
  ]);
  assert.equal(out.length, 3);
  assert.equal(out[0]!.name, "محفظة"); // الأثقل صافياً أولاً
  assert.equal(out[0]!.type, "LIBYANA");
  assert.ok(out.some((r) => r.name === "غير محدد" && r.type === null));
});

test("breakdown: bigint sums (PG prod shape) and null sums are coerced, never NaN", () => {
  const out = buildPaymentMethodBreakdown([
    pmRow({
      _count: { _all: 2 },
      _sum: { subtotal: 10_000n, deliveryFee: 2_000n, discount: 500n, total: 11_500n },
    }),
    pmRow({ paymentMethodName: "فارغ", paymentType: "CASH", _count: { _all: 0 }, _sum: { subtotal: null, deliveryFee: null, discount: null, total: null } }),
  ]);
  const first = out.find((r) => r.name === "نقداً عند التسليم")!;
  assert.equal(first.gross, 12_000);
  assert.equal(first.net, 11_500);
  const empty = out.find((r) => r.name === "فارغ")!;
  assert.equal(empty.gross, 0);
  assert.equal(empty.net, 0);
  assert.ok(Number.isFinite(empty.net));
});

test("breakdown: empty window answers an empty table (no ghost rows)", () => {
  assert.deepEqual(buildPaymentMethodBreakdown([]), []);
});

/* ── buildCouponUsageRows ────────────────────────────────────────── */

function couponRow(code: string | null, uses: number, discount: number): CouponUsageGroupRow {
  return { couponCode: code, _count: { _all: uses }, _sum: { discount } };
}

test("coupon usage: code, type, uses, discount given — matched case-insensitively against the merchant's rows", () => {
  const out = buildCouponUsageRows(
    [couponRow("save10", 3, 4_500), couponRow("FREESHIP", 1, 2_000)],
    [
      { code: "SAVE10", type: "PERCENT" },
      { code: "FREESHIP", type: "FREE_DELIVERY" },
    ],
    COUPON_TYPE_AR,
  );
  assert.equal(out.length, 2);
  const pct = out.find((r) => r.code === "save10")!;
  assert.equal(pct.type, COUPON_TYPE_AR.PERCENT); // نسبة مئوية — إملاء التاجر الكانوني
  assert.equal(pct.uses, 3);
  assert.equal(pct.discount, 4_500);
  assert.equal(out.find((r) => r.code === "FREESHIP")!.type, COUPON_TYPE_AR.FREE_DELIVERY);
});

test("coupon usage: a deleted coupon reads «—» (the Order snapshot is the truth, the type is best-effort context)", () => {
  const out = buildCouponUsageRows([couponRow("GONE", 1, 1_000)], [], COUPON_TYPE_AR);
  assert.equal(out[0]!.type, "—");
  assert.equal(out[0]!.uses, 1);
});

test("coupon usage: null/blank snapshot codes are skipped defensively; sorted by discount given desc", () => {
  const out = buildCouponUsageRows(
    [couponRow("SMALL", 5, 500), couponRow(null, 2, 999), couponRow("   ", 1, 999), couponRow("BIG", 1, 5_000)],
    [],
  );
  assert.equal(out.length, 2);
  assert.equal(out[0]!.code, "BIG"); // الأكبر إنفاقاً أولاً
  assert.equal(out[1]!.code, "SMALL");
});

test("coupon usage: bigint discount sums (PG prod shape) coerce to Number", () => {
  const out = buildCouponUsageRows([couponRow("B", 2, 3_000n)], []);
  assert.equal(out[0]!.discount, 3_000);
});
