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
  };
}
