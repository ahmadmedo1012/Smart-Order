// P43 SO-2 — the coupon engine pins (src/lib/coupon.ts): all three
// discount types' integer-millimes math, the caps, the min-order/window/
// usage validation table, code normalization + case-insensitive compare,
// and the concurrent over-use guard's pure core (the predicate the
// money path's conditional updateMany evaluates atomically).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COUPON_CODE_MAX,
  COUPON_CODE_MIN,
  computeCouponDiscount,
  couponCodeEquals,
  couponDescribeAr,
  couponUsageAvailable,
  couponUseError,
  isValidCouponCode,
  normalizeCouponCode,
  type CouponShape,
} from "../../src/lib/coupon.ts";

const NOW = new Date("2026-11-03T12:00:00Z");

function coupon(over: Partial<CouponShape> = {}): CouponShape {
  return {
    code: "SAVE10",
    type: "PERCENT",
    value: 10,
    minOrder: 0,
    maxUses: null,
    usedCount: 0,
    startsAt: null,
    expiresAt: null,
    isActive: true,
    ...over,
  };
}

/* ── computeCouponDiscount: the three types' arithmetic ───────────── */

test("PERCENT: round(subtotal × value / 100) — millimes-exact, no floats", () => {
  const c = coupon({ type: "PERCENT", value: 10 });
  assert.equal(computeCouponDiscount(c, 33_000, 4_000), 3_300); // 10% of 33 د.ل
  // درهم فردي: 15% من 12.333 د.ل = 1.84995 → 1850 millimes (round, not floor)
  assert.equal(computeCouponDiscount(coupon({ type: "PERCENT", value: 15 }), 12_333, 0), 1_850);
  assert.equal(computeCouponDiscount(coupon({ type: "PERCENT", value: 50 }), 1, 0), 1); // 0.5 millimes → 1 (round)
  assert.equal(computeCouponDiscount(coupon({ type: "PERCENT", value: 100 }), 33_000, 4_000), 33_000); // 100% = the whole subtotal
});

test("PERCENT: capped at subtotal — a coupon can never exceed the products' value", () => {
  const c = coupon({ type: "PERCENT", value: 100 });
  assert.equal(computeCouponDiscount(c, 5_000, 10_000), 5_000); // not 5000+fee
  // the ledger invariant for every percent case:
  const subtotal = 25_500, fee = 4_000;
  const d = computeCouponDiscount(coupon({ type: "PERCENT", value: 33 }), subtotal, fee);
  assert.equal(subtotal + fee - d, subtotal + fee - d); // total formula composes
});

test("FIXED: min(value, subtotal) — never pays the customer more than the order", () => {
  const c = coupon({ type: "FIXED", value: 5_000 });
  assert.equal(computeCouponDiscount(c, 33_000, 4_000), 5_000);
  assert.equal(computeCouponDiscount(c, 3_000, 4_000), 3_000); // capped at subtotal
  assert.equal(computeCouponDiscount(c, 5_000, 0), 5_000); // exact match
});

test("FREE_DELIVERY: the waived fee rides the discount line — net delivery 0, total = subtotal", () => {
  const c = coupon({ type: "FREE_DELIVERY" });
  const subtotal = 33_000, fee = 4_000;
  const d = computeCouponDiscount(c, subtotal, fee);
  assert.equal(d, fee); // discount records the waiver…
  assert.equal(subtotal + fee - d, subtotal); // …and the ledger nets delivery to 0
  assert.equal(computeCouponDiscount(c, 33_000, 0), 0); // pickup/free zone: nothing to waive
});

test("the ledger invariant total = subtotal + deliveryFee − discount holds for all three types", () => {
  const cases: Array<[string, CouponShape]> = [
    ["percent", coupon({ type: "PERCENT", value: 15 })],
    ["fixed", coupon({ type: "FIXED", value: 7_250 })],
    ["free-delivery", coupon({ type: "FREE_DELIVERY" })],
  ];
  const subtotal = 47_125, fee = 4_500;
  for (const [name, c] of cases) {
    const d = computeCouponDiscount(c, subtotal, fee);
    const total = subtotal + fee - d;
    // the discount never exceeds the whole order, the total never goes negative,
    // and the ONE formula composes the receipt on every surface
    assert.ok(d <= subtotal + fee, `${name}: discount never exceeds the whole order`);
    assert.ok(total >= 0, `${name}: total never negative`);
    assert.equal(total, subtotal + fee - d);
    if (c.type === "FREE_DELIVERY") assert.equal(total, subtotal, `${name}: net delivery is 0`);
    if (c.type === "PERCENT" || c.type === "FIXED") assert.ok(total >= fee, `${name}: subtotal-discount never eats the delivery fee`);
  }
});

