import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { TrackingClient } from "@/components/storefront/tracking-client";
import type { OrderStatus, PaymentStatus } from "@/lib/constants";

export const dynamic = "force-dynamic";

/* 4-c (P15, 3-c audit P2 «track-404 keeps the track title»): the static
 * metadata stamped «تتبع الطلب | سمارت أوردر» on the 404 body too — the
 * store route already had the right law (unavailable → «المتجر غير
 * متاح»); the track route now speaks it too. The order query below is
 * the page's own (a single cheap indexed publicToken lookup; adding
 * React cache() here would duplicate the select shape for zero
 * measurable gain on a noindex route). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  if (!/^[0-9a-f-]{16,64}$/i.test(token)) {
    return { title: "الطلب غير متاح", robots: { index: false, follow: false } };
  }
  const order = await db.order.findUnique({
    where: { publicToken: token },
    select: { orderNumber: true },
  });
  if (!order) {
    return { title: "الطلب غير متاح", robots: { index: false, follow: false } };
  }
  return {
    title: `تتبع الطلب ${order.orderNumber}`,
    robots: { index: false, follow: false },
  };
}

export default async function TrackPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const { token } = await params;
  /* r133 (A1 F9): ?placed=1 rides the redirect from checkout — the
     confirmation is durable in the URL (refresh-safe), not component
     state. */
  const { placed } = await searchParams;
  if (!/^[0-9a-f-]{16,64}$/i.test(token)) notFound();

  const order = await db.order.findUnique({
    where: { publicToken: token },
    select: {
      orderNumber: true, status: true, fulfillmentType: true, total: true, subtotal: true,
      deliveryFee: true, paymentStatus: true, paymentMethodName: true, paymentType: true,
      customerName: true, city: true, area: true, createdAt: true,
      items: { select: { productName: true, variantName: true, quantity: true, lineTotal: true, optionsJson: true } },
      /* P6-2-f3 (GROUP 2): the DELIVERED stamp's date — the honest
         source is the status history (the moment the machine logged
         DELIVERED); read-only additive select, no behavior change. */
      history: { where: { toStatus: "DELIVERED" }, orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      business: { select: { name: true, slug: true, phone: true, whatsappNumber: true, logoUrl: true } },
    },
  });
  if (!order) notFound();

  return (
    <TrackingClient
      placed={placed === "1"}
      deliveredAt={order.history[0]?.createdAt.toISOString() ?? null}
      order={{
        orderNumber: order.orderNumber,
        status: order.status as OrderStatus,
        fulfillmentType: order.fulfillmentType as "DELIVERY" | "PICKUP",
        total: order.total,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        paymentStatus: order.paymentStatus as PaymentStatus,
        paymentMethod: order.paymentMethodName,
        customerName: order.customerName,
        city: order.city,
        area: order.area,
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((i) => ({
          productName: i.productName,
          variantName: i.variantName,
          quantity: i.quantity,
          lineTotal: i.lineTotal,
          options: i.optionsJson ? (JSON.parse(i.optionsJson) as Array<{ name: string }>).map((o) => o.name) : [],
        })),
        business: order.business,
      }}
    />
  );
}
