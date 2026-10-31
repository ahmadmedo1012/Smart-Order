// W7-D — the reports aggregation, extracted from /api/dashboard/reports
// so the new export route (/api/dashboard/reports/export) serves the
// SAME numbers the page shows — one accounting, one rule, two gated
// consumers (the W6-B4 route body moved verbatim; its dialect contracts
// and comments ride along unchanged).

import { db } from "@/lib/db";
import { tripoliDayStart, tripoliDateParts } from "@/lib/arabic";
import { ORDER_STATUSES } from "@/lib/constants";
import type { ReportsData } from "@/lib/report-csv";

export type ReportsWindowDays = 30 | 90;

/* ── P36 Phase C (C4) — the windowed summary for the mobile merchant app ──
 *
 * The web reports surface offers the two catalogued 30/90 windows; the
 * native app's reports screen asks the owner's ad-hoc question — «how did
 * I do between these two dates?» — plus the status distribution the web
 * surface doesn't ship (the stats route's statusCounts are all-time, not
 * windowed). The aggregation lives HERE (the W7-D extraction seam) so the
 * route is a thin authz+validation shell and the accounting stays single-
 * sourced:
 *   · revenue/orders: the reports exclusion convention verbatim —
 *     CANCELLED/REJECTED never count (getReportData's rule, one sentence);
 *   · statusCounts: the DISTRIBUTION — every status counts, terminals
 *     included, because «how many got cancelled» is the question being
 *     asked (the inbox tab badges' windowed twin);
 *   · series/avgOrder: the same zero-filled day buckets + Math.round AOV
 *     recipe, Tripoli-day boundaries as everywhere (r136/r138).
 * Window math: callers pass calendar days (YYYY-MM-DD); the Tripoli
 * midnight instants come from the fixed +02:00 offset (no DST since 2013
 * — the TRIPOLI_OFFSET_MS law), so `from`'s midnight + k×24h walks the
 * calendar days exactly. */

/** Tripoli midnight (UTC instant) of a YYYY-MM-DD calendar day. */
export function tripoliDayInstant(day: string): number {
  return Date.parse(`${day}T00:00:00+02:00`);
}

export interface ReportSummaryData {
  window: { from: string; to: string; days: number };
  totals: { orders: number; revenue: number; avgOrder: number };
  /** All 8 statuses zero-filled — the full distribution, terminals included. */
  statusCounts: Record<string, number>;
  series: Array<{ day: string; date: string; revenue: number; orders: number }>;
}

/** The C4 mobile summary over an arbitrary (validated, bounded) window.
 * Caller owns auth/permission/plan-gate order and the from≤to/span/future
 * validation — refusals never pay the aggregation cost. */
