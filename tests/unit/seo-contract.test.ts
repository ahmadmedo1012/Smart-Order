// P42-W7 (§7.4) — the SEO discovery contract: source + behavior pins.
//
// THE DISCOVERY MODEL (audited live on a dev server, evidence per item):
// public store pages + the marketing routes are the indexable surface;
// tracking pages, checkout, and every merchant/admin surface are private
// and must never leak into indexes. This file pins the wiring so the
// posture can't drift silently:
//   · ONE canonical-origin source (lib/site-url) feeds layout, robots.ts
//     AND sitemap.ts — a lost env var can no longer leave the sitemap
//     silently empty while OG/canonical keep the live domain (the exact
//     drift the layout comment promised but sitemap.ts never honored).
//   · The checkout door completes the P40 family (noindex,follow +
//     self-canonical — it was the last public utility route still
//     canonicalizing to the homepage).
//   · The tracking TOKEN (the 122-bit credential) never appears in any
//     head signal: canonical: null (NO canonical at all — verified live:
//     Next 16 emits no tag and does NOT fall back to the root layout's)
//     and og:url already inherits "/".
//   · The X-Robots-Tag belt on /track/:path* survives even the
//     metadata-failure path (a throwing generateMetadata was verified
//     live to render 200 with NO robots meta — the header answers that).
//   · robots.txt keeps /api blocked EXCEPT /api/media/ (the direct
//     og:image + JSON-LD image URLs of real stores — the <img> tags ride
//     /_next/image, which was never blocked).
//
// Family style: behavior pins import the lib; wiring pins read the
// source (fail-pre-fix by construction — the qa-fixtures.test.ts doctrine).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (p: string): string =>
  readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

// ── the canonical origin: ONE source ───────────────────────────────────────

test("behavior: SITE_URL falls back to the production origin when the env var is unset", async () => {
  delete process.env.NEXT_PUBLIC_SITE_URL;
  const { SITE_URL } = await import("../../src/lib/site-url.ts");
  assert.equal(SITE_URL, "https://order.smart-link.ly");
});

test("behavior: an explicitly-EMPTY env value is treated as unset (||, not ??) — .env.example's documented new URL('') crash is closed", async () => {
  process.env.NEXT_PUBLIC_SITE_URL = "";
  // the ?empty query busts the ESM cache so the module re-evaluates
  // under the new env (verified: plain re-import would reuse the cache).
  // @ts-expect-error — the query-stringed specifier is intentional
  // (tsc has no declarations for it; node resolves it as a distinct URL)
  const { SITE_URL } = await import("../../src/lib/site-url.ts?empty");
  assert.equal(SITE_URL, "https://order.smart-link.ly");
});

test("wiring: robots.ts + sitemap.ts + layout all ride the ONE source (no private env reads outside lib/site-url)", () => {
  const siteUrl = read("../../src/lib/site-url.ts");
  assert.ok(
    siteUrl.includes('process.env.NEXT_PUBLIC_SITE_URL || "https://order.smart-link.ly"'),
    "the lib owns the fallback (|| hardening included)",
  );
  for (const f of [
    "../../src/app/robots.ts",
    "../../src/app/sitemap.ts",
    "../../src/app/layout.tsx",
    "../../src/app/page.tsx",
    "../../src/app/store/[slug]/page.tsx",
  ]) {
    const src = read(f);
    assert.ok(
      src.includes('from "@/lib/site-url"'),
      `${f} imports the shared SITE_URL`,
    );
    assert.ok(
      !src.includes("process.env.NEXT_PUBLIC_SITE_URL"),
      `${f} must not read the env directly (the drift this wave closed)`,
    );
  }
});

// ── sitemap: public-store-only listings ────────────────────────────────────