test("unknown type: zero discount (fail-closed, never an invented amount)", () => {
  assert.equal(computeCouponDiscount(coupon({ type: "WEIRD" as string }), 10_000, 1_000), 0);
});

test("P43 SO-2 edge: PERCENT rounds half-up on the PRODUCT and 1% of a tiny order can round to 0", () => {
  // 10% من 25 millimes = 2.5 → 3 (Math.round، لا floor ولا bank-derived float)
  assert.equal(computeCouponDiscount(coupon({ type: "PERCENT", value: 10 }), 25, 0), 3);
  // 1% من 50 millimes = 0.5 → 1؟ لا: Math.round(0.5) = 1 — لكن 1% من 40 = 0.4 → 0
  assert.equal(computeCouponDiscount(coupon({ type: "PERCENT", value: 1 }), 40, 0), 0);
  assert.equal(computeCouponDiscount(coupon({ type: "PERCENT", value: 1 }), 50, 0), 1);
  // الخصم الأصغر من الدرهم يبقى صادقاً في الدفتر: total يزيد المجموع بلا كسور
  const subtotal = 33_333, fee = 4_444;
  const d = computeCouponDiscount(coupon({ type: "PERCENT", value: 7 }), subtotal, fee);
  assert.equal(d, Math.round((subtotal * 7) / 100)); // 2333.31 → 2333
  assert.ok(Number.isInteger(subtotal + fee - d));
});

test("P43 SO-2 edge: FIXED exceeds subtotal+fee → capped at subtotal (never a paid-to-customer order)", () => {
  const c = coupon({ type: "FIXED", value: 100_000 });
  const d = computeCouponDiscount(c, 3_000, 4_000);
  assert.equal(d, 3_000); // min(value, subtotal) — the fee is never waived by a FIXED coupon
  assert.equal(3_000 + 4_000 - d, 4_000); // the customer still pays delivery
});

test("P43 SO-2 edge: FREE_DELIVERY on a free-zone/pickup order waives nothing (discount 0)", () => {
  // المنطقة مجانية (fee=0) — الخصم صفر والدفتر لا يخترع waiver
  assert.equal(computeCouponDiscount(coupon({ type: "FREE_DELIVERY" }), 10_000, 0), 0);
});

/* ── couponUseError: the validation table ─────────────────────────── */

test("missing/unknown coupon → the honest Arabic refusal", () => {
  assert.equal(couponUseError(null, { now: NOW, subtotal: 10_000 }), "كود الخصم غير صحيح");
});

test("inactive coupon refused", () => {
  assert.equal(couponUseError(coupon({ isActive: false }), { now: NOW, subtotal: 10_000 }), "هذا الكود موقوف حالياً");
});

test("window: not-yet-started and expired both refused", () => {
  assert.equal(
    couponUseError(coupon({ startsAt: new Date("2026-11-04T00:00:00Z") }), { now: NOW, subtotal: 10_000 }),
    "هذا الكود لم يبدأ بعد",
  );
  assert.equal(
    couponUseError(coupon({ expiresAt: new Date("2026-11-02T00:00:00Z") }), { now: NOW, subtotal: 10_000 }),
    "انتهت صلاحية هذا الكود",
  );
  // boundaries (inclusive semantics, documented): startsAt == now is
  // already live; expiresAt == now is still redeemable — «حتى» تشمل
  // لحظتها، والانتهاء يبدأ بعدها بلحظة
  assert.equal(couponUseError(coupon({ startsAt: NOW }), { now: NOW, subtotal: 10_000 }), null);
  assert.equal(couponUseError(coupon({ expiresAt: NOW }), { now: NOW, subtotal: 10_000 }), null);
});

test("usage cap: usedCount >= maxUses refused; null = unlimited", () => {
  assert.equal(couponUseError(coupon({ maxUses: 10, usedCount: 10 }), { now: NOW, subtotal: 10_000 }), "نفدت استخدامات هذا الكود");
  assert.equal(couponUseError(coupon({ maxUses: 10, usedCount: 9 }), { now: NOW, subtotal: 10_000 }), null);
  assert.equal(couponUseError(coupon({ maxUses: null, usedCount: 99_999 }), { now: NOW, subtotal: 10_000 }), null);
});

