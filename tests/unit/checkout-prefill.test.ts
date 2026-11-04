// P43 SO-3 — the returning-customer prefill pins (src/lib/
// checkout-prefill.ts): the sanitize table (fail-closed on corrupt
// blobs), the load/save round-trip through an injected storage, and
// the merge law (name/phone always ride the latest order; the address
// fields update only when the order actually carried them — a PICKUP
// order never wipes a remembered delivery address).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CUSTOMER_PREFILL_KEY,
  loadCustomerPrefill,
  mergeCustomerPrefill,
  sanitizeCustomerPrefill,
  saveCustomerPrefill,
} from "../../src/lib/checkout-prefill.ts";

function memoryStorage(initial = "") {
  const map = new Map(initial ? [[CUSTOMER_PREFILL_KEY, initial]] : []);
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    dump: () => map.get(CUSTOMER_PREFILL_KEY) ?? null,
  };
}

/* ── sanitize: the fail-closed table ─────────────────────────────── */

test("sanitize: a well-formed record passes with the family defaults (city → طرابلس)", () => {
  const p = sanitizeCustomerPrefill({ name: "محمد علي", phone: "0912345678" });
  assert.deepEqual(p, { name: "محمد علي", phone: "0912345678", city: "طرابلس", area: "", addressLine: "" });
  const full = sanitizeCustomerPrefill({
    name: "محمد علي", phone: "0912345678", city: "طرابلس", area: "الوسط", addressLine: "شارع الاختبار 1",
  });
  assert.deepEqual(full, { name: "محمد علي", phone: "0912345678", city: "طرابلس", area: "الوسط", addressLine: "شارع الاختبار 1" });
});

test("sanitize: corrupt input never reaches the form — null on every malformed shape", () => {
  assert.equal(sanitizeCustomerPrefill(null), null);
  assert.equal(sanitizeCustomerPrefill("خام"), null);
  assert.equal(sanitizeCustomerPrefill([]), null);
  assert.equal(sanitizeCustomerPrefill({}), null); // لا اسم/هاتف
  assert.equal(sanitizeCustomerPrefill({ name: "م", phone: "0912345678" }), null); // اسم أقصر من الحقل نفسه
  assert.equal(sanitizeCustomerPrefill({ name: "محمد", phone: "" }), null); // الهاتف هو زوج الهوية
  assert.equal(sanitizeCustomerPrefill({ name: " ".repeat(10), phone: "0912345678" }), null); // فراغات فقط
  // قيم خارج حدود الحقول (حقن blob قديم) — تُرفض لا أن تُقصّ
  assert.equal(sanitizeCustomerPrefill({ name: "م".repeat(81), phone: "0912345678" }), null);
  assert.equal(sanitizeCustomerPrefill({ name: "محمد", phone: "0".repeat(21) }), null);
});

/* ── load: absent/corrupt/oversized → null (empty form), never a crash ── */

test("load: absent key → null; valid JSON round-trips", () => {
  assert.equal(loadCustomerPrefill(memoryStorage()), null);
  const store = memoryStorage();
  saveCustomerPrefill({ name: "سالم", phone: "0923456789", city: "طرابلس", area: "قرقارش", addressLine: "بناية 4" }, store);
  const loaded = loadCustomerPrefill(store);
  assert.deepEqual(loaded, { name: "سالم", phone: "0923456789", city: "طرابلس", area: "قرقارش", addressLine: "بناية 4" });
});

test("load: corrupt JSON / non-object / oversized blob → null (fail-closed to an empty form)", () => {
  assert.equal(loadCustomerPrefill(memoryStorage("{not json")), null);
  assert.equal(loadCustomerPrefill(memoryStorage("[1,2,3]")), null);
  assert.equal(loadCustomerPrefill(memoryStorage(JSON.stringify({ name: "محمد", phone: "0912345678" }).padEnd(2048, " "))), null);
  // المفتاح نفسه ثابت — عقد التخزين
  assert.equal(CUSTOMER_PREFILL_KEY, "smart-order-customer");
});

test("load: a throwing storage (private mode) degrades to null, never throws", () => {
  const hostile = {
    getItem: () => {
      throw new Error("quota / private mode");
    },
    setItem: () => {
      throw new Error("quota / private mode");
    },
  };
  assert.equal(loadCustomerPrefill(hostile), null);
  assert.doesNotThrow(() => saveCustomerPrefill({ name: "محمد", phone: "0912345678" }, hostile));
});

/* ── the merge law ───────────────────────────────────────────────── */

test("merge: name/phone always ride the LATEST order (a shared device updates the identity)", () => {
  const prev = { name: "سالم القديم", phone: "0911111111", city: "طرابلس", area: "الوسط", addressLine: "شارع 1" };
  const next = mergeCustomerPrefill(prev, { name: "سالم الجديد", phone: "0922222222", city: "طرابلس", area: "الوسط", addressLine: "شارع 1" });
  assert.equal(next?.name, "سالم الجديد");
  assert.equal(next?.phone, "0922222222");
});

test("merge: a PICKUP order keeps the remembered delivery address (undefined = «this order says nothing»)", () => {
  const prev = { name: "سالم", phone: "0912345678", city: "طرابلس", area: "قرقارش", addressLine: "بناية 4" };
  const next = mergeCustomerPrefill(prev, { name: "سالم", phone: "0912345678" });
  assert.equal(next?.area, "قرقارش");
  assert.equal(next?.addressLine, "بناية 4");
  // بل حتى أول طلب استلام على جهاز بلا ذاكرة: العنوان يبدأ فارغاً لا مُخترعاً
  const first = mergeCustomerPrefill(null, { name: "سالم", phone: "0912345678" });
  assert.equal(first?.addressLine, "");
  assert.equal(first?.city, "طرابلس");
});

test("merge: a DELIVERY order overwrites the address fields (the customer may have moved)", () => {
  const prev = { name: "سالم", phone: "0912345678", city: "طرابلس", area: "قرقارش", addressLine: "بناية 4" };
  const next = mergeCustomerPrefill(prev, {
    name: "سالم", phone: "0912345678", city: "طرابلس", area: "الوسط", addressLine: "شارع جديد 9",
  });
  assert.equal(next?.area, "الوسط");
  assert.equal(next?.addressLine, "شارع جديد 9");
});

test("merge: an invalid submission discards silently (never throws into the success moment)", () => {
  assert.equal(mergeCustomerPrefill(null, { name: "", phone: "" }), null);
  assert.doesNotThrow(() => mergeCustomerPrefill(null, { name: "م", phone: "1" }));
});

/* ── the save round-trip composes the law ────────────────────────── */

test("save: a pickup order after a delivery order keeps the address in storage", () => {
  const store = memoryStorage();
  saveCustomerPrefill({ name: "أمينة", phone: "0915555555", city: "طرابلس", area: "حي الأندلس", addressLine: "شارع 12" }, store);
  saveCustomerPrefill({ name: "أمينة", phone: "0915555555" }, store); // طلب استلام
  const loaded = loadCustomerPrefill(store);
  assert.equal(loaded?.area, "حي الأندلس");
  assert.equal(loaded?.addressLine, "شارع 12");
});
