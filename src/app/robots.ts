import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // checkout lives at /store/[slug]/checkout — the old literal
        // "/checkout" never matched a real path. (The pages also carry
        // per-page noindex; this wildcard closes the static gap.)
        disallow: ["/dashboard", "/api", "/track", "/login", "/register", "/store/*/checkout"],
      },
    ],
    sitemap: site ? `${site}/sitemap.xml` : undefined,
  };
}
