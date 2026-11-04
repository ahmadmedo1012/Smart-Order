/**
 * 17-DEBT-SO: shared types + focus-target map extracted verbatim from
 * checkout-client.tsx (the composition root keeps the submit flow and
 * the <main id="main"> shell; see the split-map comment there).
 */

export interface StoreData {
  deliveryZones: Array<{ id: string; name: string; fee: number; minOrder: number }>;
  paymentMethods: Array<{ id: string; type: string; name: string; instructions: string | null; config: string | null }>;
  /* W2-ORD-2 (P42-W3): المنتجات الحيّة تصل أصلًا في نفس الاستجابة (كانت
     تُهدر) — منها يحتسب الإجمالي الحقيقي عند التأكيد لا تقدير
     localStorage القديم. الشكل الفرعي: ما يحتاجه التقييم فقط. */
  products: Array<{
    id: string;
    price: number;
    isAvailable: boolean;
    variants: Array<{ id: string; priceDelta: number }>;
    optionGroups: Array<{ options: Array<{ id: string; priceDelta: number }> }>;
  }>;
}

export type Step = "form" | "success";

/** r132-F1a (A2 F4): field-level checkout validation keys — the r131
 * aria-invalid + FieldError recipe (dashboard form-field.tsx), extended
 * to the customer money path. Errors are set on the submit attempt and
 * each field clears its own on change, exactly like the dashboard
 * dialogs (delivery/page.tsx ZoneDialog). */
export type FieldKey = "name" | "phone" | "zone" | "address" | "payment";

export type FieldErrors = Partial<Record<FieldKey, string>>;

/** Success-moment state (r133 A1 F9): the durable order identity the
 * in-page confirmation renders while the redirect settles.
 * P43 SO-2: the settled discount rides along (0/absent = no coupon —
 * the savings line renders only when the customer actually saved). */
export type CheckoutResult = {
  orderNumber: string;
  publicToken: string;
  total: number;
  discount?: number;
  couponCode?: string | null;
  whatsapp: { number: string; message: string } | null;
};

/* P43 SO-2: الكود المطبق — معاينة القراءة الوحيدة للمال الذي سيراه
 * العميل (المصدر /api/public/coupons/validate؛ الطلب يعيد كل شيء
 * خادمياً عند الإرسال). */
export interface CouponPreview {
  code: string;
  type: "PERCENT" | "FIXED" | "FREE_DELIVERY";
  description: string;
  discount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  minOrder: number;
}

/** First-invalid focus targets — inputs focus natively; the two tile
 * groups (zone/payment) get tabIndex={-1} containers so focus()+scroll
 * land on them. */
export const FIELD_FOCUS_ID: Record<FieldKey, string> = {
  name: "c-name",
  phone: "c-phone",
  zone: "c-zone-grid",
  address: "c-address",
  payment: "c-pay-group",
};
