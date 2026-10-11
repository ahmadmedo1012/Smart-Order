// r140 (P2-3) — USSD seam tests (src/lib/payment-constants.ts).
// The libyana quick-code interpolates `amountLyD * 1000` (fils) directly;
// IEEE-754 floats made 1472 of the first 100000 millime values produce a
// DEAD code the customer copies and dials (e.g. 1.001 LYD → 1000.9999999999999).
// These pins force-check every millime value 1..100000 exhaustively.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  libyanaUssdCode,
  madarUssdCode,
  WALLET_CAP_LYD,
} from "../../src/lib/payment-constants.ts";

test("libyanaUssdCode: shape — *122*218 + phone without trunk 0 + fils + *1#", () => {
  assert.equal(libyanaUssdCode("0942119637", 19.5), "*122*218942119637*19500*1#");
});

test("libyanaUssdCode (r140 fix): 1001 millimes → «1001» not «1000.9999999999999»", () => {
  // 1.001 LYD is the audit's canonical break: the raw float product is
  // 1000.9999999999999 — a dead USSD code on the customer's screen.
  assert.equal(libyanaUssdCode("0942119637", 1.001), "*122*218942119637*1001*1#");
});

test("libyanaUssdCode (r140): EVERY millime 1..100000 renders integer fils", () => {
  // exhaustive sweep of the whole wallet cap range (99 LYD = 99000) and
  // beyond (up to 100 LYD) — the amount segment must be the integer string.
  const phone = "0912345678";
  const prefix = "*122*218912345678*";
  const suffix = "*1#";
  for (let millimes = 1; millimes <= 100000; millimes++) {
    const code = libyanaUssdCode(phone, millimes / 1000);
    assert.equal(code, `${prefix}${millimes}${suffix}`, `amount ${millimes} millimes`);
  }
});

test("libyanaUssdCode (r140): dirham-level odd values stay exact", () => {
  // spot pins at the dirham-fraction boundaries the audit called out
  // (19.999, 0.001, 99.999) — all previously float-broken or near misses.
  assert.equal(libyanaUssdCode("0912345678", 19.999).includes("19999"), true);
  assert.equal(libyanaUssdCode("0912345678", 0.001), "*122*218912345678*1*1#");
  assert.equal(libyanaUssdCode("0912345678", 99.999).includes("99999"), true);
});

test("madarUssdCode: shape unchanged — LYD amount interpolated as-is", () => {
  assert.equal(madarUssdCode("0942119637", 19.5), "*140*4*1*19.5*0942119637#");
});

test("WALLET_CAP_LYD contract: 99 (single-transfer network cap)", () => {
  assert.equal(WALLET_CAP_LYD, 99);
});
