// P43 SO-2c — payments reconciliation (مطابقة المدفوعات): the pure
// builders behind the reports surface's two new tables — the
// per-payment-method breakdown (orders, gross, discount, net, paid vs
// unpaid) and the coupon usage ledger (code, type, uses, discount
// given). Zero I/O (the whatsapp.ts law — node --test loads this bare):
// reports-queries.ts feeds them Prisma groupBy rows, the reports page
// and the CSV export render their output, so the screen and the file
// can never disagree.
//
// LEDGER LAW (one accounting, the family's own): every table composes
// from the SAME three committed columns —
//   gross = subtotal + deliveryFee   (what the order carried pre-discount)
//   net   = total                    (gross − discount, the committed total)
// so gross − discount = net holds per method, per coupon, and per the
// window totals. The exclusion convention is the caller's (the queries
// pass CANCELLED/REJECTED-free rows verbatim).

/** The Prisma groupBy row shape over Order (paymentMethodName,
 *  paymentType, paymentStatus) the breakdown consumes. */
export interface PaymentMethodGroupRow {
  paymentMethodName: string | null;
  paymentType: string | null;
  paymentStatus: string;
  _count: { _all: number };
  _sum: {
    subtotal: number | bigint | null;
    deliveryFee: number | bigint | null;
    discount: number | bigint | null;
    total: number | bigint | null;
  };
}

/** One method's reconciliation row — what the owner matches against
 *  their wallet/bank statement at month end. */
export interface PaymentMethodBreakdownRow {
  /** The customer-facing method name; «غير محدد» for orders that
   *  carried no method (nullable column). */
  name: string;
  /** The machine type (CASH/MANUAL/…) — drives the transfer-family
   *  context (references only exist for MANUAL/MADAR/LIBYANA). */
  type: string | null;
  orders: number;
  /** subtotal + deliveryFee — the pre-discount ledger. */
  gross: number;
  discount: number;
  /** total — gross − discount (the committed net the method collected). */
  net: number;
  /** Orders the merchant marked PAID. */
  paid: number;
  /** Everything not yet banked: UNPAID and REFUNDED (a refund means
   *  the money went back — counting it as collected would overstate
   *  the method's real takings). */
  unpaid: number;
}

/** Collapse the (method × status) groupBy rows into one row per method.
 *  Sorted by net desc — the owner's heaviest channel first. */
export function buildPaymentMethodBreakdown(
  rows: PaymentMethodGroupRow[],
): PaymentMethodBreakdownRow[] {
  const byMethod = new Map<string, PaymentMethodBreakdownRow>();
  for (const r of rows) {
    const name = r.paymentMethodName?.trim() || "غير محدد";
    const key = `${name}|${r.paymentType ?? ""}`;
    let row = byMethod.get(key);
    if (!row) {
      row = {
        name,
        type: r.paymentType,
        orders: 0,
        gross: 0,
        discount: 0,
        net: 0,
        paid: 0,
        unpaid: 0,
      };
      byMethod.set(key, row);
    }
    const count = r._count?._all ?? 0;
    row.orders += count;
    row.gross += Number(r._sum?.subtotal ?? 0) + Number(r._sum?.deliveryFee ?? 0);
    row.discount += Number(r._sum?.discount ?? 0);
    row.net += Number(r._sum?.total ?? 0);
    if (r.paymentStatus === "PAID") row.paid += count;
    else row.unpaid += count;
  }
  return [...byMethod.values()].sort((a, b) => b.net - a.net || b.orders - a.orders);
}

/** The Prisma groupBy row shape over Order.couponCode. */
export interface CouponUsageGroupRow {
  couponCode: string | null;
  _count: { _all: number };
  _sum: { discount: number | bigint | null };
}

/** One coupon's usage ledger over the window. */
export interface CouponUsageRow {
  code: string;
  /** The CURRENT type label from the merchant's coupon row
   *  (COUPON_TYPE_AR) — «—» when the coupon was deleted after its uses
   *  (the Order snapshot carries the code text only; the type is
   *  best-effort context, never invented). */
  type: string;
  uses: number;
  discount: number;
}

/** Build the coupon usage table. `couponTypes` is the business's current
 *  Coupon rows (code + type) — matched case-insensitively against the
 *  committed order snapshots (the customer may have redeemed save10
 *  while the merchant's row spells SAVE10). Sorted by discount given. */
export function buildCouponUsageRows(
  rows: CouponUsageGroupRow[],
  couponTypes: Array<{ code: string; type: string }>,
  typeLabels?: Record<string, string>,
): CouponUsageRow[] {
  const typeOf = new Map(couponTypes.map((c) => [c.code.toLowerCase(), c.type]));
  const out: CouponUsageRow[] = [];
  for (const r of rows) {
    const code = r.couponCode?.trim();
    if (!code) continue; // defensive: the query filters null already
    const type = typeOf.get(code.toLowerCase());
    out.push({
      code,
      type: type ? (typeLabels?.[type] ?? type) : "—",
      uses: r._count?._all ?? 0,
      discount: Number(r._sum?.discount ?? 0),
    });
  }
  return out.sort((a, b) => b.discount - a.discount || b.uses - a.uses);
}
