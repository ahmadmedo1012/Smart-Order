// P30-A (§6 isolation) — the slug seam's behavioral pins.
//
// WHAT HAPPENED: scripts/seed-family.js + /api/seed mutate the business
// found at slug «demo-store» (photo refresh by product-name match,
// payment-method / delivery-zone top-ups when empty). A merchant
// registered before the first seed with a name that slugifies to
// "demo-store" would have occupied that slug — and every deploy would
// then "refresh" THEIR product images and top up THEIR payment methods
// (the §6.3 hazard: merchant-controlled records mutated by the seed).
//
// TWO GUARDS LANDED (the defense in depth):
//   1. Registration seam — behavioral, pinned HERE: «demo-store» joins
//      RESERVED in src/lib/slug.ts, so uniqueSlug can never emit it
//      (a «Demo Store» business lands on the store- prefixed fallback).
//   2. Mutation seam — source-contract, pinned in seed-isolation.test.ts:
//      both seed twins verify the row's demo identity before mutating.
import { test } from "node:test";
import assert from "node:assert/strict";
import { uniqueSlug } from "../../src/lib/slug.ts";

test("RESERVED: «demo-store» can never be emitted (a «Demo Store» business gets the store- fallback)", async () => {
  const slug = await uniqueSlug("Demo Store", async () => false);
  assert.equal(slug, "store-demo-store");
});

test("RESERVED: the legacy reserved words stay reserved (store- fallback)", async () => {
  for (const w of ["api", "dashboard", "store", "admin", "terms", "privacy"]) {
    const slug = await uniqueSlug(w, async () => false);
    assert.equal(slug, `store-${w}`);
  }
});

test("uniqueSlug: collision suffixing walks -2, -3…", async () => {
  const taken = new Set(["my-store", "my-store-2"]);
  const slug = await uniqueSlug("My Store", async (c) => taken.has(c));
  assert.equal(slug, "my-store-3");
});

test("uniqueSlug: Arabic names transliterate to a clean latin slug", async () => {
  const slug = await uniqueSlug("مخبز الواحة", async () => false);
  assert.match(slug, /^[a-z0-9-]+$/);
});

test("uniqueSlug: the seed-owned slug never collides with a registering merchant", async () => {
  // The demo row is created with slug «demo-store» directly (not via this
  // helper) — a merchant arriving later with the same name must be
  // suffixed away from it, exactly like any DB-collision.
  const taken = new Set(["demo-store"]);
  const slug = await uniqueSlug("Demo Store", async (c) => taken.has(c));
  // slugifyArabic("Demo Store") = "demo-store" → RESERVED → "store-demo-store"
  assert.equal(slug, "store-demo-store");
});
