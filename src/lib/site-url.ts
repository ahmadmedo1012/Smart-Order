/* P42-W7 (§7.4 SEO audit): the canonical origin — ONE shared source.
 *
 * Before this module, layout.tsx owned the fallback
 * (`process.env.NEXT_PUBLIC_SITE_URL ?? "https://order.smart-link.ly"`)
 * while robots.ts and sitemap.ts each read the raw env and BUILT THEIR
 * OWN: unset env ⇒ an EMPTY sitemap + a robots.txt with no Sitemap line
 * — the layout comment promises "OG/canonical/sitemap URLs stay pointed
 * at the live domain even when the env var is unset", but only OG/
 * canonical honored it. A production config regression (env var lost)
 * would silently strip every store from the sitemap with no error
 * anywhere (CI never sees it: the e2e job bakes the env in).
 *
 * The doctrine (unchanged, now actually universal): order.smart-link.ly
 * is the canonical production origin (Vercel + Neon; the retired
 * smart-order.onrender.com host stays retired). Preview deployments
 * without the env serve production-URL sitemaps — useless to crawlers
 * (cross-host sitemaps are ignored) and leak nothing.
 *
 * `||` not `??` (P42-W7 hardening): .env.example warns "a REAL url or
 * left unset — an empty string crashes new URL() in layout metadata
 * (500s every page)". An explicitly-empty env value is now treated as
 * unset instead of crashing the whole site at metadataBase. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://order.smart-link.ly";