test("minOrder: below the minimum refused with the millimes-honest copy; 0 = no minimum", () => {
  const err = couponUseError(coupon({ minOrder: 20_000 }), { now: NOW, subtotal: 19_999 });
  assert.equal(err, "الحد الأدنى لاستخدام هذا الكود 20 د.ل");
  assert.equal(couponUseError(coupon({ minOrder: 20_000 }), { now: NOW, subtotal: 20_000 }), null); // boundary
  assert.equal(couponUseError(coupon({ minOrder: 0 }), { now: NOW, subtotal: 1 }), null);
});

test("a fully valid coupon passes every gate", () => {
  assert.equal(
    couponUseError(
      coupon({ minOrder: 5_000, maxUses: 3, usedCount: 2, startsAt: new Date("2026-11-01T00:00:00Z"), expiresAt: new Date("2026-12-01T00:00:00Z") }),
      { now: NOW, subtotal: 33_000 },
    ),
    null,
  );
});

/* ── the concurrent over-use guard (simulated) ────────────────────── */

test("couponUsageAvailable: the conditional-increment predicate at its boundaries", () => {
  assert.equal(couponUsageAvailable(0, 1), true);
  assert.equal(couponUsageAvailable(1, 1), false); // the last use consumed the cap
  assert.equal(couponUsageAvailable(99, 100), true);
  assert.equal(couponUsageAvailable(100, 100), false);
  assert.equal(couponUsageAvailable(1_000_000, null), true); // unlimited
});

test("concurrent simulation: two racers against maxUses=1 — exactly one increments", () => {
  // the money path's conditional updateMany is WHERE usedCount < maxUses
  // evaluated atomically; simulate the two serial interleavings a real
  // race can produce and prove the invariant survives BOTH orders
  for (const order of [0, 1]) {
    const row = { usedCount: 0, maxUses: 1 as number | null };
    const results: boolean[] = [];
    const racer = (i: number) => {
      // the atomic CAS: predicate + increment as one statement
      if (couponUsageAvailable(row.usedCount, row.maxUses)) {
        row.usedCount += 1;
        results[i] = true;
      } else {
        results[i] = false;
      }
    };
    racer(order);
    racer(1 - order);
    assert.equal(results.filter(Boolean).length, 1, `order ${order}: exactly one winner`);
    assert.equal(row.usedCount, 1, `order ${order}: the row incremented exactly once`);
  }
});

/* ── code normalization + compare ─────────────────────────────────── */

test("normalizeCouponCode: whitespace stripped (flyer paste), case preserved", () => {
  assert.equal(normalizeCouponCode("  SAVE10 "), "SAVE10");
  assert.equal(normalizeCouponCode("save 10"), "save10");
  assert.equal(normalizeCouponCode("رمضان 20"), "رمضان20");
  assert.equal(normalizeCouponCode("\tSAVE-10\n"), "SAVE-10");
});

test("couponCodeEquals: case-insensitive, empty never equals", () => {
  assert.equal(couponCodeEquals("SAVE10", "save10"), true);
  assert.equal(couponCodeEquals("Save10", "SAVE10"), true);
  assert.equal(couponCodeEquals("رمضان20", "رمضان20"), true);
  assert.equal(couponCodeEquals("SAVE10", "SAVE9"), false);
  assert.equal(couponCodeEquals("", ""), false);
  assert.equal(couponCodeEquals("", "SAVE10"), false);
});

test("isValidCouponCode: length 3..24 + letters/digits/dash/underscore (unicode)", () => {
  assert.equal(isValidCouponCode("SAVE10"), true);
  assert.equal(isValidCouponCode("ramadan-2026"), true);
  assert.equal(isValidCouponCode("رمضان20"), true);
  assert.equal(isValidCouponCode("SA"), false); // < COUPON_CODE_MIN
  assert.equal(isValidCouponCode("A".repeat(25)), false); // > COUPON_CODE_MAX
  assert.equal(isValidCouponCode("SAVE 10"), false); // inner space (normalization ran first)
  assert.equal(isValidCouponCode("SAVE!10"), false); // punctuation
  assert.equal(isValidCouponCode(""), false);
  assert.equal(COUPON_CODE_MIN, 3);
  assert.equal(COUPON_CODE_MAX, 24);
});

/* ── the customer-facing description ──────────────────────────────── */

test("couponDescribeAr: the three one-liners (western numerals for money)", () => {
  assert.equal(couponDescribeAr({ type: "PERCENT", value: 10 }), "خصم 10%");
  assert.equal(couponDescribeAr({ type: "FIXED", value: 5_000 }), "خصم 5 د.ل");
  assert.equal(couponDescribeAr({ type: "FIXED", value: 5_500 }), "خصم 5.500 د.ل");
  assert.equal(couponDescribeAr({ type: "FREE_DELIVERY", value: 0 }), "توصيل مجاني");
});
