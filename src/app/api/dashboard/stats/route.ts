// Dashboard overview — "what needs my attention right now?"

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireBusiness, requirePermission } from "@/lib/auth";
import { ok, handleError } from "@/lib/api";
import { tripoliDayStart, tripoliMonthStart, tripoliDateParts } from "@/lib/arabic";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const member = await requireBusiness(user, url.searchParams.get("businessId"));
    requirePermission(member, "orders.read");
    const businessId = member.businessId;

    /* r136: حد اليوم والشهر بوقت طرابلس — كان منتصف الليل بتوقيت الخادم
     * (UTC على Vercel = 02:00 ليبيا) فتتصفر «إيرادات اليوم/الشهر» متأخرة ساعتين. */
    const dayStart = tripoliDayStart();
    const monthStart = tripoliMonthStart();

    const [
      todayOrders,
      pendingCount,
      monthOrders,
      planInfo,
      todayCompleted,
      todayCancelled,
      todayRevenueAgg,
      newCustomersToday,
      recentOrders,
      lowStock,
      productCount,
      categoryCount,
      zoneCount,
    ] = await Promise.all([
      db.order.count({ where: { businessId, createdAt: { gte: dayStart } } }),
      db.order.count({ where: { businessId, status: { in: ["NEW", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"] } } }),
      db.order.count({ where: { businessId, status: { notIn: ["CANCELLED", "REJECTED"] }, createdAt: { gte: monthStart } } }),
      db.business.findUnique({
        where: { id: businessId },
        select: {
          plan: {
            select: { name: true, nameAr: true, price: true, maxProducts: true, maxOrders: true },
          },
        },
      }),
      db.order.count({ where: { businessId, status: "DELIVERED", createdAt: { gte: dayStart } } }),
      db.order.count({ where: { businessId, status: { in: ["CANCELLED", "REJECTED"] }, createdAt: { gte: dayStart } } }),
      db.order.aggregate({
        where: { businessId, status: "DELIVERED", createdAt: { gte: dayStart } },
        _sum: { total: true },
      }),
      db.customer.count({ where: { businessId, createdAt: { gte: dayStart } } }),
      db.order.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true, orderNumber: true, status: true, total: true, fulfillmentType: true,
          customerName: true, customerPhone: true, createdAt: true, paymentStatus: true,
        },
      }),
      db.product.findMany({
        where: { businessId, trackInventory: true, isArchived: false, isAvailable: true, stockQuantity: { lte: 5 } },
        select: { id: true, name: true, stockQuantity: true },
        take: 10,
      }),
      db.product.count({ where: { businessId, isArchived: false } }),
      db.category.count({ where: { businessId, isArchived: false } }),
      db.deliveryZone.count({ where: { businessId, isActive: true } }),
    ]);

    const todayRevenue = todayRevenueAgg._sum.total ?? 0;
    const avgOrder = todayCompleted > 0 ? Math.round(todayRevenue / todayCompleted) : 0;

    // last 7 days for the mini chart
    /* r134 (W2 #11): the series used to fetch EVERY delivered order row
       in the window (unbounded row count) and bucket in JS; the
       bucketing now happens in the DB as ONE grouped query. Prisma
       groupBy can't truncate a DateTime to a calendar day (it would
       group by exact timestamp), so $queryRaw + the dialect's date
       function — SQLite dev (DATABASE_URL file:, strftime) vs
       PostgreSQL prod (to_char), discriminated by the .env.example
       contract. Response shape is IDENTICAL: zero-filled
       {day: "d/m", revenue, orders}, oldest → newest.
       (r138 — تسرب منطقة الخادم): كلا الطرفين كان يقصّ اليوم بتوقيت
       الخادم — strftime/to_char على UTC الخام، والمفاتيح بقراءات
       getFullYear/getDate المحلية — فكانت دلو الرسم البياني تتبدل
       02:00 طرابلس على Vercel (نفس صنف خطأ r136 للأرقام والإيراد).
       الحد الآن بتوقيت طرابلس في الطرفين: SQL بإزاحة +2h الثابتة
       (بلا توقيت صيفي منذ 2013 — نفس حكم TRIPOLI_OFFSET_MS)، والمفاتيح
       عبر tripoliDateParts (درزة r136 المعتمدة). */
    const weekStart = new Date(dayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
    const isSqlite = (process.env.DATABASE_URL ?? "").startsWith("file:");
    const weekRows = isSqlite
      ? await db.$queryRaw<
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
            AND "status" = 'DELIVERED'
            AND "createdAt" >= ${weekStart}
          GROUP BY 1`
      : await db.$queryRaw<
          Array<{ day: string; revenue: number | bigint; orders: number | bigint }>
        >`
          /* (r138) interval '2 hours' = إزاحة طرابلس الثابتة قبل قصّ اليوم
             (العمود timestamp بلا منطقة — Prisma يخزن UTC) */
          SELECT to_char("createdAt" + interval '2 hours', 'YYYY-MM-DD') AS day,
                 COALESCE(SUM("total"), 0)::int AS revenue,
                 COUNT(*)::int AS orders
          FROM "Order"
          WHERE "businessId" = ${businessId}
            AND "status" = 'DELIVERED'
            AND "createdAt" >= ${weekStart}
          GROUP BY 1`;
    const weekMap = new Map(
      weekRows.map((r) => [r.day, { revenue: Number(r.revenue), orders: Number(r.orders) }]),
    );
    const weekSeries: Array<{ day: string; revenue: number; orders: number }> = [];
    for (let i = 6; i >= 0; i--) {
      // (r138) المفتاح والتسمية عبر tripoliDateParts — لا قراءات محلية
      const { y, m, d: dd } = tripoliDateParts(new Date(dayStart.getTime() - i * 24 * 60 * 60 * 1000));
      const key = `${y}-${String(m).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
      const bucket = weekMap.get(key);
      weekSeries.push({
        day: `${dd}/${m}`,
        revenue: bucket?.revenue ?? 0,
        orders: bucket?.orders ?? 0,
      });
    }

    return ok({
      plan: planInfo?.plan ?? null,
      monthOrders,
      stats: {
        todayOrders,
        pendingCount,
        todayCompleted,
        todayCancelled,
        todayRevenue,
        newCustomersToday,
        avgOrder,
        productCount,
        categoryCount,
        zoneCount,
      },
      recentOrders,
      lowStock,
      weekSeries,
    });
  } catch (err) {
    return handleError(err);
  }
}
