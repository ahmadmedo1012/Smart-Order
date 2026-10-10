// r137 — Libya-first unit tests for the money seam (src/lib/money.ts).
// 1 LYD = 1000 millimes (3-decimal dirham) — never floats.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseLyd,
  formatLyd,
  formatLydAmount,
  tryParseLyd,
} from "../../src/lib/money.ts";
import { WALLET_CAP_LYD } from "../../src/lib/payment-constants.ts";

test("parseLyd: the unit contract — 1 LYD = 1000 millimes", () => {
  assert.equal(parseLyd("1"), 1000);
  assert.equal(parseLyd("1.000"), 1000);
});

test("parseLyd: 3-decimal dirham precision", () => {
  assert.equal(parseLyd("12.500"), 12500);
  assert.equal(parseLyd("12.5"), 12500); // short frac is zero-padded
  assert.equal(parseLyd("0.001"), 1);
  assert.equal(parseLyd("0.000"), 0);
});

test("parseLyd: Western comma is a decimal separator", () => {
  assert.equal(parseLyd("12,500"), 12500);
  assert.equal(parseLyd("12,5"), 12500);
});

test("parseLyd: Eastern Arabic digits", () => {
  assert.equal(parseLyd("١٢.٥٠٠"), 12500);
  assert.equal(parseLyd("٩٩"), 99000);
});

test("parseLyd (r137 fix): Arabic decimal separator ٫ and Arabic comma ،", () => {
  // iOS/Android Arabic keyboards type ٫ (U+066B) as the native decimal —
  // before r137 it was silently STRIPPED: «٣٫٥٠» parsed as 350 LYD, a 100×
  // overcharge on the price the owner set. Now it maps to "." like the comma.
  assert.equal(parseLyd("٣٫٥٠"), 3500);
  assert.equal(parseLyd("3٫50"), 3500);
  assert.equal(parseLyd("12،500"), 12500);
});

test("parseLyd: bare-dot shapes", () => {
  assert.equal(parseLyd(".750"), 750);
  assert.equal(parseLyd("12."), 12000);
});

test("parseLyd: string input truncates beyond 3 decimals (no rounding)", () => {
  assert.equal(parseLyd("12.5678"), 12567);
});

test("parseLyd: number input rounds through the float safely", () => {
  assert.equal(parseLyd(12.5), 12500);
  assert.equal(parseLyd(0.29), 290); // 0.29 × 1000 = 289.999… in IEEE-754
  assert.equal(parseLyd(99.999), 99999);
  assert.throws(() => parseLyd(Number.NaN));
  assert.throws(() => parseLyd(Number.POSITIVE_INFINITY));
});

test("parseLyd: invalid strings throw the Arabic form errors", () => {
  assert.throws(() => parseLyd(""), /أدخل قيمة صحيحة/);
  assert.throws(() => parseLyd("abc"), /أدخل قيمة صحيحة/);
  assert.throws(() => parseLyd("1.2.3"), /قيمة غير صالحة/);
  // r137: two Arabic separators now surface as the same two-dot error
  // instead of silently concatenating into «123».
  assert.throws(() => parseLyd("1٫2٫3"), /قيمة غير صالحة/);
});

test("parseLyd ⇄ WALLET_CAP_LYD: the 99 LYD wallet cap crosses the seam exactly", () => {
  // libyana/madar single transfers above the cap are impossible; checkout
  // hides the USSD quick-code above it (r134) — the cap must parse to the
  // exact millimes boundary, and the first step above must be +1 millime.
  assert.equal(parseLyd("99.000"), WALLET_CAP_LYD * 1000);
  assert.equal(parseLyd("99.001"), WALLET_CAP_LYD * 1000 + 1);
  assert.equal(formatLyd(WALLET_CAP_LYD * 1000), "99.000 د.ل");
});

test("formatLydAmount: raw form seeding — always 3 decimals", () => {
  assert.equal(formatLydAmount(12500), "12.500");
  assert.equal(formatLydAmount(0), "0.000");
  assert.equal(formatLydAmount(1), "0.001");
  assert.equal(formatLydAmount(999), "0.999");
  assert.equal(formatLydAmount(99000), "99.000");
});

test("formatLydAmount: negatives keep the sign", () => {
  assert.equal(formatLydAmount(-12500), "-12.500");
});

test("formatLyd: ar-LY display — dot grouping from 1,000, then « د.ل»", () => {
  assert.equal(formatLyd(999), "0.999 د.ل"); // below 1,000 — ungrouped
  assert.equal(formatLyd(1000), "1.000 د.ل"); // grouping boundary
  assert.equal(formatLyd(12500), "12.500 د.ل");
  assert.equal(formatLyd(12500000), "12.500.000 د.ل");
  assert.equal(formatLyd(-12500000), "-12.500.000 د.ل");
});

test("two-seam contract: forms round-trip formatLydAmount, NOT formatLyd", () => {
  // formatLydAmount output re-parses exactly …
  assert.equal(tryParseLyd(formatLydAmount(12500000)), 12500000);
  // … while the grouped display string is deliberately NOT form-parseable
  // (why the r133 grouping lives in formatLyd only).
  assert.equal(tryParseLyd(formatLyd(12500000)), null);
});

test("tryParseLyd: null-safe form variant", () => {
  assert.equal(tryParseLyd(null), null);
  assert.equal(tryParseLyd(undefined), null);
  assert.equal(tryParseLyd(""), null);
  assert.equal(tryParseLyd("abc"), null);
  assert.equal(tryParseLyd("12.5"), 12500);
});
