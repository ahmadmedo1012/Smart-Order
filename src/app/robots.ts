import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  /* P42-W7 (§7.4): SITE_URL is the shared lib/site-url constant — the
   * Sitemap line used to vanish with the env var while canonical/OG
   * (layout) kept the live domain. It now always names the sitemap. */
  const site = SITE_URL;
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          /* P42-W7: store imagery rides /api/media/{cuid} — the DIRECT
           * URLs og:image and the Store/ItemList JSON-LD point at (the
           * <img> tags go through /_next/image, which was never blocked).
           * Disallow /api kept Googlebot from fetching a real store's
           * logo/product photos, degrading image search + Product rich
           * results for the indexable surface. Longest-match (RFC 9309)
           * lets /api/media/ through while the rest of /api stays
           * blocked. Safe by construction: ids are unguessable cuids,
           * never enumerated, and receipts (same path) are only ever
           * referenced from auth-gated admin surfaces — robots.txt is
           * crawl budget, not access control. */
          "/api/media/",
        ],
        // checkout lives at /store/[slug]/checkout — the old literal
        // "/checkout" never matched a real path. (The pages also carry
        // per-page noindex; this wildcard closes the static gap.)
        // r132 (F1c, A11 P2): /register stays disallowed (auth-gated
        // sign-up, like SB's registry) — sitemap.ts no longer lists it,
        // so the robots↔sitemap contradiction is resolved.
        disallow: ["/dashboard", "/api", "/track", "/login", "/register", "/store/*/checkout"],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
  };
}
