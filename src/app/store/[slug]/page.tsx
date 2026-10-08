import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { db } from "@/lib/db";
import { Storefront } from "@/components/storefront/storefront";
import { SITE_URL } from "@/app/layout";

/* r131-F2 (SO-1, A8 perf): the money page left the force-dynamic path —
 * ISR 60s on the smart-menu twin pattern (menu/[slug]/page.tsx:2-24):
 * revalidate + dynamicParams + generateStaticParams [] (the App Router
 * contract — a dynamic segment WITHOUT generateStaticParams renders
 * dynamically on every request and `revalidate` is silently ignored;
 * returning [] = all paths at runtime, zero DB queries at build, every
 * slug generated on first visit and cached with the 60s revalidation).
 * Product/stock data still streams client-side from the public API —
 * the 60s window only governs the SEO/JSON-LD shell. */
export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

/** Absolute URL helper — DB image refs are same-origin /api/media/*
 * relatives; scrapers and OG crawlers need absolutes. */
function absoluteUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url.startsWith("http") ? url : `${SITE_URL}${url}`;
}

/* r131-F2 (SO-1): React cache() — generateMetadata and StorePage share
 * ONE memoized db.business.findUnique per request (the smart-menu
 * getRestaurantBySlug pattern; the duplicate query is gone). */
const getBusiness = cache(async (slug: string) =>
  db.business.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, name: true, description: true, logoUrl: true, coverUrl: true,
      city: true, phone: true, whatsappNumber: true, address: true, receiptFooter: true,
      isActive: true, isPublished: true,
    },
  })
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const business = await getBusiness(slug);
    if (!business || !business.isPublished) {
      return { title: "المتجر غير متاح", robots: { index: false, follow: false } };
    }
    const title = `${business.name} — اطلب أونلاين`;
    const description =
      business.description ??
      `اطلب من ${business.name}${business.city ? ` في ${business.city}` : ""} — تصفح المنتجات واطلب توصيلاً أو استلاماً عبر سمارت أوردر`;
    const ogImage = absoluteUrl(business.coverUrl ?? business.logoUrl);
    return {
      title,
      description,
      alternates: { canonical: `/store/${business.slug}` },
      openGraph: {
        title,
        description,
        type: "website",
        locale: "ar_LY",
        images: ogImage ? [{ url: ogImage }] : undefined,
      },
      twitter: { card: "summary_large_image", title, description },
    };
  } catch {
    // DB/metadata failure must not 500 the document — fallback metadata only
    return { title: "المتجر غير متاح", robots: { index: false, follow: false } };
  }
}

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business || !business.isActive || !business.isPublished) notFound();

  // Structured data (SEO): Store + ItemList/Product/Offer graph. Prices
  // are integer millimes in the DB — schema.org wants decimal LYD.
  let products: Array<{ name: string; description: string | null; imageUrl: string | null; price: number; isAvailable: boolean }> = [];
  try {
    products = await db.product.findMany({
      where: { businessId: business.id, isArchived: false },
      select: { name: true, description: true, imageUrl: true, price: true, isAvailable: true },
      orderBy: { createdAt: "asc" },
      take: 25,
    });
  } catch {
    // metadata failure must not 500 the page — JSON-LD is skipped
  }
  const storeUrl = `${SITE_URL}/store/${business.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Store",
        "@id": `${storeUrl}#store`,
        name: business.name,
        description: business.description ?? undefined,
        url: storeUrl,
        image: absoluteUrl(business.coverUrl ?? business.logoUrl),
        telephone: business.phone ?? undefined,
        address:
          business.address || business.city
            ? {
                "@type": "PostalAddress",
                streetAddress: business.address ?? undefined,
                addressLocality: business.city ?? undefined,
                addressCountry: "LY",
              }
            : undefined,
      },
      {
        "@type": "ItemList",
        "@id": `${storeUrl}#menu`,
        numberOfItems: products.length,
        itemListElement: products.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "Product",
            name: p.name,
            description: p.description ?? undefined,
            image: absoluteUrl(p.imageUrl),
            offers: {
              "@type": "Offer",
              price: (p.price / 1000).toFixed(3),
              priceCurrency: "LYD",
              availability: p.isAvailable
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
              url: storeUrl,
            },
          },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Storefront
        slug={slug}
        business={{
          slug,
          name: business.name,
          description: business.description,
          logoUrl: business.logoUrl,
          coverUrl: business.coverUrl,
          city: business.city,
          phone: business.phone,
          whatsappNumber: business.whatsappNumber,
          address: business.address,
          receiptFooter: business.receiptFooter,
        }}
      />
    </>
  );
}