test("wiring: the sitemap enumerates ONLY marketing base routes + /store/{slug} (doors/dashboard/checkout never ride it)", () => {
  const sitemap = read("../../src/app/sitemap.ts");
  assert.ok(
    sitemap.includes("notQaFixtureBusiness"),
    "the fixture gate stays (P30-B)",
  );
  assert.ok(
    sitemap.includes("`${site}/store/${b.slug}`"),
    "store URLs ride the slug template",
  );
  // the base array is the ONLY other URL source — pin it exactly: the
  // four marketing routes and nothing else (comments may mention doors;
  // code may not list them)
  const baseStart = sitemap.indexOf("const base: MetadataRoute.Sitemap = [");
  const baseEnd = sitemap.indexOf("];", baseStart);
  const baseBlock = sitemap.slice(baseStart, baseEnd);
  assert.ok(baseStart !== -1 && baseEnd !== -1, "the base array exists");
  assert.ok(baseBlock.includes("url: site,"), "the bare home URL rides first");
  for (const route of ["`${site}/pricing`", "`${site}/terms`", "`${site}/privacy`"]) {
    assert.ok(baseBlock.includes(route), `the base array lists ${route}`);
  }
  assert.equal(
    (baseBlock.match(/url: /g) || []).length,
    4,
    "exactly four base URLs — no door/dashboard/checkout entry may join",
  );
});

// ── robots.txt: crawl budget matches the discovery model ───────────────────

test("wiring: robots.txt keeps the private disallows AND opens /api/media/ for store imagery", () => {
  const robots = read("../../src/app/robots.ts");
  for (const d of ["/dashboard", "/api", "/track", "/login", "/register", "/store/*/checkout"]) {
    assert.ok(robots.includes(`"${d}"`), `Disallow ${d} stays`);
  }
  assert.ok(
    robots.includes('"/api/media/"'),
    "Allow /api/media/ — og:image + JSON-LD image URLs become crawlable",
  );
  assert.ok(
    robots.includes("sitemap: `${site}/sitemap.xml`"),
    "the Sitemap line always rides (shared SITE_URL)",
  );
});

// ── checkout: the P40 door family's missing member ────────────────────────

test("wiring: checkout speaks the door doctrine — noindex,follow + SELF-canonical (no homepage inheritance)", () => {
  const page = read("../../src/app/store/[slug]/checkout/page.tsx");
  assert.ok(
    page.includes("alternates: { canonical: `/store/${slug}/checkout` }"),
    "self-canonical carries the slug",
  );
  assert.ok(
    page.includes("robots: { index: false, follow: true }"),
    "noindex,follow — aligned with /track, /login, /register (P40)",
  );
  assert.ok(
    !page.includes("follow: false"),
    "the old nofollow posture is gone",
  );
});

// ── tracking: the credential never rides a head signal ────────────────────

test("wiring: /track/[token] emits NO canonical at all (canonical: null — the token must never appear in canonical/OG)", () => {
  const page = read("../../src/app/track/[token]/page.tsx");
  assert.ok(
    page.includes("canonical: null"),
    "canonical: null — verified live: no tag, no root-layout inheritance",
  );
  assert.ok(
    !page.includes("canonical: `/track/${token}`"),
    "the P40 self-canonical (token in the canonical) is retired",
  );
  assert.ok(
    !page.includes("follow: false"),
    "the door posture stays noindex,FOLLOW (P40)",
  );
});

test("wiring: track generateMetadata survives a DB outage (try/catch → noindex fallback — a throw renders 200 with NO robots meta)", () => {
  const page = read("../../src/app/track/[token]/page.tsx");
  assert.ok(
    page.includes("} catch {"),
    "the DB read is guarded (the store page's metadata-failure doctrine)",
  );
});

test("wiring: the X-Robots-Tag belt rides /track/:path* in next.config.ts (covers metadata-failure paths at the HTTP layer)", () => {
  const cfg = read("../../next.config.ts");
  assert.ok(
    cfg.includes('{ source: "/track/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] }'),
    "the header rule exists verbatim",
  );
});

// ── the money page's OG card: complete, not layout-dependent ───────────────

test("wiring: store openGraph carries its own url (self, param-safe) + siteName — the page object REPLACES the layout's, so the card lost both before P42-W7", () => {
  const page = read("../../src/app/store/[slug]/page.tsx");
  assert.ok(
    page.includes("url: `/store/${business.slug}`"),
    "og:url names the store page itself (canonical-identical, absolute via metadataBase)",
  );
  assert.ok(
    page.includes('siteName: "سمارت أوردر"'),
    "og:site_name restored (the layout's own value, re-declared on the replacing object)",
  );
});
