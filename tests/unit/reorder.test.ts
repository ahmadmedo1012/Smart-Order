// P43 SO-3 — the reorder engine pins (src/lib/reorder.ts): rebuilding
// a cart from a tracked order's items — exact options when the snapshot
// carries ids, honest drop counters when it doesn't (pre-SO3 orders) or
// the product vanished, the quantity clamp, and the toast's honest copy
// (never a silent partial rebuild).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_REORDER_QUANTITY,
  buildReorderCartItems,
  reorderToastAr,
  type ReorderSourceItem,
} from "../../src/lib/reorder.ts";

function src(over: Partial<ReorderSourceItem> = {}): ReorderSourceItem {
  return {
    productId: "p-1",
    productName: "طبق اختبار",
    variantId: "v-1",
    variantName: "كبير",
    quantity: 2,
    note: "بلا بصل",
    lineTotal: 35_500, // 17.750 × 2
    optionLines: [{ id: "o-1", name: "صوص", priceDelta: 1_250 }],
    ...over,
  };
}

test("rebuild: a full item maps to the use-cart shape exactly (product, variant, options, quantity, note)", () => {
  const r = buildReorderCartItems([src()]);
  assert.equal(r.droppedProducts, 0);
  assert.equal(r.droppedOptions, 0);
  assert.equal(r.items.length, 1);
  const item = r.items[0]!;
  assert.equal(item.productId, "p-1");
  assert.equal(item.productName, "طبق اختبار");
  assert.equal(item.variantId, "v-1");
  assert.equal(item.variantName, "كبير");
  assert.deepEqual(item.options, [{ id: "o-1", name: "صوص", priceDelta: 1_250 }]);
  assert.equal(item.quantity, 2);
  assert.equal(item.note, "بلا بصل");
  // unitPrice = snapshot per-unit (display estimate only — the store re-prices)
  assert.equal(item.unitPrice, 17_750);
  assert.equal(item.productImage, null);
});

test("rebuild: a deleted product (null productId) is skipped AND counted — never a phantom line", () => {
  const r = buildReorderCartItems([src({ productId: null }), src({ productId: "p-2", productName: "متاح" })]);
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0]!.productId, "p-2");
  assert.equal(r.droppedProducts, 1);
  assert.equal(
    r.items.some((i) => i.productId === null),
    false,
  );
});

test("rebuild: a pre-SO3 snapshot (options without ids) drops the options AND counts them — the customer re-picks", () => {
  const r = buildReorderCartItems([
    src({ optionLines: [{ id: null, name: "صوص", priceDelta: 1_250 }, { id: null, name: "جبن", priceDelta: 2_000 }] }),
  ]);
  assert.equal(r.items.length, 1);
  assert.deepEqual(r.items[0]!.options, []);
  assert.equal(r.droppedOptions, 2);
  assert.equal(r.droppedProducts, 0);
});

test("rebuild: mixed snapshots — id-bearing options rebuild, id-less ones drop", () => {
  const r = buildReorderCartItems([
    src({
      optionLines: [
        { id: "o-1", name: "صوص", priceDelta: 1_250 },
        { id: null, name: "قديمة", priceDelta: 500 },
      ],
    }),
  ]);
  assert.equal(r.items[0]!.options.length, 1);
  assert.equal(r.items[0]!.options[0]!.id, "o-1");
  assert.equal(r.droppedOptions, 1);
});

test("rebuild: quantity is clamped to the cart's own ceiling and floored at 1 (old data never overflows)", () => {
  const r = buildReorderCartItems([
    src({ quantity: 500, lineTotal: 500 * 10_000 }),
    src({ productId: "p-3", quantity: 0, lineTotal: 0 }), // بيانات قديمة فارغة → 1 لا 0
  ]);
  assert.equal(r.items[0]!.quantity, MAX_REORDER_QUANTITY);
  assert.equal(r.items[1]!.quantity, 1);
  assert.equal(MAX_REORDER_QUANTITY, 99); // توأم use-cart MAX_CART_QUANTITY
});

test("rebuild: empty order → empty cart, honest counters at zero", () => {
  const r = buildReorderCartItems([]);
  assert.deepEqual(r, { items: [], droppedProducts: 0, droppedOptions: 0 });
});

/* ── the toast copy — exactly what happened, never a silent partial ── */

test("toast: nothing available says so plainly", () => {
  assert.equal(
    reorderToastAr({ items: [], droppedProducts: 2, droppedOptions: 0 }),
    "لم تعد أصناف هذا الطلب متاحة في المتجر",
  );
});

test("toast: a clean rebuild carries the honest price caveat", () => {
  const r = buildReorderCartItems([src()]);
  const msg = reorderToastAr(r);
  assert.ok(msg.includes("قد تتغير الأسعار"));
  assert.ok(msg.includes("راجعها"));
  assert.ok(!msg.includes("سقط"));
});

test("toast: drops ride the message (products and options each say their piece)", () => {
  const r = buildReorderCartItems([
    src(),
    src({ productId: null }),
    src({ optionLines: [{ id: null, name: "قديمة", priceDelta: 500 }] }),
  ]);
  const msg = reorderToastAr(r);
  assert.ok(msg.includes("سقط 1 صنف لم يعد متاحاً"));
  assert.ok(msg.includes("بعض الإضافات تحتاج اختيارها من جديد"));
  assert.ok(msg.includes("·"));
});
