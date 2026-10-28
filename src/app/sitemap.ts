import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { notQaFixtureBusiness } from "@/lib/qa-fixtures";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  if (!site) return [];

  const base: MetadataRoute.Sitemap = [
    { url: site, changeFrequency: "weekly", priority: 1 },
    { url: `${site}/pricing`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${site}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${site}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];
  // r132 (F1c, A11 P2): /register dropped — robots.ts disallows it, so a
  // sitemap entry told Google to index a URL it is told not to crawl
  // (wasted entry + signal noise). Sign-up stays reachable via the nav.

  try {
    /* P30-B (§4 sitemap gate — the Smart-Menu r96/P29-D1 doctrine): the
     * e2e battery's QA-fixture businesses («مخبز الاختبار أ» + its
     * suffixed re-runs) must never ride the production sitemap. Their
     * storefront routes stay reachable (exclusion = no crawl budget,
     * never a broken link) — they just stop presenting as real stores.
     * Found live in production: 7 fixture stores in the sitemap. */
    const businesses = await db.business.findMany({
      where: { isPublished: true, isActive: true, ...notQaFixtureBusiness },
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
