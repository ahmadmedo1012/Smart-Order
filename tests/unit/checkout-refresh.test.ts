// W2-ORD-2 (P42-W3) — عقود تقييم السلة ضد الأسعار الحيّة (checkout-refresh).
//
// الفجوة المسجلة: الإجمالي المعروض عند إتمام الطلب كان تقدير localStorage
// القديم، والخادم يسعّر من جديد عند الـPOST — الزبون يقرّ رقمًا ويدفع
// آخر. العقد الجديد: نفس استجابة /api/public/store تُقيّم السلة، فيظهر
// الإجمالي الحقيقي لحظة التأكيد، والسطور المتغيّرة تُوسَم، وغير المتاح
// يُمنع قبل الضغط (بعدما كان سيرفضه الخادم بلا تفسير).
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { evaluateCartAgainstProducts, type RefreshProduct } from "../../src/lib/checkout-refresh.ts";

const MENU: RefreshProduct[] = [
  {
    id: "p1",
    price: 10_000, // 10.000 د (المليّمات — عائلة money.ts)
    isAvailable: true,
    variants: [
      { id: "v1", priceDelta: 2_000 },
      { id: "v2", priceDelta: -500 },
    ],
    optionGroups: [
      { options: [{ id: "o1", priceDelta: 1_000 }, { id: "o2", priceDelta: 250 }] },
    ],
  },
  { id: "p2", price: 5_000, isAvailable: false, variants: [], optionGroups: [] },
  { id: "p3", price: 7_000, isAvailable: true, variants: [], optionGroups: [] },
];

function item(over: Partial<Parameters<typeof evaluateCartAgainstProducts>[0][number]>) {
  return {
    key: "k",
    productId: "p1",
    variantId: null,
    optionIds: [],
    quantity: 1,
    staleUnitPrice: 10_000,
    ...over,
  };
}

describe("evaluateCartAgainstProducts — التسعير الحالي", () => {
  it("سعر مطابق: لا تغيير ولا منع، والإجمالي بالكمية", () => {
    const r = evaluateCartAgainstProducts([item({ key: "a", quantity: 3 })], MENU);
    assert.equal(r.lines[0]!.priceChanged, false);
    assert.equal(r.lines[0]!.unavailable, false);
    assert.equal(r.currentSubtotal, 30_000);
    assert.equal(r.hasPriceChanges, false);
    assert.equal(r.hasUnavailable, false);
  });

  it("الأساس + فارق الصيغة + فوارق الإضافات = نفس منطق الخادم", () => {
    const r = evaluateCartAgainstProducts(
      [item({ key: "a", variantId: "v1", optionIds: ["o1", "o2"], staleUnitPrice: 10_000 })],
      MENU,
    );
    // 10.000 + 2.000 (v1) + 1.000 (o1) + 0.250 (o2) = 13.250
    assert.equal(r.lines[0]!.currentUnitPrice, 13_250);
    assert.equal(r.lines[0]!.priceChanged, true);
    assert.equal(r.currentSubtotal, 13_250);
    assert.equal(r.hasPriceChanges, true);
  });

  it("فارق سالب (صيغة أصغر) يُحترم — التسعير لا يفترض زيادات فقط", () => {
    const r = evaluateCartAgainstProducts(
      [item({ key: "a", variantId: "v2", staleUnitPrice: 10_000 })],
      MENU,
    );
    assert.equal(r.lines[0]!.currentUnitPrice, 9_500);
  });
});

describe("evaluateCartAgainstProducts — عدم التوفر يُمنع قبل الإرسال", () => {
  it("منتج خُفي (isAvailable=false): unavailable + سعره يسقط من الإجمالي", () => {
    const r = evaluateCartAgainstProducts(
      [item({ key: "dead", productId: "p2", staleUnitPrice: 5_000 }), item({ key: "ok", productId: "p3" })],
      MENU,
    );
    assert.equal(r.lines[0]!.unavailable, true);
    assert.equal(r.lines[0]!.currentUnitPrice, 0);
    assert.equal(r.lines[1]!.unavailable, false);
    assert.equal(r.hasUnavailable, true);
    // إجمالي المتاح فقط
    assert.equal(r.currentSubtotal, 7_000);
  });

  it("منتج حُذف من القائمة أصلًا: نفس المعاملة (خريطة البحث لا تجده)", () => {
    const r = evaluateCartAgainstProducts([item({ key: "gone", productId: "p404" })], MENU);
    assert.equal(r.lines[0]!.unavailable, true);
    assert.equal(r.currentSubtotal, 0);
  });

  it("صيغة أُوقفت أو إضافة حُذفت: unavailable (الخادم كان سيرفض — الآن يفسّر)", () => {
    const goneVariant = evaluateCartAgainstProducts(
      [item({ key: "a", variantId: "v404" })],
      MENU,
    );
    assert.equal(goneVariant.lines[0]!.unavailable, true);

    const goneOption = evaluateCartAgainstProducts(
      [item({ key: "a", optionIds: ["o404"] })],
      MENU,
    );
    assert.equal(goneOption.lines[0]!.unavailable, true);
    assert.equal(goneOption.currentSubtotal, 0);
  });

  it("سلة فارغة أو قائمة منتجات فارغة: صفر بلا انفجار", () => {
    assert.deepEqual(evaluateCartAgainstProducts([], MENU), {
      lines: [],
      currentSubtotal: 0,
      hasUnavailable: false,
      hasPriceChanges: false,
    });
    const r = evaluateCartAgainstProducts([item({ key: "a" })], []);
    assert.equal(r.hasUnavailable, true);
  });
});
