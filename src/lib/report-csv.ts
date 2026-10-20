// W7-D — the reports CSV seam, extracted from the reports page for ONE
// honest reason: the export is now a SERVER surface
// (/api/dashboard/reports/export, gated at احترافي+ — the Smart-Menu
// W6-A3#5→W7-B family move: a client-side "export" built from fetched
// data has no seam a gate can refuse; the one-tap artifact becomes a
// real route and the gate lives on it). The W6-B4 body contract and the
// W6-B8 formula-injection guard move here VERBATIM — one builder, one
// guard, both consumers (the export route) and the unit suite.
//
// Pure module (money + tripoli date seams only) — node --test reads it
// bare; no client component imports it anymore (the page links to the
// export route, it no longer builds the CSV). The imports are the tests'
// own r137 style (explicit relative .ts specifiers) so type-stripping
// node can resolve them without a bundler/paths runtime.
import { formatLydAmount } from "./money.ts";
import { tripoliDateParts } from "./arabic.ts";

/** The reports API response shape — the one contract shared by
 *  /api/dashboard/reports, the export route, and the page. */
export interface ReportsData {
  window: { days: number; fromDay: string; toDay: string };
  totals: {
    orders: number;
    revenue: number;
    avgOrder: number;
    delivery: { orders: number; revenue: number };
    pickup: { orders: number; revenue: number };
  };
  series: Array<{ day: string; date: string; revenue: number; orders: number }>;
  topProducts: Array<{
    productName: string;
    units: number;
    revenue: number;
    orderCount: number;
  }>;
}

/* CSV cell escaping — quote only when the value can break the row
   (comma / quote / newline); inner quotes double. */
/* W6-B8 (independent review): CSV formula-injection guard — the same law
   Smart-Menu's orders export shipped this wave (f835be98): a cell starting
   with = + - @ executes as a formula when the owner opens the export in
   Excel/LibreOffice. Product names and the store name are staff-editable
   (a malicious editor injects, the owner executes) — neutralize the prefix
   with a leading apostrophe (Excel keeps the text after it verbatim). */
export function csvCell(v: string | number): string {
  const s = String(v);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** The export body — revenue-per-day rows + top-products rows, plus the
 *  honest header (store / window / the exclusion rule). Money rides
 *  formatLydAmount (raw 3-decimal) so Excel parses it as a number.
 *  (W6-B4's builder, byte-identical.) */
export function buildReportCsv(d: ReportsData, businessName: string): string {
  const rows: string[] = [];
  rows.push("سمارت أوردر — تقرير الأداء");
  rows.push(`المتجر,${csvCell(businessName)}`);
  rows.push(
    `النافذة,آخر ${d.window.days} يوماً (من ${d.window.fromDay} إلى ${d.window.toDay})`,
  );
  rows.push(`الطلبات,${d.totals.orders} (بلا الملغي والمرفوض)`);
  rows.push(`الإيراد (د.ل),${formatLydAmount(d.totals.revenue)}`);
  rows.push(`متوسط قيمة الطلب (د.ل),${formatLydAmount(d.totals.avgOrder)}`);
  rows.push(
    `توصيل,${d.totals.delivery.orders} طلب · ${formatLydAmount(d.totals.delivery.revenue)} د.ل`,
  );
  rows.push(
    `استلام من الفرع,${d.totals.pickup.orders} طلب · ${formatLydAmount(d.totals.pickup.revenue)} د.ل`,
  );
  rows.push("");
  rows.push("الإيراد اليومي");
  rows.push("اليوم,عدد الطلبات,الإيراد (د.ل)");
  for (const s of d.series) {
    rows.push(`${s.date},${s.orders},${formatLydAmount(s.revenue)}`);
  }
  rows.push("");
  rows.push("أفضل المنتجات");
  rows.push("الترتيب,المنتج,الوحدات,عدد الطلبات,الإيراد (د.ل)");
  d.topProducts.forEach((p, i) => {
    rows.push(
      `${i + 1},${csvCell(p.productName)},${p.units},${p.orderCount},${formatLydAmount(p.revenue)}`,
    );
  });
  return rows.join("\r\n");
}

/** The honest W6-B4 filename — product + store slug + window + the
 *  Tripoli date stamp. ONE source for the export route's
 *  Content-Disposition and the client's a.download (they can never
 *  disagree). */
export function reportCsvFileName(slug: string, days: number): string {
  const { y, m, d: dd } = tripoliDateParts();
  const stamp = `${y}${String(m).padStart(2, "0")}${String(dd).padStart(2, "0")}`;
  return `smart-order-report-${slug}-${days}d-${stamp}.csv`;
}
