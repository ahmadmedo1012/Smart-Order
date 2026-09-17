import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  if (!site) return [];

  const base: MetadataRoute.Sitemap = [
    { url: site, changeFrequency: "weekly", priority: 1 },
    { url: `${site}/register`, changeFrequency: "monthly", priority: 0.7 },
  ];

  try {
    const businesses = await db.business.findMany({
      where: { isPublished: true, isActive: true },
      select: { slug: true, updatedAt: true },
      take: 500,
    });
    return [
      ...base,
      ...businesses.map((b) => ({
        url: `${site}/store/${b.slug}`,
        lastModified: b.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return base;
  }
}