export async function getReportSummary(
  businessId: string,
  fromDay: string,
  toDay: string,
): Promise<ReportSummaryData> {
  const fromMs = tripoliDayInstant(fromDay);
  const toMsExclusive = tripoliDayInstant(toDay) + 24 * 60 * 60 * 1000;
  const days = Math.round((toMsExclusive - fromMs) / (24 * 60 * 60 * 1000));
  const from = new Date(fromMs);
  const to = new Date(toMsExclusive);

  const [dayRows, statusRows] = await Promise.all([
    /* The getReportData dialect-split day bucket verbatim (r134/r138):
       $queryRaw + the dialect's date function, pre-shifted by the fixed
       +2h Tripoli offset, bounded by the caller's window [from, to). */
    process.env.DATABASE_URL?.startsWith("file:")
      ? db.$queryRaw<
          Array<{ day: string; revenue: number | bigint; orders: number | bigint }>
        >`
          /* Prisma stores SQLite DateTime as epoch-ms INTEGER — divide to
             unix seconds, then the 'unixepoch' modifier (a bare integer
             would be read as a Julian day and strftime would return NULL).
             (r138) +7200s = إزاحة طرابلس الثابتة قبل قصّ اليوم */
          SELECT strftime('%Y-%m-%d', "createdAt"/1000 + 7200, 'unixepoch') AS day,
                 COALESCE(SUM("total"), 0) AS revenue,
                 COUNT(*) AS orders
          FROM "Order"
          WHERE "businessId" = ${businessId}
            AND "status" NOT IN ('CANCELLED', 'REJECTED')
            AND "createdAt" >= ${from}
            AND "createdAt" < ${to}
          GROUP BY 1`
      : db.$queryRaw<
          Array<{ day: string; revenue: number | bigint; orders: number | bigint }>
        >`
          /* (r138) interval '2 hours' = إزاحة طرابلس الثابتة قبل قصّ اليوم
             (العمود timestamp بلا منطقة — Prisma يخزن UTC) */
          SELECT to_char("createdAt" + interval '2 hours', 'YYYY-MM-DD') AS day,
                 COALESCE(SUM("total"), 0)::int AS revenue,
                 COUNT(*)::int AS orders
          FROM "Order"
          WHERE "businessId" = ${businessId}
            AND "status" NOT IN ('CANCELLED', 'REJECTED')
            AND "createdAt" >= ${from}
            AND "createdAt" < ${to}
          GROUP BY 1`,
    /* The windowed distribution — ALL statuses (model-level groupBy,
       dialect-safe). This is deliberately NOT the exclusion convention:
       cancelled/rejected counts are the signal the screen shows. */
    db.order.groupBy({
      by: ["status"],
      where: { businessId, createdAt: { gte: from, lt: to } },
      _count: { _all: true },
    }),
  ]);

  const dayMap = new Map(
    dayRows.map((r) => [r.day, { revenue: Number(r.revenue), orders: Number(r.orders) }]),
  );
  const series: Array<{ day: string; date: string; revenue: number; orders: number }> = [];
  for (let i = 0; i < days; i++) {
    // from's midnight + k×24h stays on Tripoli midnights (fixed offset) —
    // the keys walk the requested calendar days exactly
    const { y, m, d: dd } = tripoliDateParts(new Date(fromMs + i * 24 * 60 * 60 * 1000));
    const key = `${y}-${String(m).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    const bucket = dayMap.get(key);
    series.push({
      day: `${dd}/${m}`,
      date: key,
      revenue: bucket?.revenue ?? 0,
      orders: bucket?.orders ?? 0,
    });
  }

  // totals ride the series (one accounting, one rule — the grouped rows
  // sum to the window aggregate exactly; avgOrder = Math.round millimes)
  const orders = series.reduce((s, d) => s + d.orders, 0);
  const revenue = series.reduce((s, d) => s + d.revenue, 0);
  const avgOrder = orders > 0 ? Math.round(revenue / orders) : 0;

  const statusCounts: Record<string, number> = {};
  for (const s of ORDER_STATUSES) statusCounts[s] = 0;
  for (const row of statusRows) statusCounts[row.status] = row._count._all;

  return {
    window: { from: fromDay, to: toDay, days },
    totals: { orders, revenue, avgOrder },
    statusCounts,
    series,
  };
}

/** The W6-B4 aggregation — window math + the three aggregates + the
 *  zero-filled series + totals. Caller owns auth/permission/plan-gate
 *  order (both routes gate BEFORE calling this: below-tier refusals
 *  never pay the aggregation cost). */
export async function getReportData(
  businessId: string,
  days: ReportsWindowDays,
): Promise<ReportsData> {
  /* r136 family policy: كل حدود الأيام بتوقيت طرابلس. The window starts
     at the Tripoli midnight of the OLDEST covered day (today − days−1),
     so every series bucket is a full Tripoli calendar day. */
  const dayStart = tripoliDayStart();
  const from = new Date(dayStart.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const { y: toY, m: toM, d: toD } = tripoliDateParts();
  const toDay = `${toY}-${String(toM).padStart(2, "0")}-${String(toD).padStart(2, "0")}`;
  const { y: fromY, m: fromM, d: fromD } = tripoliDateParts(from);
  const fromDay = `${fromY}-${String(fromM).padStart(2, "0")}-${String(fromD).padStart(2, "0")}`;

  /* ── Exclusion convention (the family's accounting rule) ──
     CANCELLED/REJECTED never count — the EXACT accounting the plan-gate
     month-order count uses (public/orders/route.ts W2-D2: «طلبات الشهر»
     = Tripoli month, status notIn [CANCELLED, REJECTED] — the badge and
     the gate are one number) and the stats route's monthOrders twin.
     This intentionally differs from the stats route's DELIVERED-only
     «إيراد اليوم» (the ops pulse counts banked money only); a business
     REPORT over 30/90 days that dropped every in-flight/preparing order
     would understate the trend the owner is asking about. One rule per
     surface, both documented. */
  const [dayRows, fulfillment, topRows] = await Promise.all([
    /* Day-bucketing is the stats route's dialect-discriminated raw query
       verbatim (r134/r138): Prisma groupBy can't truncate a DateTime to
       a calendar day, so $queryRaw + the dialect's date function —
       SQLite dev (DATABASE_URL file:, epoch-ms/1000 → 'unixepoch') vs
       PostgreSQL prod (to_char), BOTH pre-shifted by the fixed +2h
       Tripoli offset (no DST since 2013), keyed via tripoliDateParts —
       never local getters. Response shape identical in both dialects:
       zero-filled {day, revenue, orders}, oldest → newest. */
    process.env.DATABASE_URL?.startsWith("file:")
      ? db.$queryRaw<
          Array<{ day: string; revenue: number | bigint; orders: number | bigint }>
        >`
          /* Prisma stores SQLite DateTime as epoch-ms INTEGER — divide to
             unix seconds, then the 'unixepoch' modifier (a bare integer
             would be read as a Julian day and strftime would return NULL).
             (r138) +7200s = إزاحة طرابلس الثابتة قبل قصّ اليوم */
          SELECT strftime('%Y-%m-%d', "createdAt"/1000 + 7200, 'unixepoch') AS day,
                 COALESCE(SUM("total"), 0) AS revenue,
                 COUNT(*) AS orders
          FROM "Order"
          WHERE "businessId" = ${businessId}
            AND "status" NOT IN ('CANCELLED', 'REJECTED')
            AND "createdAt" >= ${from}
          GROUP BY 1`
      : db.$queryRaw<
          Array<{ day: string; revenue: number | bigint; orders: number | bigint }>
        >`
          /* (r138) interval '2 hours' = إزاحة طرابلس الثابتة قبل قصّ اليوم
             (العمود timestamp بلا منطقة — Prisma يخزن UTC) */
          SELECT to_char("createdAt" + interval '2 hours', 'YYYY-MM-DD') AS day,
                 COALESCE(SUM("total"), 0)::int AS revenue,
                 COUNT(*)::int AS orders
          FROM "Order"
          WHERE "businessId" = ${businessId}
            AND "status" NOT IN ('CANCELLED', 'REJECTED')
            AND "createdAt" >= ${from}
          GROUP BY 1`,
    /* Delivery vs pickup split — model-level groupBy (dialect-safe via
       Prisma), same exclusion + window. */
    db.order.groupBy({
      by: ["fulfillmentType"],
      where: {
        businessId,
        status: { notIn: ["CANCELLED", "REJECTED"] },
        createdAt: { gte: from },
      },
      _count: { _all: true },
      _sum: { total: true },
    }),
    /* Top products by units + revenue — server-side aggregation over the
       OrderItem snapshots (money NEVER travels from the client). Standard
       SQL JOIN, no date functions → one query for BOTH dialects; PG's
       bigint sums arrive as BigInt and are Number()-coerced exactly like
       the stats route's raw rows. productName is the order-time snapshot
       (the family's display truth for a sold line), grouped as sold. */
    db.$queryRaw<
      Array<{
        productName: string;
        units: number | bigint;
        revenue: number | bigint;
        orderCount: number | bigint;
      }>
    >`
      SELECT oi."productName" AS "productName",
             SUM(oi."quantity") AS "units",
             SUM(oi."lineTotal") AS "revenue",
             COUNT(DISTINCT oi."orderId") AS "orderCount"
      FROM "OrderItem" oi
      JOIN "Order" o ON o."id" = oi."orderId"
      WHERE o."businessId" = ${businessId}
        AND o."status" NOT IN ('CANCELLED', 'REJECTED')
        AND o."createdAt" >= ${from}
      GROUP BY oi."productName"
      ORDER BY "revenue" DESC
      LIMIT 10`,
  ]);

  const dayMap = new Map(
    dayRows.map((r) => [r.day, { revenue: Number(r.revenue), orders: Number(r.orders) }]),
  );
  const series: Array<{ day: string; date: string; revenue: number; orders: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    // (r138) المفتاح والتسمية عبر tripoliDateParts — لا قراءات محلية
    const { y, m, d: dd } = tripoliDateParts(new Date(dayStart.getTime() - i * 24 * 60 * 60 * 1000));
    const key = `${y}-${String(m).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    const bucket = dayMap.get(key);
    series.push({
      day: `${dd}/${m}`,
      date: key,
      revenue: bucket?.revenue ?? 0,
      orders: bucket?.orders ?? 0,
    });
  }

  // totals ride the same series (one accounting, one rule — the grouped
  // rows sum to the window aggregate exactly)
  const orders = series.reduce((s, d) => s + d.orders, 0);
  const revenue = series.reduce((s, d) => s + d.revenue, 0);
  const avgOrder = orders > 0 ? Math.round(revenue / orders) : 0;
  const split = (type: "DELIVERY" | "PICKUP") => {
    const row = fulfillment.find((f) => f.fulfillmentType === type);
    return { orders: row?._count._all ?? 0, revenue: row?._sum.total ?? 0 };
  };

  return {
    window: { days, fromDay, toDay },
    totals: {
      orders,
      revenue,
      avgOrder,
      delivery: split("DELIVERY"),
      pickup: split("PICKUP"),
    },
    series,
    topProducts: topRows.map((r) => ({
      productName: r.productName,
      units: Number(r.units),
      revenue: Number(r.revenue),
      orderCount: Number(r.orderCount),
    })),
  };
}
