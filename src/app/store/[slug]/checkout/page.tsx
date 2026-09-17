import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { CheckoutClient } from "@/components/storefront/checkout-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "إتمام الطلب",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await db.business.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, isActive: true, isPublished: true, logoUrl: true, whatsappNumber: true },
  });
  if (!business || !business.isActive || !business.isPublished) notFound();

  return (
    <CheckoutClient
      slug={slug}
      business={{ name: business.name, logoUrl: business.logoUrl, whatsappNumber: business.whatsappNumber }}
    />
  );
}
