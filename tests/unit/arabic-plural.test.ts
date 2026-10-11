// r140 (P3-6) — pins for the ported Arabic plural engine
// (src/lib/arabic-plural.ts — Smart-Menu twin) and the phrase helper
// countedArabicPhrase used by product-card.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getArabicPlural,
  countedArabicPhrase,
  arabicNumberState,
} from "../../src/lib/arabic-plural.ts";

test("getArabicPlural (family engine): the six number states", () => {
  assert.equal(getArabicPlural(0, "صنف", { zero: "فارغة" }), "فارغة");
  assert.equal(getArabicPlural(1, "صنف", { one: "صنف واحد" }), "صنف واحد");
  assert.equal(getArabicPlural(2, "صنف"), "صنفان"); // mechanical sound dual
  assert.equal(getArabicPlural(5, "صنف", { few: "أصناف" }), "أصناف");
  assert.equal(getArabicPlural(15, "صنف", { many: "صنفًا" }), "صنفًا");
});

test("arabicNumberState: CLDR boundaries (the r104 lesson)", () => {
  // 103 % 100 = 3 → few; 111 → many; 101 → other→many (CLDR 'ar')
  assert.equal(arabicNumberState(103), "few");
  assert.equal(arabicNumberState(111), "many");
  assert.equal(arabicNumberState(101), "many");
  assert.equal(arabicNumberState(100), "many");
});

test("countedArabicPhrase (r140 P3-6): product-card phrases — no more «1 أحجام»", () => {
  const sizes = (n: number) =>
    countedArabicPhrase(n, "حجم", {
      one: "حجم واحد",
      two: "حجمان",
      few: "أحجام",
      many: "حجمًا",
    });
  const groups = (n: number) =>
    countedArabicPhrase(n, "إضافة", {
      one: "إضافة واحدة",
      two: "إضافتان",
      few: "إضافات",
      many: "إضافة",
    });
  // the old literal `${n} أحجام` rendered "1 أحجام" — the pin that broke
  assert.equal(sizes(1), "حجم واحد");
  assert.equal(sizes(2), "حجمان");
  assert.equal(sizes(3), "3 أحجام");
  assert.equal(sizes(7), "7 أحجام");
  assert.equal(groups(1), "إضافة واحدة");
  assert.equal(groups(2), "إضافتان");
  assert.equal(groups(3), "3 إضافات");
});
