// W7-D — the reports CSV seam pins (lib/report-csv.ts). The W6-B8
// formula-injection guard + the W6-B4 body contract moved verbatim from
// the reports page into the lib so the new SERVER export route
// (/api/dashboard/reports/export — the Pro+ gate's real seam) and the
// unit suite share ONE builder. Until now csvCell had no unit coverage
// (it shipped inside the page component); the extraction pays that debt.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  csvCell,
  buildReportCsv,
  reportCsvFileName,
  type ReportsData,
} from "../../src/lib/report-csv.ts";

test("guard: a cell that can execute as a formula is neutralized with the leading apostrophe (W6-B8)", () => {
  assert.equal(csvCell("=1+1"), "'=1+1");
  assert.equal(csvCell("+SUM(A1:A9)"), "'+SUM(A1:A9)");
  assert.equal(csvCell("-2"), "'-2");
  assert.equal(csvCell("@cmd"), "'@cmd");
});

test("guard: plain cells pass through untouched (no apostrophe noise on honest data)", () => {
  assert.equal(csvCell("بيتزا مارغريتا"), "بيتزا مارغريتا");
  assert.equal(csvCell(35500), "35500");
  assert.equal(csvCell("35.500"), "35.500");
  assert.equal(csvCell("د.ل"), "د.ل");
});

test("guard: row-breaking values are quoted, inner quotes doubled", () => {
  assert.equal(csvCell("a,b"), '"a,b"');
  assert.equal(csvCell('قال "نعم"'), '"قال ""نعم"""');
  assert.equal(csvCell("سطر\nجديد"), '"سطر\nجديد"');
  /* the formula prefix + quoting compose: guarded FIRST, then quoted */
  assert.equal(csvCell("=a,b"), '"\'=a,b"');
});

test("body: the honest W6-B4 header — product, store, window, the exclusion rule", () => {
  const d = fixture();
  const csv = buildReportCsv(d, "مخبز الواحة");
  const lines = csv.split("\r\n");
  assert.equal(lines[0], "سمارت أوردر — تقرير الأداء");
  assert.equal(lines[1], "المتجر,مخبز الواحة");
  assert.ok(lines[2].includes("آخر 30 يوماً"));
  assert.ok(lines[2].includes("من 2026-01-01 إلى 2026-01-30"));
  assert.equal(lines[3], "الطلبات,6 (بلا الملغي والمرفوض)");
  assert.equal(lines[4], "الإيراد (د.ل),70.000"); // raw formatLydAmount — Excel parses it as a number
  assert.equal(lines[5], "متوسط قيمة الطلب (د.ل),11.666");
});

test("body: the staff-editable store name rides the formula guard (a malicious editor injects, the owner executes)", () => {
  const csv = buildReportCsv(fixture(), "=HYPERLINK");
  assert.ok(csv.split("\r\n")[1].includes("'=HYPERLINK"));
});

test("body: daily revenue rows + top-products rows with their index", () => {
  const d = fixture();
  const csv = buildReportCsv(d, "متجر");
  const lines = csv.split("\r\n");
  assert.equal(lines[8], ""); // section divider
  assert.equal(lines[9], "الإيراد اليومي");
  assert.equal(lines[10], "اليوم,عدد الطلبات,الإيراد (د.ل)");
  assert.equal(lines[11], "2026-01-29,2,30.000");
  assert.equal(lines[12], "2026-01-30,4,40.000");
  assert.ok(lines.includes("أفضل المنتجات"));
  assert.ok(lines.includes("الترتيب,المنتج,الوحدات,عدد الطلبات,الإيراد (د.ل)"));
  assert.ok(lines.includes("1,بيتزا مارغريتا,3,2,30.000"));
  assert.ok(lines.includes("2,برجر لحم كلاسيك,2,4,40.000"));
});

test("filename: the honest W6-B4 contract — product + slug + window + Tripoli stamp", () => {
  const name = reportCsvFileName("wahda-bakery", 30);
  assert.ok(/^smart-order-report-wahda-bakery-30d-\d{8}\.csv$/.test(name), name);
  const name90 = reportCsvFileName("wahda-bakery", 90);
  assert.ok(name90.includes("-90d-"), name90);
});

/* ── P43 SO-2c: the reconciliation worksheets ─────────────────────── */

test("P43 SO-2c body: the per-payment-method worksheet (gross − discount = net, paid/unpaid)", () => {
  const d = fixture();
  const csv = buildReportCsv(d, "متجر");
  const lines = csv.split("\r\n");
  assert.ok(lines.includes("مطابقة المدفوعات (حسب طريقة الدفع)"));
  assert.ok(
    lines.includes("الطريقة,الطلبات,قبل الخصم (د.ل),الخصم (د.ل),الصافي (د.ل),مدفوع,غير مدفوع"),
  );
  // نقداً عند التسليم: 3 طلبات، 40 د.ل قبل الخصم، خصم 2.5، صافي 37.5، 1 مدفوع / 2 غير مدفوع
  assert.ok(lines.includes("نقداً عند التسليم,3,40.000,2.500,37.500,1,2"), lines.find((l) => l.startsWith("نقداً")));
  // التحويل اليدوي: طلبان بلا خصم — الصافي = القائم
  assert.ok(lines.includes("تحويل يدوي,2,30.000,0.000,30.000,0,2"));
  // الأثقل صافياً أولاً (نقداً 37.5 قبل تحويل 30) — بحث نصي داخل جسم الملف
  // (Array.includes عنصر تام؛ indexOf للمصفوفة كذلك — الترتيب يُفحص في السلسلة)
  const csvBody = csv;
  const reconIdx = csvBody.indexOf("مطابقة المدفوعات (حسب طريقة الدفع)");
  assert.ok(csvBody.indexOf("نقداً عند التسليم,3,") > reconIdx);
  assert.ok(csvBody.indexOf("تحويل يدوي,2,") > csvBody.indexOf("نقداً عند التسليم,3,"));
});

