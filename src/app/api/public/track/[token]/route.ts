// Public order tracking by unguessable token. Customer sees a safe subset only.

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, handleError } from "@/lib/api";
import { formatLyd } from "@/lib/money";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    if (!/^[0-9a-f-]{16,64}$/i.test(token)) return fail("رابط التتبع غير صحيح", 400);

    const order = await db.order.findUnique({
      where: { publicToken: token },
      select: {
        orderNumber: true,
        status: true,
        fulfillmentType: true,
        total: true,
        subtotal: true,
        deliveryFee: true,
        paymentStatus: true,
        paymentMethodName: true,
        customerName: true,
        city: true,
        area: true,
        createdAt: true,
        items: {
          select: {
            productName: true, variantName: true, quantity: true, lineTotal: true,
            optionsJson: true,
          },
        },
        history: {
          orderBy: { createdAt: "asc" },
          select: { toStatus: true, note: true, createdAt: true },
        },
        business: {
          select: { name: true, slug: true, phone: true, whatsappNumber: true, logoUrl: true },
        },
      },
    });
    if (!order) return fail("الطلب غير موجود", 404, "NOT_FOUND");

    return ok({
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        fulfillmentType: order.fulfillmentType,
        total: order.total,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethodName,
        customerName: order.customerName,
        city: order.city,
        area: order.area,
        createdAt: order.createdAt,
        items: order.items.map((i) => ({
          productName: i.productName,
          variantName: i.variantName,
          quantity: i.quantity,
          lineTotal: i.lineTotal,
          options: i.optionsJson ? (JSON.parse(i.optionsJson) as Array<{ name: string }>).map((o) => o.name) : [],
        })),
        history: order.history,
        business: order.business,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
