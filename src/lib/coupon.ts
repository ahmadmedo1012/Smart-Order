// P43 SO-2 — coupon engine (pure): the math, the validation table and
// the code normalization behind أكواد الخصم. Zero I/O — the money path
// (POST /api/public/orders) and the public preview endpoint both call
// THESE functions inside their own guards, so the arithmetic can never
// fork between surfaces. node --test loads this module bare (relative
// .ts specifiers only, the whatsapp.ts law).
import { formatLyd } from "./money.ts";

export const COUPON_TYPES = ["PERCENT", "FIXED", "FREE_DELIVERY"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export const COUPON_TYPE_AR: Record<CouponType, string> = {
  PERCENT: "نسبة مئوية",
  FIXED: "مبلغ ثابت",
  FREE_DELIVERY: "توصيل مجاني",
};

/** The coupon row shape the pure functions consume (a structural subset
 *  of the Prisma Coupon row — the money path passes the in-tx row). */
export interface CouponShape {
  code: string;
  type: string;
  value: number;
  minOrder: number;
  maxUses: number | null;
  usedCount: number;
  startsAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
}

/* ── Code normalization ──────────────────────────────────────────────
 * The merchant's display case is PRESERVED (رمضان20 stays رمضان20);
 * whitespace is stripped on input (a customer pasting " SAVE10 " from a
 * WhatsApp flyer still redeems), and COMPARISON is case-insensitive
 * (save10 == SAVE10 == Save10 — the Libyan reality of flyer typing). */
export function normalizeCouponCode(raw: string): string {
  return raw.replace(/\s+/g, "").trim();
}

/** Case-insensitive equality of two (already normalized) codes. */
export function couponCodeEquals(a: string, b: string): boolean {
  return a.length > 0 && b.length > 0 && a.toLowerCase() === b.toLowerCase();
}

/** The create/edit charset: unicode letters/digits + dash/underscore —
 *  Latin (SAVE10), Arabic (رمضان20) and mixed codes all redeem. */
export const COUPON_CODE_PATTERN = /^[\p{L}\p{N}_-]+$/u;
export const COUPON_CODE_MIN = 3;
export const COUPON_CODE_MAX = 24;

export function isValidCouponCode(normalized: string): boolean {
  return (
    normalized.length >= COUPON_CODE_MIN &&
    normalized.length <= COUPON_CODE_MAX &&
    COUPON_CODE_PATTERN.test(normalized)
  );
}

/* ── Validation (the use-time table) ────────────────────────────────
 * Returns the Arabic refusal copy, or null when the coupon is usable.
 * Subtotal is SERVER-priced by every caller (the money path re-prices
 * all lines first) — minOrder compares against it, never client money. */
export function couponUseError(
  coupon: CouponShape | null,
  opts: { now: Date; subtotal: number },
): string | null {
  if (!coupon) return "كود الخصم غير صحيح";
  if (!coupon.isActive) return "هذا الكود موقوف حالياً";
  if (coupon.startsAt && coupon.startsAt.getTime() > opts.now.getTime()) {
    return "هذا الكود لم يبدأ بعد";
  }
  if (coupon.expiresAt && coupon.expiresAt.getTime() < opts.now.getTime()) {
    return "انتهت صلاحية هذا الكود";
  }
  if (!couponUsageAvailable(coupon.usedCount, coupon.maxUses)) {
    return "نفدت استخدامات هذا الكود";
  }
  if (coupon.minOrder > 0 && opts.subtotal < coupon.minOrder) {
    return `الحد الأدنى لاستخدام هذا الكود ${formatLyd(coupon.minOrder)}`;
  }
  return null;
}

/** The over-use guard's pure core — the conditional updateMany in the
 *  money path (usedCount lt maxUses in the WHERE) is this predicate
 *  evaluated atomically against the row; the unit suite simulates
 *  concurrent increments through it. null maxUses = unlimited. */
export function couponUsageAvailable(usedCount: number, maxUses: number | null): boolean {
  return maxUses === null || usedCount < maxUses;
}

/* ── The discount math (integer millimes only) ───────────────────────
 *
 * LEDGER INVARIANT (documented decision): every surface computes
 *   total = subtotal + deliveryFee − discount
 * so the fee the coupon waives rides the DISCOUNT line while
 * Order.deliveryFee keeps the zone's fee:
 *   · PERCENT      discount = round(subtotal × value / 100), capped at subtotal
 *   · FIXED        discount = min(value, subtotal) — never pays the
 *                  customer more than the order
 *   · FREE_DELIVERY discount = the delivery fee → the customer's NET
 *                  delivery is 0 (subtotal + fee − fee), and receipts
 *                  read like every Libyan shop's own ledger:
 *                  «الإجمالي الفرعي 33 · التوصيل 4 · الخصم −4 · الإجمالي 33».
 * The mission's "(deliveryFee set 0)" is honored in CUSTOMER-FACING
 * copy — the checkout prints «التوصيل مجاناً» — while the stored
 * ledger keeps one arithmetic that reconciles on reports and CSV
 * (gross − discount = net holds for all three types). */
export function computeCouponDiscount(
  coupon: CouponShape,
  subtotal: number,
  deliveryFee: number,
): number {
  if (coupon.type === "PERCENT") {
    // integer millimes round — Math.round on the PRODUCT, never float totals
    return Math.min(Math.round((subtotal * coupon.value) / 100), subtotal);
  }
  if (coupon.type === "FIXED") {
    return Math.min(coupon.value, subtotal);
  }
  if (coupon.type === "FREE_DELIVERY") {
    return deliveryFee; // the waived fee, exactly — net delivery becomes 0
  }
  return 0;
}

/** The customer-facing one-liner (checkout chip + WhatsApp line):
 *  «خصم 10%» · «خصم 5 د.ل» · «توصيل مجاني». */
export function couponDescribeAr(coupon: Pick<CouponShape, "type" | "value">): string {
  if (coupon.type === "PERCENT") return `خصم ${coupon.value}%`;
  if (coupon.type === "FIXED") return `خصم ${formatLyd(coupon.value)}`;
  if (coupon.type === "FREE_DELIVERY") return "توصيل مجاني";
  return "كود خصم";
}
