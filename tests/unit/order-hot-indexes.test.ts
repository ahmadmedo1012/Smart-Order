// P42-W6 (تدقيق §7 — DB efficiency) — عقد مصدري يثبّت فهارس جدول الطلبات
// التي تخدم المسارات الساخنة. لماذا تثبيت مصدري (وليس سلوكيًا)؟ فحص
// خطة التنفيذ يحتاج قاعدة بيانات حقيقية بمحرك معيّن، والاختبارات
// الوحدوية هنا بلا تبعيات (عائلة tx-contract.test.ts)؛ الحارس يمنع
// إزالة الفهرس بصمت في إعادة هيكلة قادمة — إزالة فهرس مسار ساخن لا
// يفشل أي اختبار سلوكي، فقط تتباطأ الإنتاجية على جدول ينمو.
//
// الفهرسان المضافان في هذه الموجة (كل واحد يخدم استعلامًا فعليًا في
// الشيفرة، لا فهرسًا تخمينيًا):
//   · @@index([businessId, createdAt]) — قائمة طلبات التاجر
//     (GET /api/orders: businessId + orderBy createdAt desc + من/إلى
//     + الترقيم)، عدّ اليوم في المسار المالي (POST /api/public/orders:
//     count where businessId + createdAt >= dayStart)، وطلبات لوحة
//     التحكم الأخيرة. أقرب فهرس سابق (businessId, status, createdAt)
//     كان يخدم بادئة businessId فقط ثم يفرز النتائج في الذاكرة.
//   · @@index([orderNumber, customerPhone, createdAt]) — بحث التتبع
//     العام (POST /api/public/track: findFirst where orderNumber = X
//     AND customerPhone = Y orderBy createdAt desc). لم يكن له فهرس
//     يغطيه: الفهرس الفريد (businessId, orderNumber) لا يخدم
//     orderNumber منفردًا (businessId عموده الأول)، فكان الاستعلام
//     مسحًا كاملًا للجدول على مسار عام ينمو مع كل طلب.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (p: string): string =>
  readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

/** The Order model block (from `model Order {` to its closing brace). */
function orderModelBlock(schemaText: string): string {
  const start = schemaText.indexOf("model Order {");
  assert.notEqual(start, -1, "model Order not found");
  let depth = 0;
  for (let i = start; i < schemaText.length; i++) {
    if (schemaText[i] === "{") depth++;
    else if (schemaText[i] === "}") {
      depth--;
      if (depth === 0) return schemaText.slice(start, i);
    }
  }
  assert.fail("unbalanced braces in model Order");
}

const TWINS = [
  ["prisma/schema.prisma", "SQLite dev"],
  ["prisma/schema.postgres.prisma", "PostgreSQL prod"],
] as const;

for (const [path, label] of TWINS) {
  test(`Order hot-path indexes exist on the ${label} twin (${path})`, () => {
    const block = orderModelBlock(read(`../../${path}`));
    // the two P42-W6 additions — hot paths verified against the queries above
    assert.match(
      block,
      /@@index\(\[businessId,\s*createdAt\]\)/,
      "merchant orders list + money-path daily count index",
    );
    assert.match(
      block,
      /@@index\(\[orderNumber,\s*customerPhone,\s*createdAt\]\)/,
      "public track-lookup index (orderNumber+phone equality, newest-first)",
    );
    // the pre-existing ones must not regress either (the fix must be
    // additive — removing a sibling index while adding these would be a
    // net loss the test should catch)
    assert.match(block, /@@unique\(\[businessId,\s*orderNumber\]\)/);
    assert.match(block, /@@unique\(\[businessId,\s*idempotencyKey\]\)/);
    assert.match(block, /@@index\(\[businessId,\s*status,\s*createdAt\]\)/);
    assert.match(block, /@@index\(\[businessId,\s*customerPhone,\s*createdAt\]\)/);
    assert.match(block, /publicToken\s+String\s+@unique/);
  });
}
