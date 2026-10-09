import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { TrackingClient } from "@/components/storefront/tracking-client";
import type { OrderStatus, PaymentStatus } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تتبع الطلب",
  robots: { index: false, follow: false },
};

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
      business: { select: { name: true, slug: true, phone: true, whatsappNumber: true, logoUrl: true } },
    },
  });
  if (!order) notFound();

  return (
    <TrackingClient
      placed={placed === "1"}
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
