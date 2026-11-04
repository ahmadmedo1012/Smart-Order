// P43 SO-3 — reorder (اطلب مرة أخرى): rebuild a cart from a tracked
// order's items via the SAME use-cart shape the storefront adds with.
// Pure module (the whatsapp.ts law — node --test loads it bare): the
// tracking client feeds the track API's item payload, gets back
// cart-ready items + honest drop counters for the toast copy.
//
// HONESTY CONTRACT (the mission's own): the rebuilt cart is an ESTIMATE
// ride — the unitPrice is the order-time snapshot (lineTotal/quantity),
// the storefront re-evaluates every line against the LIVE catalog at
// checkout (checkout-refresh) and the server re-prices everything inside
// its transaction. The button's copy says «قد تتغير الأسعار» and means
// it: deleted products are skipped (counted), old orders whose option
// snapshot predates the id field (P43-SO3+) rebuild WITHOUT their
// options (counted) so the customer knows to re-pick them.

import type { CartOption } from "./cart-types.ts";

export const MAX_REORDER_QUANTITY = 99; // mirrors use-cart's MAX_CART_QUANTITY

/** The track API's item payload (the additive reorder keys). */
export interface ReorderSourceItem {
  productId: string | null;
  productName: string;
  variantId: string | null;
  variantName: string | null;
  quantity: number;
  note: string | null;
  lineTotal: number;
  optionLines: Array<{ id: string | null; name: string; priceDelta: number }>;
}

/** A use-cart-ready item (Omit<CartItem, "key"> shape). */
export interface ReorderCartItem {
  productId: string;
  productName: string;
  productImage: string | null;
  variantId: string | null;
  variantName: string | null;
  options: CartOption[];
  quantity: number;
  note: string;
  unitPrice: number;
}

export interface ReorderResult {
  items: ReorderCartItem[];
  /** lines skipped because the product was deleted/untracked. */
  droppedProducts: number;
  /** option lines dropped because the order predates id-bearing
   *  snapshots (the customer re-picks them in the store). */
  droppedOptions: number;
}

/** Collapse a tracked order's items into cart items. */
export function buildReorderCartItems(source: ReorderSourceItem[]): ReorderResult {
  const items: ReorderCartItem[] = [];
  let droppedProducts = 0;
  let droppedOptions = 0;

  for (const src of source) {
    /* a null productId = the line's product was deleted (or predates
       product tracking) — skip honestly, never a phantom cart line */
    if (!src.productId) {
      droppedProducts += 1;
      continue;
    }
    /* id-bearing snapshot lines rebuild exactly; the pre-P43 shape
       (names only) cannot map back to live option ids — the options
       drop and the counter says so in the toast */
    const options: CartOption[] = [];
    for (const o of src.optionLines) {
      if (o.id) options.push({ id: o.id, name: o.name, priceDelta: o.priceDelta });
      else droppedOptions += 1;
    }
    /* quantity: the ordered amount, clamped to the cart's own ceiling —
       a 3× reorder of a 2×-max-quantity line (old data) never overflows */
    const quantity = Math.max(1, Math.min(MAX_REORDER_QUANTITY, Math.floor(src.quantity) || 1));
    /* unitPrice: the order-time snapshot per unit — display estimate
       only; checkout-refresh + the server's transaction re-price it */
    const unitPrice = quantity > 0 ? Math.round(src.lineTotal / src.quantity) : 0;
    items.push({
      productId: src.productId,
      productName: src.productName,
      productImage: null,
      variantId: src.variantId,
      variantName: src.variantName,
      options,
      quantity,
      note: src.note ?? "",
      unitPrice,
    });
  }

  return { items, droppedProducts, droppedOptions };
}

/** The honest one-liner the toast carries — exactly what happened,
 *  never a silent partial rebuild. */
export function reorderToastAr(result: {
  items: ReorderCartItem[];
  droppedProducts: number;
  droppedOptions: number;
}): string {
  if (result.items.length === 0) {
    return "لم تعد أصناف هذا الطلب متاحة في المتجر";
  }
  const parts = [`أُعيد بناء سلتك (${result.items.length} صنف) — قد تتغير الأسعار، راجعها قبل الإرسال`];
  if (result.droppedProducts > 0) {
    parts.push(`سقط ${result.droppedProducts} صنف لم يعد متاحاً`);
  }
  if (result.droppedOptions > 0) {
    parts.push("بعض الإضافات تحتاج اختيارها من جديد");
  }
  return parts.join(" · ");
}
