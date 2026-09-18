import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Storefront } from "@/components/storefront/storefront";

export const dynamic = "force-dynamic";

async function getBusiness(slug: string) {
  return db.business.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, name: true, description: true, logoUrl: true, coverUrl: true,
      city: true, phone: true, whatsappNumber: true, address: true, receiptFooter: true,
      isActive: true, isPublished: true,
    },
  });
}

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
    return {
      title,
      description,
      alternates: { canonical: `/store/${business.slug}` },
      openGraph: {
        title,
        description,
        type: "website",
        locale: "ar_LY",
        images: business.coverUrl ?? business.logoUrl ?? undefined,
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

  return (
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
  );
}
