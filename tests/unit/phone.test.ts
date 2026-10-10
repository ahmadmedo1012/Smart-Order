// r137 — Libya-first unit tests for the phone seam (src/lib/phone.ts).
// Pure node:test (dependency-free, like parity.mjs / e2e), run via
// `npm run test:unit`. Node ≥ 22.18 strips the TS types natively.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeLibyanPhone,
  toE164,
  formatPhoneDisplay,
} from "../../src/lib/phone.ts";

test("normalizeLibyanPhone: canonical 09x passthrough", () => {
  assert.equal(normalizeLibyanPhone("0912345678"), "0912345678");
});

test("normalizeLibyanPhone: every mobile carrier prefix 091-095", () => {
  // 091/093 Al Madar · 092/094 Libyana · 095 Aljeel Aljadeed/LTT.
  for (const p of ["091", "092", "093", "094", "095"]) {
    assert.equal(normalizeLibyanPhone(p + "1234567"), p + "1234567");
  }
});

test("normalizeLibyanPhone: Tripoli landline 021 is valid too", () => {
  assert.equal(normalizeLibyanPhone("0211234567"), "0211234567");
});

test("normalizeLibyanPhone: Eastern Arabic digits ٠٩١٢٣٤٥٦٧٨", () => {
  assert.equal(normalizeLibyanPhone("٠٩١٢٣٤٥٦٧٨"), "0912345678");
});

test("normalizeLibyanPhone: separators (spaces / dashes) are noise", () => {
  assert.equal(normalizeLibyanPhone("091 234 5678"), "0912345678");
  assert.equal(normalizeLibyanPhone("091-234-5678"), "0912345678");
});

test("normalizeLibyanPhone: +218 international prefix", () => {
  assert.equal(normalizeLibyanPhone("+218 91 234 5678"), "0912345678");
  assert.equal(normalizeLibyanPhone("+218912345678"), "0912345678");
});

test("normalizeLibyanPhone: 00218 international prefix", () => {
  assert.equal(normalizeLibyanPhone("00218912345678"), "0912345678");
  assert.equal(normalizeLibyanPhone("00218 91 234 5678"), "0912345678");
});

test("normalizeLibyanPhone: bare 218 prefix (Eastern digits too)", () => {
  assert.equal(normalizeLibyanPhone("218912345678"), "0912345678");
  assert.equal(normalizeLibyanPhone("٢١٨٩١٢٣٤٥٦٧٨"), "0912345678");
});

test("normalizeLibyanPhone: missing leading trunk 0", () => {
  assert.equal(normalizeLibyanPhone("912345678"), "0912345678");
});

test("normalizeLibyanPhone: rejects empty / non-numeric", () => {
  assert.equal(normalizeLibyanPhone(""), null);
  assert.equal(normalizeLibyanPhone("not-a-phone"), null);
  assert.equal(normalizeLibyanPhone("١٢٣٤٥"), null);
});

test("normalizeLibyanPhone: rejects wrong lengths", () => {
  assert.equal(normalizeLibyanPhone("09123456"), null); // 8 digits — too short
  assert.equal(normalizeLibyanPhone("09123456789"), null); // 11 digits — too long
  assert.equal(normalizeLibyanPhone("9123456789"), null); // 10 digits + trunk 0 = 11
});

test("r138 wider contract: 9-digit short mobile is VALID (Smart-Link parity)", () => {
  // المشغلون القصار (095 LTT/الجيل الجديد تاريخيًا) يصدرون 09 + 7 أرقام —
  // كان يُرفض هنا ويُقبل في Smart-Link (انحراف تدقيق r138-e). الصرامة القديمة
  // «10 خانات بالضبط» لم يوثق أي ملف سببها — وُحّد العقد الأوسع مع توثيقه
  // في رأس lib/phone.ts.
  assert.equal(normalizeLibyanPhone("091234567"), "091234567");
  assert.equal(normalizeLibyanPhone("٠٩١٢٣٤٥٦٧"), "091234567");
  assert.equal(normalizeLibyanPhone("095123456"), "095123456");
  // الدولي للنموذج القصير: +218 91 234 567 و 00218 951 23456
  assert.equal(normalizeLibyanPhone("+218 91 234 567"), "091234567");
  assert.equal(normalizeLibyanPhone("0021895123456"), "095123456");
});

test("r138 wider contract: missing trunk 0 on the SHORT mobile (8 digits)", () => {
  // نفس فكرة Smart-Link: الجذع يُسبق قبل التحقق فيقبل 9xxxxxxx (8 خانات)
  assert.equal(normalizeLibyanPhone("91234567"), "091234567");
  assert.equal(normalizeLibyanPhone("21891234567"), "091234567");
});

test("r138 wider contract: landline 0[1-9] at 10 digits (was 0[125-9])", () => {
  // البادئة الوطنية اتسعت لتغطية مساحة الترقيم كاملة (03/04 كانت مرفوضة)
  assert.equal(normalizeLibyanPhone("0312345678"), "0312345678");
  assert.equal(normalizeLibyanPhone("0412345678"), "0412345678");
  // الأرضي القصير يبقى مرفوضًا: النموذج القصير محمول فقط (09 + 7)
  assert.equal(normalizeLibyanPhone("021123456"), null);
  assert.equal(normalizeLibyanPhone("21"), null);
});

test("normalizeLibyanPhone: rejects non-Libyan numbers", () => {
  // Egypt +20, Sudan +249, UK +44 — none share Libya's 218/0x 10-digit shape.
  assert.equal(normalizeLibyanPhone("+201234567890"), null);
  assert.equal(normalizeLibyanPhone("+249912345678"), null);
  assert.equal(normalizeLibyanPhone("+447911123456"), null);
  // 10 digits but not the 0-prefixed national format.
  assert.equal(normalizeLibyanPhone("3312345678"), null);
});

test("toE164: local 09x → 218-prefixed, no plus", () => {
  assert.equal(toE164("0912345678"), "218912345678");
  assert.equal(toE164("091 234 5678"), "218912345678");
  // (r138) النموذج القصير أيضًا — رابط wa.me صالح بطول 12 خانة
  assert.equal(toE164("091234567"), "21891234567");
});

test("toE164: already-international passthrough", () => {
  assert.equal(toE164("218912345678"), "218912345678");
  assert.equal(toE164("+218 91 234 5678"), "218912345678");
});

test("formatPhoneDisplay: «091 234 5678» grouping", () => {
  assert.equal(formatPhoneDisplay("0912345678"), "091 234 5678");
  assert.equal(formatPhoneDisplay("٠٩١٢٣٤٥٦٧٨"), "091 234 5678");
  // (r138) النموذج المحلي القصير يُجمّع بنفس النمط 3-3-3
  assert.equal(formatPhoneDisplay("091234567"), "091 234 567");
});

test("formatPhoneDisplay: non-local shapes pass through untouched", () => {
  assert.equal(formatPhoneDisplay("218912345678"), "218912345678");
  assert.equal(formatPhoneDisplay("331234567"), "331234567"); // 9 خانات بلا جذع 0
});

test("seam round-trip: international input → local → display + E.164", () => {
  const local = normalizeLibyanPhone("+218 91 234 5678");
  assert.ok(local);
  assert.equal(formatPhoneDisplay(local), "091 234 5678");
  assert.equal(toE164(local), "218912345678");
});
