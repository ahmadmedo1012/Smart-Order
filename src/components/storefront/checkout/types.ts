/**
 * 17-DEBT-SO: shared types + focus-target map extracted verbatim from
 * checkout-client.tsx (the composition root keeps the submit flow and
 * the <main id="main"> shell; see the split-map comment there).
 */

export interface StoreData {
  deliveryZones: Array<{ id: string; name: string; fee: number; minOrder: number }>;
  paymentMethods: Array<{ id: string; type: string; name: string; instructions: string | null; config: string | null }>;
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
 * in-page confirmation renders while the redirect settles. */
export type CheckoutResult = {
  orderNumber: string;
  publicToken: string;
  total: number;
  whatsapp: { number: string; message: string } | null;
};

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