test("P43 SO-2c body: the coupon usage ledger rides the file", () => {
  const csv = buildReportCsv(fixture(), "متجر");
  const lines = csv.split("\r\n");
  assert.ok(lines.includes("أكواد الخصم"));
  assert.ok(lines.includes("الكود,النوع,الاستخدامات,إجمالي الخصم (د.ل)"));
  assert.ok(lines.includes("SAVE10,نسبة مئوية,2,2.500"));
  assert.ok(lines.includes("FREESHIP,توصيل مجاني,1,2.000"));
  // الأكبر إنفاقاً أولاً — بحث نصي داخل جسم الملف (عناصر المصفوفة تامة)
  assert.ok(csv.indexOf("SAVE10,") < csv.indexOf("FREESHIP,"));
});

test("P43 SO-2c body: the per-order reconciliation log — discount, couponCode and paymentReference columns", () => {
  const d = fixture();
  const orders = [
    {
      orderNumber: "SO-20260130-0001",
      createdAt: new Date("2026-01-30T14:00:00Z"), // 16:00 طرابلس → نفس اليوم
      paymentMethodName: "تحويل يدوي",
      paymentType: "MANUAL",
      subtotal: 30_000,
      deliveryFee: 0,
      discount: 2_500,
      couponCode: "SAVE10",
      paymentReference: "TRX-9F3A2C",
      paymentStatus: "UNPAID",
      total: 27_500,
    },
    {
      orderNumber: "SO-20260129-0007",
      createdAt: new Date("2026-01-30T01:00:00Z"), // 03:00 طرابلس من 30/1 → يوم طرابلس 2026-01-30
      paymentMethodName: null,
      paymentType: null,
      subtotal: 15_000,
      deliveryFee: 2_000,
      discount: 0,
      couponCode: null,
      paymentReference: null,
      paymentStatus: "PAID",
      total: 17_000,
    },
  ];
  const csv = buildReportCsv(d, "متجر", orders);
  const lines = csv.split("\r\n");
  assert.ok(lines.includes("الطلبات (سجل المطابقة)"));
  assert.ok(
    lines.includes(
      "رقم الطلب,التاريخ,طريقة الدفع,المجموع الفرعي (د.ل),التوصيل (د.ل),الخصم (د.ل),كود الخصم,مرجع التحويل,حالة الدفع,الإجمالي (د.ل)",
    ),
  );
  assert.ok(
    lines.includes("SO-20260130-0001,2026-01-30,تحويل يدوي,30.000,0.000,2.500,SAVE10,TRX-9F3A2C,غير مدفوع,27.500"),
  );
  // لا طريقة دفع → «غير محدد»؛ الخصم صفر والمرجع فارغ لا يرسمان أعمدة فارغة كاذبة
  assert.ok(lines.includes("SO-20260129-0007,2026-01-30,غير محدد,15.000,2.000,0.000,,,مدفوع,17.000"));
  // مرجع يبدأ بشرطة يركب حاجز صيغ Excel (csvCell) — لا صيغة تُنفَّذ عند الفتح
  const dashRef = buildReportCsv(
    d,
    "متجر",
    [{ ...orders[0], orderNumber: "SO-X", paymentReference: "-9F3A" }],
  );
  assert.ok(dashRef.includes(",'-9F3A,"));
});

test("P43 SO-2c body: the orders worksheet is absent when the export passes no rows (aggregate-only callers keep the family shape)", () => {
  const csv = buildReportCsv(fixture(), "متجر");
  assert.ok(!csv.includes("سجل المطابقة"));
  assert.ok(!csv.includes("مرجع التحويل"));
  const empty = buildReportCsv(fixture(), "متجر", []);
  assert.ok(!empty.includes("سجل المطابقة"));
});

/** Minimal two-day fixture matching the API response shape (the same
 *  contract /api/dashboard/reports answers with). */
function fixture(): ReportsData {
  return {
    window: { days: 30, fromDay: "2026-01-01", toDay: "2026-01-30" },
    totals: {
      orders: 6,
      revenue: 70000,
      avgOrder: 11666,
      delivery: { orders: 4, revenue: 50000 },
      pickup: { orders: 2, revenue: 20000 },
    },
    series: [
      { day: "29/1", date: "2026-01-29", revenue: 30000, orders: 2 },
      { day: "30/1", date: "2026-01-30", revenue: 40000, orders: 4 },
    ],
    topProducts: [
      { productName: "بيتزا مارغريتا", units: 3, revenue: 30000, orderCount: 2 },
      { productName: "برجر لحم كلاسيك", units: 2, revenue: 40000, orderCount: 4 },
    ],
    /* P43 SO-2c: جدولا المطابقة — نفس قاعدة الاستبعاد، الدفتر الواحد
     * (قائم − خصم = صافي) لكل طريقة ولكل كود. */
    paymentMethods: [
      { name: "نقداً عند التسليم", type: "CASH", orders: 3, gross: 40_000, discount: 2_500, net: 37_500, paid: 1, unpaid: 2 },
      { name: "تحويل يدوي", type: "MANUAL", orders: 2, gross: 30_000, discount: 0, net: 30_000, paid: 0, unpaid: 2 },
    ],
    coupons: [
      { code: "SAVE10", type: "نسبة مئوية", uses: 2, discount: 2_500 },
      { code: "FREESHIP", type: "توصيل مجاني", uses: 1, discount: 2_000 },
    ],
  };
}
