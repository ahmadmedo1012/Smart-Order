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
  buildRefundDueRows,
  buildTimeInStatusMetrics,
  formatLegMinutesAr,
  type CouponUsageGroupRow,
  type PaymentMethodGroupRow,
  type RefundDueQueryRow,
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
      /* PG ترسل المجاميع BigInt — تُبنى عبر BigInt() (هدف tsc ES2017 لا
         يقبل الحرفية n-لاحقة، والاستدعاء معلن في lib esnext) */
      _sum: { subtotal: BigInt(10_000), deliveryFee: BigInt(2_000), discount: BigInt(500), total: BigInt(11_500) },
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

function couponRow(code: string | null, uses: number, discount: number | bigint): CouponUsageGroupRow {
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
  const out = buildCouponUsageRows([couponRow("B", 2, BigInt(3_000))], []);
  assert.equal(out[0]!.discount, 3_000);
});

/* ── P45-W1 (المبادرة D): استرجاعات مستحقة — بنّاء الصفوف الذي يغلق
 * النقطة العمياء (طلبات مدفوعة ثم ملغاة/مرفوضة كانت تسقط من كل
 * أسطح التسوية). نفس أسلوب البُناة أعلاه: دوال أنقى تُغذّى صفوف
 * Prisma وتُستهلك من الشاشة والملف معاً. */

function refundRow(over: Partial<RefundDueQueryRow> = {}): RefundDueQueryRow {
  return {
    orderNumber: "SO-20260130-0042",
    customerName: "زبون اختبار",
    total: 12_000,
    paymentMethodName: "تحويل بنكي",
    paymentType: "MANUAL",
    status: "CANCELLED",
    paymentStatus: "PAID",
    history: [{ createdAt: new Date("2026-01-30T10:00:00Z"), toStatus: "CANCELLED" }],
    ...over,
  };
}

test("refund-due: the paid-then-cancelled row appears — order number, customer, total, method snapshot, the audit-stamped Tripoli day", () => {
  const out = buildRefundDueRows([refundRow()]);
  assert.equal(out.length, 1);
  assert.equal(out[0]!.orderNumber, "SO-20260130-0042");
  assert.equal(out[0]!.customerName, "زبون اختبار");
  assert.equal(out[0]!.total, 12_000);
  assert.equal(out[0]!.methodName, "تحويل بنكي");
  assert.equal(out[0]!.paymentType, "MANUAL");
  // 10:00Z = ظهر طرابلس (+02:00) → نفس اليوم الطرابلسي 2026-01-30
  assert.equal(out[0]!.cancelledDay, "2026-01-30");
});

test("refund-due: the Tripoli midnight boundary — 23:30Z is NEXT Tripoli day (01:30 ليبيا)", () => {
  const out = buildRefundDueRows([
    refundRow({ history: [{ createdAt: new Date("2026-01-30T23:30:00Z"), toStatus: "CANCELLED" }] }),
  ]);
  assert.equal(out[0]!.cancelledDay, "2026-01-31");
});

test("refund-due: rejected orders are refund obligations too — REJECTED+PAID rides the table", () => {
  const out = buildRefundDueRows([refundRow({ status: "REJECTED", history: [{ createdAt: new Date("2026-01-29T08:00:00Z"), toStatus: "REJECTED" }] })]);
  assert.equal(out.length, 1);
  assert.equal(out[0]!.cancelledDay, "2026-01-29");
});

test("refund-due: the filter is exact — UNPAID+cancelled, PAID+delivered, PAID+in-flight never appear (no invented obligations)", () => {
  const out = buildRefundDueRows([
    refundRow({ paymentStatus: "UNPAID" }), // ملغي لكن غير مدفوع — لا استرجاع
    refundRow({ status: "DELIVERED", paymentStatus: "PAID", history: [] }), // مسلّم — ليس هنا
    refundRow({ status: "PREPARING", paymentStatus: "PAID", history: [] }), // جارٍ — ليس هنا
    refundRow(), // المستحق الوحيد
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0]!.orderNumber, "SO-20260130-0042");
});

test("refund-due: null method name reads «غير محدد»; a missing history stamp renders day «—» (never fabricated)", () => {
  const out = buildRefundDueRows([
    refundRow({ paymentMethodName: null, paymentType: null, history: [] }),
  ]);
  assert.equal(out[0]!.methodName, "غير محدد");
  assert.equal(out[0]!.cancelledDay, null);
});

test("refund-due: newest destruction day first, then heaviest total — the owner's heaviest obligations on top", () => {
  const out = buildRefundDueRows([
    refundRow({ orderNumber: "SO-OLD", total: 20_000, history: [{ createdAt: new Date("2026-01-28T10:00:00Z"), toStatus: "CANCELLED" }] }),
    refundRow({ orderNumber: "SO-NEW-BIG", total: 15_000, history: [{ createdAt: new Date("2026-01-30T10:00:00Z"), toStatus: "CANCELLED" }] }),
    refundRow({ orderNumber: "SO-NEW-SMALL", total: 9_000, history: [{ createdAt: new Date("2026-01-30T10:00:00Z"), toStatus: "CANCELLED" }] }),
  ]);
  assert.deepEqual(
    out.map((r) => r.orderNumber),
    ["SO-NEW-BIG", "SO-NEW-SMALL", "SO-OLD"],
  );
});

