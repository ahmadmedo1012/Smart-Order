// r137 — the WhatsApp message builders (src/lib/whatsapp.ts): the
// structured Arabic order messages riding wa.me deep links. The money
// strings inside must come from formatLyd (millimes, never floats),
// the phone display from formatPhoneDisplay — the same seams the
// storefront renders. (Import rewrite: the module's three imports now
// ride relative .ts specifiers so plain Node loads it.)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildOrderMessage,
  buildCustomerConfirmationMessage,
  buildStatusUpdateMessage,
  waLink,
} from "../../src/lib/whatsapp.ts";

const ORDER = {
  orderNumber: "SO-20261029-0001",
  customerName: "أحمد المهدي",
  customerPhone: "0912345678",
  items: [
    {
      productName: "قهوة عربية",
      variantName: "وسط",
      options: "سكر زيادة",
      quantity: 2,
      lineTotal: 12500, // millimes — 12.500 د.ل
    },
    {
      productName: "كيك التمر",
      variantName: null,
      options: null,
      quantity: 1,
      lineTotal: 8000,
    },
  ],
  fulfillmentType: "DELIVERY" as const,
  city: "طرابلس",
  area: "الحي الدبلوماسي",
  addressLine: "شارع الجزائر 12",
  subtotal: 33000,
  deliveryFee: 4000,
  total: 37000,
  paymentName: "ليبيانا مبايل",
  paymentType: "WALLET" as const,
  customerNote: "الاتصال قبل الوصول",
};

test("buildOrderMessage: header, customer line, every item, money summary", () => {
  const msg = buildOrderMessage(ORDER);
  assert.ok(msg.includes("طلب جديد"));
  assert.ok(msg.includes(ORDER.orderNumber));
  assert.ok(msg.includes(ORDER.customerName));
  // the display phone (grouped 091 234 5678 — not the raw local form):
  assert.ok(msg.includes("091 234 5678"));
  // both items with quantity and the millimes-derived money strings
  // (whole dinars render clean "8 د.ل", fractional at 3 decimals):
  assert.ok(msg.includes("2× قهوة عربية"));
  assert.ok(msg.includes("[وسط]"));
  assert.ok(msg.includes("(سكر زيادة)"));
  assert.ok(msg.includes("12.500 د.ل"));
  assert.ok(msg.includes("1× كيك التمر"));
  assert.ok(msg.includes("8 د.ل"));
  // the summary block:
  assert.ok(msg.includes("المجموع الفرعي: 33 د.ل"));
  assert.ok(msg.includes("التوصيل: 4 د.ل"));
  assert.ok(msg.includes("*الإجمالي: 37 د.ل*"));
});

test("buildOrderMessage: DELIVERY carries the place + address + note + payment", () => {
  const msg = buildOrderMessage(ORDER);
  assert.ok(msg.includes("طرابلس — الحي الدبلوماسي"));
  assert.ok(msg.includes(ORDER.addressLine));
  assert.ok(msg.includes(ORDER.customerNote));
  assert.ok(msg.includes("ليبيانا مبايل")); // the wallet name rides the payment line
});

test("buildOrderMessage: PICKUP omits the place/address lines", () => {
  const msg = buildOrderMessage({ ...ORDER, fulfillmentType: "PICKUP" });
  assert.ok(msg.includes("استلام")); // the pickup label
  assert.equal(msg.includes(ORDER.addressLine), false);
  assert.equal(msg.includes("طرابلس — الحي الدبلوماسي"), false);
});

test("buildOrderMessage: zero delivery fee omits the delivery line", () => {
  const msg = buildOrderMessage({ ...ORDER, deliveryFee: 0, total: 33000 });
  assert.equal(msg.includes("التوصيل:"), false);
  assert.ok(msg.includes("*الإجمالي: 33 د.ل*"));
});

test("buildOrderMessage: the track URL appends when provided", () => {
  const url = "https://order.smart-link.ly/track/abc123";
  const msg = buildOrderMessage(ORDER, { trackUrl: url });
  assert.ok(msg.includes(url));
  assert.equal(buildOrderMessage(ORDER).includes("تتبع"), false);
});

test("buildCustomerConfirmationMessage: the business thanks, the number, the total", () => {
  const msg = buildCustomerConfirmationMessage(ORDER, "واحة البيتزا");
  assert.ok(msg.includes("واحة البيتزا"));
  assert.ok(msg.includes(ORDER.orderNumber));
  assert.ok(msg.includes("37 د.ل"));
  assert.equal(msg.includes("تتبع"), false); // absent without opts
  const withTrack = buildCustomerConfirmationMessage(ORDER, "واحة البيتزا", {
    trackUrl: "https://t/xyz",
  });
  assert.ok(withTrack.includes("https://t/xyz"));
});

test("buildStatusUpdateMessage: every OrderStatus carries its Arabic line", () => {
  const cases: Array<[string, string]> = [
    ["CONFIRMED", "تم تأكيد طلبك"],
    ["PREPARING", "قيد التحضير"],
    ["READY", "جاهز"],
    ["OUT_FOR_DELIVERY", "في الطريق"],
    ["DELIVERED", "تم توصيل طلبك"],
    ["CANCELLED", "تم إلغاء طلبك"],
    ["REJECTED", "لم نتمكن من قبول طلبك"],
  ];
  for (const [status, phrase] of cases) {
    const msg = buildStatusUpdateMessage("SO-1", status as never, "متجر ديمو");
    assert.ok(msg.includes(phrase), `${status} should carry "${phrase}"`);
    assert.ok(msg.includes("SO-1"));
    assert.ok(msg.includes("متجر ديمو"));
  }
});

test("waLink: digits-only target, percent-encoded message", () => {
  assert.equal(waLink("218912345678"), "https://wa.me/218912345678");
  assert.equal(waLink("+218 (91) 234-5678"), "https://wa.me/218912345678");
  assert.equal(waLink(""), "https://wa.me/");
  const withMsg = waLink("218912345678", "مرحبا");
  assert.ok(withMsg.startsWith("https://wa.me/218912345678?text="));
  assert.equal(withMsg.includes("مرحبا"), false); // encoded, never raw
  assert.ok(decodeURIComponent(withMsg.split("text=")[1]!).includes("مرحبا"));
});
