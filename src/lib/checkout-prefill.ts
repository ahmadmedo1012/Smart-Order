// P43 SO-3 — returning-customer prefill (تعبئة العائد): after a
// successful order the customer's {name, phone, city, area, addressLine}
// are remembered in localStorage, and the NEXT checkout on the same
// device starts pre-filled — the returning-customer reality of Libyan
// delivery (same phone, same neighborhood, same door description).
//
// PURE SEAM (the whatsapp.ts law): node --test loads this module bare —
// no React, no window. The storage itself is INJECTED (getItem/setItem
// accessors) so the unit suite pins the merge law and the corrupt-input
// fail-closed behavior without a DOM; the client callers pass thin
// localStorage wrappers (guarded — Safari private mode throws on access).
//
// Privacy law: this is the CUSTOMER's own device storing their own
// typing to save them retyping it — never shipped to the server beyond
// the order itself, never cross-device, and a corrupt/oversized blob is
// discarded (fail-closed to an empty form, never a crash).

/** localStorage key — one record for the whole device (name/phone are
 *  store-agnostic; the address fields are the customer's own words). */
export const CUSTOMER_PREFILL_KEY = "smart-order-customer";

/** The remembered record — every field bounded to its checkout field's
 *  own contract so a stale/blob record can never inject oversized
 *  values into the form. */
export interface CustomerPrefill {
  name: string;
  phone: string;
  city: string;
  area: string;
  addressLine: string;
}

/* Field bounds = the checkout's own input contracts (customer-info +
   delivery-details sections): name 2..80, phone ≤20, city/area ≤60,
   address ≤200. A record outside them is not ours — discard. */
const NAME_MAX = 80;
const PHONE_MAX = 20;
const CITY_AREA_MAX = 60;
const ADDRESS_MAX = 200;
/** Whole-blob bound: anything larger is not a record we wrote. */
const PREFILL_JSON_MAX = 1024;

function boundedString(v: unknown, min: number, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (s.length < min || s.length > max) return null;
  return s;
}

/** Validate an unknown parsed blob into a prefill record — null on
 *  anything malformed (the fail-closed law: corrupt data must degrade
 *  to an empty form, never render garbage into money-path fields). */
export function sanitizeCustomerPrefill(raw: unknown): CustomerPrefill | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  /* الاسم يخضع لحدّ حقل الدفع نفسه (٢ أحرف على الأقل) — سجل أقصر
   * ليس سجلنا، والتخلص منه أصدق من عرضه. */
  const name = boundedString(r.name, 2, NAME_MAX);
  const phone = boundedString(r.phone, 1, PHONE_MAX);
  if (!name || !phone) return null; // the identity pair is the minimum
  const city = boundedString(r.city, 1, CITY_AREA_MAX) ?? "طرابلس";
  const area = boundedString(r.area, 1, CITY_AREA_MAX) ?? "";
  const addressLine = boundedString(r.addressLine, 1, ADDRESS_MAX) ?? "";
  return { name, phone, city, area, addressLine };
}

/** The storage seam the callers inject (tests pass a Map; the client
 *  passes guarded localStorage accessors). */
export interface PrefillStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

/** Read + validate — absent/corrupt/oversized → null (empty form). */
export function loadCustomerPrefill(storage: PrefillStorage): CustomerPrefill | null {
  let raw: string | null = null;
  try {
    raw = storage.getItem(CUSTOMER_PREFILL_KEY);
  } catch {
    return null;
  }
  if (!raw || raw.length > PREFILL_JSON_MAX) return null;
  try {
    return sanitizeCustomerPrefill(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** The merge law at SAVE time: name/phone always ride the latest order
 *  (the customer may share a device); the ADDRESS fields are updated
 *  only when this order actually carried them (a PICKUP order keeps the
 *  remembered delivery address — the customer didn't move because they
 *  picked up once). undefined = «this order says nothing about it». */
export function mergeCustomerPrefill(
  prev: CustomerPrefill | null,
  submitted: {
    name: string;
    phone: string;
    city?: string;
    area?: string;
    addressLine?: string;
  },
): CustomerPrefill | null {
  const next = sanitizeCustomerPrefill({
    name: submitted.name,
    phone: submitted.phone,
    city: submitted.city ?? prev?.city ?? "طرابلس",
    area: submitted.area ?? prev?.area ?? "",
    addressLine: submitted.addressLine ?? prev?.addressLine ?? "",
  });
  return next; // an invalid submission (shouldn't happen — the order
  // validated these fields already) discards silently, never throws
}

/** Write the merged record — never throws (a full/private-mode
 *  localStorage must not break the success moment of a paid order). */
export function saveCustomerPrefill(
  submitted: {
    name: string;
    phone: string;
    city?: string;
    area?: string;
    addressLine?: string;
  },
  storage?: PrefillStorage,
): void {
  const store: PrefillStorage =
    storage ??
    (typeof window !== "undefined"
      ? {
          getItem: (k) => {
            try {
              return window.localStorage.getItem(k);
            } catch {
              return null;
            }
          },
          setItem: (k, v) => {
            try {
              window.localStorage.setItem(k, v);
            } catch {
              /* noop — private mode/quota */
            }
          },
        }
      : { getItem: () => null, setItem: () => {} });
  const merged = mergeCustomerPrefill(loadCustomerPrefill(store), submitted);
  if (!merged) return;
  try {
    store.setItem(CUSTOMER_PREFILL_KEY, JSON.stringify(merged));
  } catch {
    /* noop — never break the success path */
  }
}
