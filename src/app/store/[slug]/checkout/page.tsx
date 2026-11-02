import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { CheckoutClient } from "@/components/storefront/checkout-client";

export const dynamic = "force-dynamic";

/* P42-W7 (§7.4 — the P40 door family's missing member): checkout said
 * noindex,nofollow with NO canonical, so every /store/{slug}/checkout
 * URL inherited the root layout's canonical "/" — the same triple
 * contradiction P40 fixed on /track, /login and /register (robots.txt
 * Disallows it, the page refuses indexing, yet the canonical pointed
 * at the homepage). It now speaks the door doctrine itself:
 * noindex,follow + SELF-canonical. The slug rides the URL (no DB read
 * — metadata must not grow a query on a noindex route). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: "إتمام الطلب",
    description: "أكمل بيانات طلبك — عنوان التوصيل أو الاستلام وطريقة الدفع.",
    robots: { index: false, follow: true },
    alternates: { canonical: `/store/${slug}/checkout` },
  };
}

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
