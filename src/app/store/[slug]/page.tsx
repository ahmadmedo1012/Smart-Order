import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { db } from "@/lib/db";
import { Storefront, type StoreData } from "@/components/storefront/storefront";
import { SITE_URL } from "@/app/layout";

/* r131-F2 (SO-1, A8 perf): the money page left the force-dynamic path —
 * ISR 60s on the smart-menu twin pattern (menu/[slug]/page.tsx:2-24):
 * revalidate + dynamicParams + generateStaticParams [] (the App Router
 * contract — a dynamic segment WITHOUT generateStaticParams renders
 * dynamically on every request and `revalidate` is silently ignored;
 * returning [] = all paths at runtime, zero DB queries at build, every
 * slug generated on first visit and cached with the 60s revalidation).
 *
 * r132-F1a (A9 SO-N1): the 60s window now governs the WHOLE menu — the
 * page server-queries the full storefront payload and hands it to
 * <Storefront> as initialData (the SM menu/[slug] pattern), killing the
 * skeleton-first client waterfall: every QR scan renders products in
 * the ISR HTML (−300-800ms LCP; the post-hydrate API call + its 2 DB
 * queries leave the critical path and survive only as a freshness
 * refresh inside the component). */
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

/* r132-F1a (A9 SO-N1): the FULL storefront payload, server-queried once
 * per ISR render and shared by the JSON-LD graph AND the Storefront
 * initial props — the exact query set of /api/public/store/[slug]
 * (shape-identical so the client freshness refresh swaps seamlessly).
 * Returns null for an unknown slug (memoized with getBusiness via
 * React cache() — one business row per request across metadata + page). */
const getStoreData = cache(async (slug: string): Promise<StoreData | null> => {
  const business = await getBusiness(slug);
  if (!business) return null;

  const [categories, products, deliveryZones, paymentMethods] = await Promise.all([
    db.category.findMany({
      where: { businessId: business.id, isActive: true, isArchived: false },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, description: true, imageUrl: true },
    }),
    db.product.findMany({
      where: { businessId: business.id, isArchived: false },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      select: {
        id: true, categoryId: true, name: true, description: true, imageUrl: true,
        price: true, isAvailable: true, isFeatured: true,
        variants: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true, priceDelta: true },
        },
        optionGroups: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true, name: true, minSelect: true, maxSelect: true, required: true,
            options: {
              where: { isActive: true },
              orderBy: { sortOrder: "asc" },
              select: { id: true, name: true, priceDelta: true },
            },
          },
        },
      },
    }),
    db.deliveryZone.findMany({
      where: { businessId: business.id, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, fee: true, minOrder: true },
    }),
    db.paymentMethod.findMany({
      where: { businessId: business.id, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, type: true, name: true, instructions: true, config: true },
    }),
  ]);

  return {
    business: {
      slug: business.slug,
      name: business.name,
      description: business.description,
      logoUrl: business.logoUrl,
      coverUrl: business.coverUrl,
      city: business.city,
      phone: business.phone,
      whatsappNumber: business.whatsappNumber,
      address: business.address,
      receiptFooter: business.receiptFooter,
    },
    categories,
    products,
    deliveryZones,
    paymentMethods,
  };
});

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
        /* r133 (R11 / A12 S13): ar_AR — Facebook scrapers drop ar_LY. */
        locale: "ar_AR",
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

  // r132-F1a (A9 SO-N1): full server-side payload → Storefront initial
  // props. A DB failure degrades to the pre-r132 behavior (skeleton +
  // client fetch inside the component); JSON-LD then rides an empty
  // ItemList, exactly like the old take-25 catch path.
  let store: StoreData | null = null;
  try {
    store = await getStoreData(slug);
  } catch {
    // store-data failure must not 500 the page — client fetch is the fallback
  }

  // Structured data (SEO): Store + ItemList/Product/Offer graph. Prices
  // are integer millimes in the DB — schema.org wants decimal LYD.
  const products = (store?.products ?? []).slice(0, 25);
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
      {/* r132-F1a (A10 #1): JSON-LD XSS escape — JSON.stringify does not
          escape `<`, so an owner-controlled store/product name containing
          `</script>` broke out of the inline script and executed on every
          visit (stored XSS). Escape `<` as \u003c — the SM menu/[slug]:342
          pattern (and the Next.js docs prescription). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Storefront slug={slug} initialData={store} />
    </>
  );
}
