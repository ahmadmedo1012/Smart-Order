// P43 SO-2 — payment references (مراجع التحويل): the optional transfer
// receipt number a customer enters for MANUAL/MADAR/LIBYANA payments.
// Pure validation only — the money path stores it, the surfaces show it,
// and nothing ever trusts it as proof of payment (the merchant confirms
// by hand against their wallet statement; paymentStatus stays UNPAID
// until they do).
//
// Contract (the mission's own): 4–50 characters, letters/digits/dash/
// slash only — the shapes Libyan bank/wallet receipts actually print
// (e.g. "TRX-9F3A2C", "MB/240311/8812"). Unicode letters allowed
// (Arabic banking refs exist); whitespace and punctuation do not.

export const PAYMENT_REFERENCE_MIN = 4;
export const PAYMENT_REFERENCE_MAX = 50;

export const PAYMENT_REFERENCE_PATTERN = /^[\p{L}\p{N}/-]+$/u;

/** Normalize on entry (trim) — stored exactly as the customer typed it
 *  inside the charset rule. */
export function normalizePaymentReference(raw: string): string {
  return raw.trim();
}

export function isValidPaymentReference(ref: string): boolean {
  return (
    ref.length >= PAYMENT_REFERENCE_MIN &&
    ref.length <= PAYMENT_REFERENCE_MAX &&
    PAYMENT_REFERENCE_PATTERN.test(ref)
  );
}

/** The Arabic refusal copy (checkout inline + server 422 — one source). */
export function paymentReferenceError(ref: string): string | null {
  if (ref.length === 0) return null; // optional by design — empty is not an error
  if (ref.length < PAYMENT_REFERENCE_MIN) {
    return `مرجع التحويل قصير جداً — ${PAYMENT_REFERENCE_MIN} محارف على الأقل`;
  }
  if (ref.length > PAYMENT_REFERENCE_MAX) {
    return `مرجع التحويل طويل — حتى ${PAYMENT_REFERENCE_MAX} محرفاً`;
  }
  if (!PAYMENT_REFERENCE_PATTERN.test(ref)) {
    return "مرجع التحويل يقبل الحروف والأرقام والشرطة والقاطع فقط (مثال: TRX-9F3A2C)";
  }
  return null;
}

/** The payment-method types that COLLECT a reference at checkout — the
 *  transfer family the merchant must reconcile against a statement. */
export const REFERENCE_PAYMENT_TYPES = ["MANUAL", "MADAR", "LIBYANA"] as const;

export function collectsPaymentReference(paymentType: string | null | undefined): boolean {
  return (REFERENCE_PAYMENT_TYPES as readonly string[]).includes(paymentType ?? "");
}