test("refund-due: empty window answers an empty table (no ghost rows)", () => {
  assert.deepEqual(buildRefundDueRows([]), []);
});

test("refund-due: the LEDGER LAW stays untouched for the non-cancelled aggregate (the builders never double-count)", () => {
  /* النقطة الحرجة: البنّاء الجديد لا يلمس قاعدة الدفتر — مجاميع الطرق
   * والكوبونات تبقى من غير الملغى حصراً (قاعدة الحساب)، والاسترجاع
   * المستحق سطح مستقل يُظهر ما تستثنيه القاعدة. الصف المدفوع+الملغي
   * لا يظهر في buildPaymentMethodBreakdown لأن المتصل لا يمرره أصلاً. */
  const methods = buildPaymentMethodBreakdown([
    pmRow({ paymentStatus: "PAID", _sum: { subtotal: 10_000, deliveryFee: 0, discount: 0, total: 10_000 } }),
  ]);
  const refund = buildRefundDueRows([refundRow()]);
  assert.equal(methods.length, 1);
  assert.equal(methods[0]!.gross - methods[0]!.discount, methods[0]!.net);
  assert.equal(refund.length, 1);
  // سطحان منفصلان لنفس الحقيقة المالية — لا تداخل ولا ازدواج عد
});

/* ── P45-W1 (المبادرة B): مقاييس زمن-في-حالة — البنّاء والعرض ────────── */

test("ops timing: completed legs average in minutes, first-entry-per-state only, negative legs dropped", () => {
  const t = (s: string) => new Date(`2026-01-30T${s}Z`);
  const rows = [
    // order A: NEW 10:00 → CONFIRMED 10:05 (5 min); PREPARING 10:10 → READY 11:10 (60 min)
    { orderId: "a", fromStatus: null, toStatus: "NEW", createdAt: t("10:00:00") },
    { orderId: "a", fromStatus: "NEW", toStatus: "CONFIRMED", createdAt: t("10:05:00") },
    { orderId: "a", fromStatus: "CONFIRMED", toStatus: "PREPARING", createdAt: t("10:10:00") },
    { orderId: "a", fromStatus: "PREPARING", toStatus: "READY", createdAt: t("11:10:00") },
    // order B: NEW 12:00 → CONFIRMED 12:03 (3 min) — no preparing leg
    { orderId: "b", fromStatus: null, toStatus: "NEW", createdAt: t("12:00:00") },
    { orderId: "b", fromStatus: "NEW", toStatus: "CONFIRMED", createdAt: t("12:03:00") },
    // order C: NEW only — an incomplete leg is never counted
    { orderId: "c", fromStatus: null, toStatus: "NEW", createdAt: t("13:00:00") },
    // order D: reversed stamps (defensive drop — never a negative duration)
    { orderId: "d", fromStatus: null, toStatus: "NEW", createdAt: t("14:00:00") },
    { orderId: "d", fromStatus: "NEW", toStatus: "CONFIRMED", createdAt: t("13:59:00") },
  ];
  const m = buildTimeInStatusMetrics(rows);
  assert.equal(m.avgConfirmMinutes, 4); // (5 + 3) / 2 — D dropped
  assert.equal(m.confirmLegs, 2);
  assert.equal(m.avgReadyMinutes, 60);
  assert.equal(m.readyLegs, 1);
});

test("ops timing: no completed legs → null averages and zero legs (honest «no samples», never a fake zero)", () => {
  const m = buildTimeInStatusMetrics([]);
  assert.equal(m.avgConfirmMinutes, null);
  assert.equal(m.confirmLegs, 0);
  assert.equal(m.avgReadyMinutes, null);
  assert.equal(m.readyLegs, 0);
});

test("ops timing: formatLegMinutesAr Arabic durations (western digits, honest «—» for null)", () => {
  assert.equal(formatLegMinutesAr(null), "—");
  assert.equal(formatLegMinutesAr(0), "أقل من دقيقة");
  assert.equal(formatLegMinutesAr(1), "دقيقة واحدة");
  assert.equal(formatLegMinutesAr(2), "دقيقتين");
  assert.equal(formatLegMinutesAr(5), "5 دقائق");
  assert.equal(formatLegMinutesAr(45), "45 دقيقة");
  assert.equal(formatLegMinutesAr(90), "ساعة و30 دقيقة");
  assert.equal(formatLegMinutesAr(120), "ساعتين");
  assert.equal(formatLegMinutesAr(150), "ساعتين و30 دقيقة");
});
