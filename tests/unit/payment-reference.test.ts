// P43 SO-2 — the payment-reference seam (src/lib/payment-reference.ts):
// the optional transfer receipt a customer enters for MANUAL/MADAR/
// LIBYANA payments — 4–50 chars, letters/digits/dash/slash only (the
// shapes Libyan wallet/bank receipts actually print).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PAYMENT_REFERENCE_MAX,
  PAYMENT_REFERENCE_MIN,
  collectsPaymentReference,
  isValidPaymentReference,
  normalizePaymentReference,
  paymentReferenceError,
} from "../../src/lib/payment-reference.ts";

test("isValidPaymentReference: 4–50 letters/digits/dash/slash (unicode)", () => {
  assert.equal(isValidPaymentReference("TRX-9F3A2C"), true);
  assert.equal(isValidPaymentReference("MB/240311/8812"), true);
  assert.equal(isValidPaymentReference("881244"), true);
  assert.equal(isValidPaymentReference("تحويل-2403"), true); // Arabic refs exist
  assert.equal(isValidPaymentReference("TRX"), false); // < 4
  assert.equal(isValidPaymentReference("T".repeat(51)), false); // > 50
  assert.equal(isValidPaymentReference("TRX 9F3A"), false); // inner space
  assert.equal(isValidPaymentReference("TRX.9F3A"), false); // dot
  assert.equal(isValidPaymentReference(""), false);
});

test("paymentReferenceError: empty is NOT an error (optional by design), every rule speaks Arabic", () => {
  assert.equal(paymentReferenceError(""), null);
  assert.equal(paymentReferenceError("TRX-9F3A2C"), null);
  assert.equal(paymentReferenceError("TRX"), "مرجع التحويل قصير جداً — 4 محارف على الأقل");
  const tooLong = paymentReferenceError("T".repeat(51));
  assert.ok(!!tooLong && tooLong.includes("50"));
  const badCharset = paymentReferenceError("TRX 9F3A");
  assert.ok(!!badCharset && badCharset.includes("الحروف والأرقام"));
});

test("normalizePaymentReference: trims only — the stored form is what the customer typed", () => {
  assert.equal(normalizePaymentReference("  TRX-9F3A2C  "), "TRX-9F3A2C");
  assert.equal(normalizePaymentReference("MB/240311/8812"), "MB/240311/8812");
});

test("the length bounds are the mission's own contract", () => {
  assert.equal(PAYMENT_REFERENCE_MIN, 4);
  assert.equal(PAYMENT_REFERENCE_MAX, 50);
});

test("collectsPaymentReference: exactly the transfer family", () => {
  assert.equal(collectsPaymentReference("MANUAL"), true);
  assert.equal(collectsPaymentReference("MADAR"), true);
  assert.equal(collectsPaymentReference("LIBYANA"), true);
  assert.equal(collectsPaymentReference("CASH"), false);
  assert.equal(collectsPaymentReference("COD"), false);
  assert.equal(collectsPaymentReference("WHATSAPP"), false);
  assert.equal(collectsPaymentReference(null), false);
  assert.equal(collectsPaymentReference(undefined), false);
});
