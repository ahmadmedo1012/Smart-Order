import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { notQaFixtureBusiness } from "@/lib/qa-fixtures";
import { SITE_URL } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  /* P42-W7 (§7.4): SITE_URL is the shared lib/site-url constant — the
   * env-unset branch used to return [] here (a silent EMPTY sitemap)
   * while the root layout kept canonical/OG pointed at the live domain:
   * a lost env var would quietly strip every store from discovery with
   * no error anywhere. The fallback keeps the production sitemap alive
   * even through a config regression (previews without the env serve
   * production URLs — cross-host sitemaps are simply ignored by
   * crawlers, so nothing leaks either way). */
  const site = SITE_URL;

  const base: MetadataRoute.Sitemap = [
    { url: site, changeFrequency: "weekly", priority: 1 },
    { url: `${site}/pricing`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${site}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${site}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];
  // r132 (F1c, A11 P2): /register dropped — robots.ts disallows it, so a
  // sitemap entry told Google to index a URL it is told not to crawl
  // (wasted entry + signal noise). Sign-up stays reachable via the nav.
  // P42-W7: the listing stays public-store-only — marketing base routes
  // + /store/{slug}; doors (/login /register /track), the dashboard and
  // checkout never ride it.

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
