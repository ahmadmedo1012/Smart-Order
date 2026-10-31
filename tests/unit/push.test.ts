/**
 * P38 (Phase F) — عقود خط إشعارات الطلبات:
 *
 *   · بناء الحمولة الآمنة: رقم الطلب فقط — لا بيانات عميل ولا بنود
 *     ولا ملاحظات في إشعار (قانون الحمولة).
 *   · إيصال Expo: دفعات ≤100، عدّ النجاح/الفشل، إبطال التوكنات
 *     الميتة (DeviceNotRegistered) فقط، وفشل النقل لا يرفع أبدًا.
 *   · تفويض المستلمين: orders.read هو البوابة (نفس صندوق الطلبات) —
 *     عضو بلا صلاحية لا يستلم، والصلاحيات الإضافية تُحترم.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPushMessage } from "../../src/lib/push-core.ts";

test("حمولة «طلب جديد»: رقم الطلب فقط — لا PII ولا بنود ولا ملاحظات", () => {
  const msg = buildPushMessage({
    kind: "order-created",
    orderNumber: "SO-1042",
    businessId: "b1",
    businessName: "مخبز الواحة",
    total: 45.5,
  });
  assert.equal(msg.title, "طلب جديد");
  assert.ok(msg.body.includes("SO-1042"));
  // القانون: لا اسم عميل ولا هاتف ولا عنوان ولا أي مبلغ داخل الإشعار.
  assert.ok(!msg.body.includes("45.5"));
  assert.ok(!/customer|phone|address|اسم|هاتف|عنوان/i.test(JSON.stringify(msg)));
  assert.deepEqual(msg.data, { kind: "order-created", orderNumber: "SO-1042", businessId: "b1" });
});

test("حمولة «تحديث حالة»: الحالة بالعربية والرقم — لا شيء آخر", () => {
  const msg = buildPushMessage({ kind: "order-status", orderNumber: "SO-7", businessId: "b2", status: "OUT_FOR_DELIVERY" });
  assert.equal(msg.title, "تحديث حالة طلب");
  assert.ok(msg.body.includes("SO-7"));
  assert.ok(msg.body.includes("في الطريق"));
  assert.equal(msg.data.status, "OUT_FOR_DELIVERY");
  // حالة غير معروفة تطبع القيمة الخام (لا نكذب بترجمة مزعومة).
  assert.ok(buildPushMessage({ kind: "order-status", orderNumber: "X", businessId: "b", status: "WEIRD" }).body.includes("WEIRD"));
});

test("دفعات الإرسال: إبطال DeviceNotRegistered فقط، وفشل النقل لا يقتل توكنًا صالحًا", async () => {
  const { chunkTokens, reduceTickets } = await import("../../src/lib/push-core.ts");
  // التقطيع: بلا تكرارات ويحترم حد الدفعة
  const batches = chunkTokens(["ExponentPushToken[a]", "ExponentPushToken[a]", "ExponentPushToken[b]"], 100);
  assert.equal(batches.length, 1);
  assert.equal(batches[0].length, 2);
  const many = chunkTokens(Array.from({ length: 205 }, (_, i) => `t${i}`), 100);
  assert.deepEqual(many.map((b) => b.length), [100, 100, 5]);
  // الاختزال: ok يُعدّ، الفشل يُعدّ، والموت DeviceNotRegistered فقط
  const batch = ["ExponentPushToken[a]", "ExponentPushToken[dead]", "ExponentPushToken[b]"];
  const tickets: import("../../src/lib/push-core.ts").ExpoPushTicket[] = [
    { status: "ok", id: "1" },
    { status: "error", message: '"smartorder" is not a registered notification', details: { error: "DeviceNotRegistered" } },
    { status: "error", message: "no credentials found", details: { error: "MessageTooBig" } },
  ];
  const r = reduceTickets(batch, tickets);
  assert.equal(r.sent, 1);
  assert.equal(r.failed, 2);
  // فقط DeviceNotRegistered توكنها ميت — فشل التسليم (بلا اعتمادات)
  // لا يبطأ توكنًا صالحًا؛ التذاكر الأقصر من الدفعة آمنة (فهرس خارجي بلا حكم موت).
  assert.deepEqual(r.deadTokens, ["ExponentPushToken[dead]"]);
  const shortBatch = ["ExponentPushToken[x]"];
  assert.deepEqual(reduceTickets(shortBatch, [{ status: "error", message: "no credentials found" }]).deadTokens, []);
});

test("توكنات فارغة → لا دفعات أصلًا (لا نداء شبكي)", async () => {
  const { chunkTokens } = await import("../../src/lib/push-core.ts");
  assert.deepEqual(chunkTokens([]), []);
  // التكرارات تُزال قبل التقطيع — 3 نسخ من توكن واحد = دفعة واحدة بعنصر واحد
  assert.deepEqual(chunkTokens(["ExponentPushToken[a]", "ExponentPushToken[a]", "ExponentPushToken[a]"]), [["ExponentPushToken[a]"]]);
});
