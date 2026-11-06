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
import { PAYMENT_STATUS_AR } from "./constants.ts";
import {
  formatLegMinutesAr,
  type CouponUsageRow,
  type OpsTimingMetrics,
  type PaymentMethodBreakdownRow,
  type RefundDueRow,
} from "./reports-reconciliation.ts";

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
  /* P43 SO-2c: جدولا المطابقة — نفس القاعدة (لا ملغي ولا مرفوض)،
   * أنقياء من reports-reconciliation.ts. */
  paymentMethods: PaymentMethodBreakdownRow[];
  coupons: CouponUsageRow[];
  /* P45-W1 (المبادرة D): الاسترجاعات المستحقة — طلبات مدفوعة ثم
   * ملغاة/مرفوضة؛ بنّاء واحد (buildRefundDueRows) يغذي الشاشة والملف
   * معاً فلا يعود التزام الاسترجاع غير مرئي على أي سطح. */
  refundDue: RefundDueRow[];
  /* P45-W1 (المبادرة B): مقاييس زمن-في-حالة — متوسط التأكيد
   * ومتوسط الجاهزية من سجل التدقيق (قراءة فقط، الرجل المكتملة
   * فقط). نفس السطر يركب رأس الملف — الشاشة والملف لا يفترقان. */
  opsTiming: OpsTimingMetrics;
}

/** P43 SO-2c — one row of the CSV's reconciliation worksheet (the
 *  per-order log the owner matches against a wallet/bank statement).
 *  getReconciliationOrders() (reports-queries.ts) produces these. */
export interface ReconciliationOrderRow {
  orderNumber: string;
  createdAt: Date;
  paymentMethodName: string | null;
  paymentType: string | null;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  couponCode: string | null;
  paymentReference: string | null;
  paymentStatus: string;
  total: number;
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
 *  (W6-B4's builder, byte-identical.)
 *  P43 SO-2c: the file gains the reconciliation worksheets — the
 *  per-method breakdown, the coupon usage ledger, and (when the export
 *  route passes them) the per-order log with discount / couponCode /
 *  paymentReference columns for statement matching. */
export function buildReportCsv(
  d: ReportsData,
  businessName: string,
  orders?: ReconciliationOrderRow[],
): string {
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
  /* P45-W1 (المبادرة B): سطر زمن العمليات في رأس الملف — نفس الأرقام
   * التي تعرضها البطاقة (null = لا عينات مكتملة، يُعلن لا يُخفى). */
  rows.push(
    `زمن العمليات,متوسط التأكيد ${formatLegMinutesAr(d.opsTiming.avgConfirmMinutes)} (${d.opsTiming.confirmLegs} طلب) · متوسط الجاهزية ${formatLegMinutesAr(d.opsTiming.avgReadyMinutes)} (${d.opsTiming.readyLegs} طلب)`,
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
  /* ── P43 SO-2c: مطابقة المدفوعات — gross − discount = net per method
   * (the one ledger law), paid/unpaid split for the statement match. */
  rows.push("");
  rows.push("مطابقة المدفوعات (حسب طريقة الدفع)");
  rows.push("الطريقة,الطلبات,قبل الخصم (د.ل),الخصم (د.ل),الصافي (د.ل),مدفوع,غير مدفوع");
  for (const m of d.paymentMethods) {
    rows.push(
      [
        csvCell(m.name),
        m.orders,
        formatLydAmount(m.gross),
        formatLydAmount(m.discount),
        formatLydAmount(m.net),
        m.paid,
        m.unpaid,
      ].join(","),
    );
  }
  /* ── P45-W1 (المبادرة D): استرجاعات مستحقة — الوجه المقابل لمطابقة
   * المدفوعات مباشرة: الطلبات المدفوعة ثم الملغاة/المرفوضة مستثناة
   * من جدول الطرق بقاعدة الحساب نفسها، فالتزام الاسترجاع يظهر هنا —
   * من نفس البنّاء الذي يرسم الشاشة (الشاشة والملف لا يفترقان أبداً). */
  rows.push("");
  rows.push("استرجاعات مستحقة");
  rows.push("رقم الطلب,الزبون,طريقة الدفع,المبلغ المسترَد (د.ل),تاريخ الإلغاء");
  for (const r of d.refundDue) {
    rows.push(
      [
        csvCell(r.orderNumber),
        csvCell(r.customerName),
        csvCell(r.methodName),
        formatLydAmount(r.total),
        r.cancelledDay ?? "—",
      ].join(","),
    );
  }
  /* ── P43 SO-2c: أكواد الخصم — the marketing spend the owner granted. */
  rows.push("");
  rows.push("أكواد الخصم");
  rows.push("الكود,النوع,الاستخدامات,إجمالي الخصم (د.ل)");
  for (const c of d.coupons) {
    rows.push(
      [csvCell(c.code), csvCell(c.type), c.uses, formatLydAmount(c.discount)].join(","),
    );
  }
  /* ── P43 SO-2c: سجل المطابقة — the per-order worksheet (only the
   * export route passes it; the on-screen surface stays aggregates).
   * The date is the Tripoli calendar day (tripoliDateParts, r138); a
   * leading-dash reference rides csvCell's formula guard like every
   * other staff-editable cell. */
  if (orders && orders.length > 0) {
    rows.push("");
    rows.push("الطلبات (سجل المطابقة)");
    rows.push(
      "رقم الطلب,التاريخ,طريقة الدفع,المجموع الفرعي (د.ل),التوصيل (د.ل),الخصم (د.ل),كود الخصم,مرجع التحويل,حالة الدفع,الإجمالي (د.ل)",
    );
    for (const o of orders) {
      const { y, m, d: dd } = tripoliDateParts(o.createdAt);
      const day = `${y}-${String(m).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
      rows.push(
        [
          csvCell(o.orderNumber),
          day,
          csvCell(o.paymentMethodName ?? "غير محدد"),
          formatLydAmount(o.subtotal),
          formatLydAmount(o.deliveryFee),
          formatLydAmount(o.discount),
          o.couponCode ? csvCell(o.couponCode) : "",
          o.paymentReference ? csvCell(o.paymentReference) : "",
          csvCell(PAYMENT_STATUS_AR[o.paymentStatus as keyof typeof PAYMENT_STATUS_AR] ?? o.paymentStatus),
          formatLydAmount(o.total),
        ].join(","),
      );
    }
  }
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
