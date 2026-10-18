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
      customerConfirmedAt: true,
      customerName: true, city: true, area: true, createdAt: true,
      items: { select: { productName: true, variantName: true, quantity: true, lineTotal: true, optionsJson: true } },
      /* P18-W2-d (W1-d priority #1 — UC «every leg of the journey»): the
         FULL machine log ships to the client — each completed route node
         renders its REAL timestamp from this history (mono fact voice,
         poll-refreshed). Still the honest source, no new writer, no
         fabricated legs: rows exist exactly when the order-machine logged
         a transition. The P6-2-f3 DELIVERED stamp date is derived from
         the same rows (the first row where toStatus === "DELIVERED"). */
      history: { orderBy: { createdAt: "asc" }, select: { toStatus: true, createdAt: true } },
      business: { select: { name: true, slug: true, phone: true, whatsappNumber: true, logoUrl: true } },
    },
  });
  if (!order) notFound();

  /* P6-2-f3 (GROUP 2): the DELIVERED stamp's date — first history row
     where toStatus: "DELIVERED" (the moment the machine logged it);
     absent → null → the stamp renders without the date line, never a
     fabricated one. */
  const deliveredAt =
    order.history.find((h) => h.toStatus === "DELIVERED")?.createdAt.toISOString() ?? null;

  return (
    <TrackingClient
      placed={placed === "1"}
      deliveredAt={deliveredAt}
      /* W6-B7: the token rides down as a prop so the confirm POST hits
         the exact token the page rendered (the poll still derives it
         from the URL — both are the same unguessable credential). */
      confirmToken={token}
      customerConfirmedAt={order.customerConfirmedAt ? order.customerConfirmedAt.toISOString() : null}
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
        statusHistory: order.history.map((h) => ({
          toStatus: h.toStatus,
          createdAt: h.createdAt.toISOString(),
        })),
        business: order.business,
      }}
    />
  );
}
