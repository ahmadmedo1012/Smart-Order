// Public order tracking by unguessable token. Customer sees a safe subset only.

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, handleError } from "@/lib/api";

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
        /* P43 SO-2/SO-3: الخصم والكود المطبق يركبان إيصال الزبون (نفس
         * دفتر رسالة الواتساب) — لقطة نصية من الصف المُلتزم. */
        discount: true,
        couponCode: true,
        paymentStatus: true,
        paymentMethodName: true,
        /* W6-B7: the customer-confirmation stamp ships to the tracking
           page so the success state («تم تأكيد طلبك ✓») is durable —
           SSR + poll both carry it; a null stamp is the honest "not
           confirmed yet" (the button renders exactly then). */
        customerConfirmedAt: true,
        customerName: true,
        city: true,
        area: true,
        createdAt: true,
        items: {
          select: {
            productName: true, variantName: true, quantity: true, lineTotal: true,
            /* P43 SO-3 (إعادة الطلب): the cart-rebuild keys ride the
               item payload — additive, read-only; a deleted product
               reads null and the reorder button skips it honestly. */
            productId: true, variantId: true, note: true,
            optionsJson: true,
          },
        },
        history: {
          orderBy: { createdAt: "asc" },
          /* (phase4) الخصوصية: ملاحظات المشغّل الداخلية (سبب الرفض، «نفدت
             المكونات»…) لا تُشحن للعامة — حامل التوكن الوحيد صاحب الرابط.
             الواجهة لم ترسمها أصلًا؛ كان الـAPI يشحنها بلا داعٍ. */
          select: { toStatus: true, createdAt: true },
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
        discount: order.discount,
        couponCode: order.couponCode,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethodName,
        customerConfirmedAt: order.customerConfirmedAt ? order.customerConfirmedAt.toISOString() : null,
        customerName: order.customerName,
        city: order.city,
        area: order.area,
        createdAt: order.createdAt,
        items: order.items.map((i) => {
          /* the additive reorder keys: the option snapshot lines carry
             {id?, name, priceDelta} (id rides P43-SO3+ orders; the old
             snapshot shape has names only — optionLines then answers
             id:null and the reorder drops options with its honest note) */
          const snap = i.optionsJson
            ? (JSON.parse(i.optionsJson) as Array<{ id?: string; name: string; priceDelta: number }>)
            : [];
          return {
            productName: i.productName,
            variantName: i.variantName,
            quantity: i.quantity,
            lineTotal: i.lineTotal,
            note: i.note,
            productId: i.productId,
            variantId: i.variantId,
            options: snap.map((o) => o.name),
            optionLines: snap.map((o) => ({ id: o.id ?? null, name: o.name, priceDelta: o.priceDelta })),
          };
        }),
        history: order.history,
        business: order.business,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
