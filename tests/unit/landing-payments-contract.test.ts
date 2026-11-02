// P42 (§5 — G2) — the wallet-cap claim contract (the landing honesty seam).
//
// THE FINDING: the homepage payments chapter sold the 99 د.ل wallet cap as
// «والمنصّة تتحقق منه قبل إتمام الطلب» — a server-side order validation that
// never existed. The REAL behavior (r134 W2 #3): the cap is checkout-time
// GUIDANCE only — `overWalletCap` (use-checkout-state) retires the quick USSD
// code row and points the customer at the manual bank-style transfer
// (payment-section), and a wallet order above the cap is NOT refused: the
// manual transfer row stays open (a customer CAN complete an oversized
// wallet order — the merchant confirms receipt manually either way).
//
// THE BRANCH TAKEN (G2): copy softened. The alternative — adding the cap as
// a server-side rejection to /api/public/orders — would ALTER the money
// path (P38 untouchable: repricing/idempotency/payment validation), so the
// honest fix is the claim itself, now describing the guidance that actually
// runs. These pins hold the branch coherent in BOTH directions:
//   · the shipped copy never claims a validation no route runs;
//   · the UI guidance the copy describes really exists;
//   · if a cap rejection ever lands in the orders route (a G2 re-decision),
//     the WALLET_CAP_LYD drift guard fires and the copy must move with it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (p: string): string =>
  readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

const section = read("../../src/components/landing/PaymentsSection.tsx");
const checkoutState = read("../../src/components/storefront/checkout/use-checkout-state.ts");
const paymentSection = read("../../src/components/storefront/checkout/payment-section.tsx");
const ordersRoute = read("../../src/app/api/public/orders/route.ts");

/* comment-stripped source (the parity convention: only shipped strings
   count — a retired claim may survive in the comment that documents its
   retirement) */
const stripped = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/[^\n]*$/gm, "$1");

test("copy (§5): the phantom server-validation claim is retired — the cap reads as checkout guidance", () => {
  const shipped = stripped(section);
  assert.ok(
    !shipped.includes("تتحقق منه"),
    "«والمنصّة تتحقق منه قبل إتمام الطلب» never ships again — no route ever ran that validation",
  );
  assert.ok(
    shipped.includes("تُرشد تلقائياً إلى التحويل اليدوي"),
    "the claim describes the real checkout guidance: above the cap the customer is pointed at the manual transfer",
  );
  // the cap itself stays the REAL constant the checkout uses (no invented number)
  assert.ok(
    section.includes("{WALLET_CAP_LYD} د.ل") || section.includes("{WALLET_CAP_LYD}"),
    "the cap figure rides the real WALLET_CAP_LYD constant",
  );
});

test("behavior (§5): the claimed guidance really exists — overWalletCap retires the quick code, the manual row stays open", () => {
  assert.ok(
    checkoutState.includes("const overWalletCap = total > WALLET_CAP_LYD * 1000;"),
    "checkout computes overWalletCap against the real cap (millimes)",
  );
  assert.ok(
    /overWalletCap \?/.test(paymentSection) && paymentSection.includes("يدوياً"),
    "above the cap the quick USSD code is replaced by the manual-transfer guidance",
  );
});

test("drift guard (§5): the money path carries NO cap rejection — the copy must stay guidance-only until it does", () => {
  assert.ok(
    !ordersRoute.includes("WALLET_CAP_LYD"),
    "the P38-untouchable money path never rejects a wallet order by the cap; if this changes, re-decide the G2 copy (and this pin) together",
  );
});
