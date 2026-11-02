// P42-W6 (تدقيق §2) — عقد مصدرية لتحويلات هذه الموجة التي ليست معاملات
// (فلا مكان لها في tx-contract.test.ts) ولا فهارس (لها
// order-hot-indexes.test.ts). عائلة القراءة-الصمدة نفسها: بلا تبعيات،
// node --test يقرأ المصدر حرفيًا، والارتداد يكسر CI فورًا.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (p: string): string =>
  readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

/* ── سقف سعر المنتج في مسار التعديل (تكافؤ مع مسار الإنشاء r140 P3-2) ──
 *
 * الإنشاء (POST /api/products) يرفض أي سعر فوق 999_999_000 مليم منذ
 * r140 — لكن مسار التعديل (PATCH /api/products/[id]) كان يقبل الرقم
 * نفسه، فتحوّل «تعديل سعر» إلى ثغرة الحافة نفسها التي أغلقها r140:
 * unit × 99 كمية × 50 سطرًا تقترب من MAX_SAFE_INTEGER وتفسد الإجماليات.
 * الدبوس يطالب بالسقف نفسه في مساري الإنشاء والتعديل معًا — أحدهما بلا
 * الآخر نافذة متبقية. */
const productsCreateSrc = read("../../src/app/api/products/route.ts");
const productsPatchSrc = read("../../src/app/api/products/[id]/route.ts");

test("products price ceiling (P42-W6): the PATCH path enforces the SAME 999_999_000 cap the POST path does", () => {
  const postCap = productsCreateSrc.match(/if \(m > 999_999_000\) throw/);
  assert.ok(postCap, "the POST path's cap is the anchor contract (r140 P3-2)");
  const patchPrice = productsPatchSrc.slice(
    productsPatchSrc.indexOf("price:"),
    productsPatchSrc.indexOf("isAvailable"),
  );
  assert.match(
    patchPrice,
    /if \(m > 999_999_000\) throw/,
    "PATCH price must carry the same ceiling — a price edit is the same money surface as a create",
  );
  assert.match(patchPrice, /m < 0/, "the no-negative floor stays");
});
