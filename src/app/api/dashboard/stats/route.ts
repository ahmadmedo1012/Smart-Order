// Dashboard overview — "what needs my attention right now?"

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireBusiness, requirePermission } from "@/lib/auth";
import { ok, handleError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const member = await requireBusiness(user, url.searchParams.get("businessId"));
    requirePermission(member, "orders.read");
    const businessId = member.businessId;

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

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
    const weekStart = new Date(dayStart);
    weekStart.setDate(weekStart.getDate() - 6);
    const weekOrders = await db.order.findMany({
      where: { businessId, createdAt: { gte: weekStart }, status: "DELIVERED" },
      select: { total: true, createdAt: true },
    });
    const weekSeries: Array<{ day: string; revenue: number; orders: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(dayStart);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const dayOrders = weekOrders.filter((o) => o.createdAt >= d && o.createdAt < next);
      weekSeries.push({
        day: `${d.getDate()}/${d.getMonth() + 1}`,
        revenue: dayOrders.reduce((s, o) => s + o.total, 0),
        orders: dayOrders.length,
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
