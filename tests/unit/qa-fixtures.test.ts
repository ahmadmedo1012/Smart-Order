// P30-B (§4/§7) — the QA-fixture gate's behavioral + wiring pins.
//
// WHAT HAPPENED: production's sitemap carried 7 QA-fixture stores
// («مخبز الاختبار أ» + suffixed -2…-7) and the landing roadmark board
// counted them («+9 متجر على الطريق») — e2e/api-e2e.js registers exactly
// these names through the public register API, and at some era a run
// was pointed at production. The residue leaked through every public
// discovery/counting surface because NONE of them had a fixture gate.
//
// THE GATE (behavioral, pinned here): src/lib/qa-fixtures.ts — the
// e2e battery's own self-declaring name markers («الاختبار») classify
// a business as QA residue. Real merchant names (incl. the flagship
// demo «مخبز الواحة — تجريبي» and the real «مطعم برقة الذهبي» found
// in production) must NEVER match — over-exclusion is a defect too.
//
// THE WIRING (source-contract, pinned here): sitemap.ts +
// lib/landing-stats.ts apply the gate; the e2e battery refuses
// non-local targets (the root seam — the residue can never be created
// again). Full counter behavior: landing-stats.test.ts (real DB).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  isQaFixtureBusinessName,
  QA_FIXTURE_NAME_MARKERS,
  storeRobotsForBusinessName,
} from "../../src/lib/qa-fixtures.ts";

const read = (p: string): string =>
  readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

test("behavior: the e2e battery's exact fixture names match", () => {
  assert.equal(isQaFixtureBusinessName("مخبز الاختبار أ"), true);
  assert.equal(isQaFixtureBusinessName("متجر الاختبار ب"), true);
});

test("behavior: suffixed re-run fixtures keep matching (the -2…-7 production shape)", () => {
  for (const name of ["مخبز الاختبار أ", "مخبز الاختبار ب", "متجر الاختبار أ"]) {
    assert.equal(isQaFixtureBusinessName(`${name} 2`), true);
  }
});

test("behavior: real merchant names NEVER match (over-exclusion is a defect too)", () => {
  const real = [
    "مخبز الواحة — تجريبي", // the flagship demo (seed-owned, published by design)
    "مطعم برقة الذهبي", // the real store found in production
    "مطعم الأصيل", // Smart-Menu's real restaurant (family shape)
    "مخبز الواحة",
    "متجر البركة",
    "مخبز النور للمعجنات",
  ];
  for (const name of real) {
    assert.equal(isQaFixtureBusinessName(name), false, `«${name}» must not match`);
  }
});

test("behavior: null/empty names are not fixtures", () => {
  assert.equal(isQaFixtureBusinessName(null), false);
  assert.equal(isQaFixtureBusinessName(undefined), false);
  assert.equal(isQaFixtureBusinessName(""), false);
});

test("behavior: the marker registry is exactly the e2e battery's two literals", () => {
  assert.equal(QA_FIXTURE_NAME_MARKERS.length, 2);
  assert.ok(QA_FIXTURE_NAME_MARKERS.includes("مخبز الاختبار"));
  assert.ok(QA_FIXTURE_NAME_MARKERS.includes("متجر الاختبار"));
});

test("wiring: the sitemap applies the fixture gate (the SEO leak seam)", () => {
  const sitemap = read("../../src/app/sitemap.ts");
  assert.ok(
    sitemap.includes("notQaFixtureBusiness"),
    "the sitemap where-clause carries the gate",
  );
});

test("wiring: the landing counters apply the fixture gate (both counts)", () => {
  const stats = read("../../src/lib/landing-stats.ts");
  assert.ok(stats.includes("notQaFixtureBusiness"));
  const storeCountGate = stats.includes("isActive: true, isPublished: true, ...notQaFixtureBusiness");
  const orderCountGate = stats.includes("business: notQaFixtureBusiness");
  assert.ok(storeCountGate, "the store count carries the gate");
  assert.ok(orderCountGate, "the order count carries the gate (fixture-business orders excluded)");
});

test("wiring: the e2e battery refuses non-local targets (the root seam)", () => {
  const e2e = read("../../tests/e2e/api-e2e.js");
  assert.ok(e2e.includes("E2E_ALLOW_REMOTE"), "the refusal + opt-in exist");
  assert.ok(
    e2e.includes("مخبز الاختبار أ"),
    "the refusal explains what the battery creates",
  );
});

test("wiring: the e2e battery asserts the sitemap gate itself (fail-pre-fix by construction)", () => {
  const e2e = read("../../tests/e2e/api-e2e.js");
  assert.ok(
    e2e.includes("/sitemap.xml") && e2e.includes("QA-fixture store"),
    "the battery probes the sitemap for its own fixture",
  );
});

// ── P35: the storefront robots gate (the THIRD fixture surface) ────────

test("behavior: storefront robots — QA fixtures get noindex,follow (never nofollow)", () => {
  assert.deepEqual(storeRobotsForBusinessName("مخبز الاختبار أ"), {
    index: false,
    follow: true,
  });
  // the suffixed re-run shape (the -2…-7 production residue)
  assert.deepEqual(storeRobotsForBusinessName("متجر الاختبار ب 7"), {
    index: false,
    follow: true,
  });
});

test("behavior: storefront robots — genuine merchants + flagship demo render NO robots meta", () => {
  // undefined → Next omits the meta entirely → byte-identical indexable output
  assert.equal(storeRobotsForBusinessName("مطعم برقة الذهبي"), undefined);
  assert.equal(storeRobotsForBusinessName("مخبز الواحة — تجريبي"), undefined); // flagship demo
  assert.equal(storeRobotsForBusinessName("مخبز الواحة"), undefined);
  assert.equal(storeRobotsForBusinessName(null), undefined);
  assert.equal(storeRobotsForBusinessName(undefined), undefined);
});

test("wiring: the storefront generateMetadata carries the fixture robots gate (the direct-crawl seam)", () => {
  const page = read("../../src/app/store/[slug]/page.tsx");
  assert.ok(
    page.includes("storeRobotsForBusinessName"),
    "store/[slug]/page.tsx applies the gate",
  );
});
