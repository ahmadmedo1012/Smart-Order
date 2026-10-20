// W7-D — the reports aggregation, extracted from /api/dashboard/reports
// so the new export route (/api/dashboard/reports/export) serves the
// SAME numbers the page shows — one accounting, one rule, two gated
// consumers (the W6-B4 route body moved verbatim; its dialect contracts
// and comments ride along unchanged).

import { db } from "@/lib/db";
import { tripoliDayStart, tripoliDateParts } from "@/lib/arabic";
import type { ReportsData } from "@/lib/report-csv";

export type ReportsWindowDays = 30 | 90;

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
