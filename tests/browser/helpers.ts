import { expect, type APIRequestContext } from "@playwright/test";

/**
 * Shared fixtures for the browser battery — the seeded demo universe
 * (scripts/e2e-seed.mjs) + the API order factory the tracking/dashboard
 * specs use to own a fresh NEW order without driving the storefront UI
 * twice (the journey spec owns the full UI path; these specs own the
 * destination surfaces).
 */

export const STORE_SLUG = "demo-store";
export const STORE_NAME = "مخبز الواحة — تجريبي";

/* بيانات التاجر التجريبية — نفسها في scripts/e2e-seed.mjs (قابلة
   للتجاوز عبر البيئة هناك). */
export const MERCHANT = {
  email: process.env.E2E_MERCHANT_EMAIL ?? "owner@demo.smart-order.ly",
  password: process.env.E2E_MERCHANT_PASSWORD ?? "E2e-Oasis-2026",
};

export interface SeededOrder {
  id: string;
  orderNumber: string;
  publicToken: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
}

/**
 * Create a real storefront order through the real public API (the money
 * path the UI submits to) — the server re-prices everything, exactly as
 * production. Delivery picks «وسط المدينة» (fee 5 د.ل, min 20 د.ل — the
 * 45 د.ل pizza clears it); pickup needs no zone/address.
 */
export async function createOrderViaApi(
  request: APIRequestContext,
  opts: {
    fulfillmentType?: "DELIVERY" | "PICKUP";
    customerName?: string;
    product?: string;
  } = {},
): Promise<SeededOrder> {
  const fulfillmentType = opts.fulfillmentType ?? "DELIVERY";

  const storeRes = await request.get(`/api/public/store/${STORE_SLUG}`);
  expect(storeRes.ok()).toBeTruthy();
  const store = (await storeRes.json()).data;

  const product = store.products.find(
    (p: { name: string }) => p.name === (opts.product ?? "بيتزا مارغريتا"),
  );
  const payment = store.paymentMethods.find(
    (p: { type: string }) => p.type === "COD",
  );
  const zone = store.deliveryZones.find(
    (z: { name: string }) => z.name === "وسط المدينة",
  );
  if (!product || !payment || (!zone && fulfillmentType === "DELIVERY")) {
    throw new Error("بذرة e2e ناقصة: منتج/طريقة دفع/منطقة غير موجودة في demo-store");
  }

  const res = await request.post("/api/public/orders", {
    data: {
      slug: STORE_SLUG,
      idempotencyKey: crypto.randomUUID(),
      fulfillmentType,
      customerName: opts.customerName ?? "زبون التتبع التجريبي",
      customerPhone: "0912345678",
      city: fulfillmentType === "DELIVERY" ? "طرابلس" : "",
      area: "",
      addressLine:
        fulfillmentType === "DELIVERY" ? "شارع الجمهورية، مقابل مبنى البريد" : "",
      customerNote: "",
      deliveryZoneId: fulfillmentType === "DELIVERY" ? zone.id : null,
      paymentMethodId: payment.id,
      items: [
        {
          productId: product.id,
          variantId: null,
          optionIds: [],
          quantity: 1,
          note: "",
        },
      ],
    },
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body.success).toBe(true);
  return body.data.order as SeededOrder;
}
