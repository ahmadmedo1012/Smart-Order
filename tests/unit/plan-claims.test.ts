// W6-B4 — the plan-features WhatsApp-claim reword pins.
//
// THE VERDICT (traced, see src/lib/plan-claims.ts for the full evidence
// trail): «إشعارات واتساب فورية» over-promised — no automatic/instant
// notification exists anywhere (the owner-side arrival signal is the
// 20s visibility-gated dashboard poll; WhatsApp rides customer-tapped
// deep links for the order and owner-tapped deep links for the
// confirmation). The truthful replacement describes the real capability:
// «رسائل واتساب للطلبات والتأكيدات».
//
// W6-B7 extends the same doctrine to Premium's «تقارير أداء أسبوعية»
// (W6-B4's flagged residual): reports are real but ON-DEMAND
// (/dashboard/reports, 30/90-day windows + CSV), never scheduled weekly.
// Seeds reworded to «تقارير أداء عند الطلب»; the heal map covers rows
// seeded before it.
//
// W7-D CLOSES the flagged entitlement breadth: the reports surface is
// now genuinely بريميوم+ (lib/plan-entitlements-core) and the one-tap
// CSV export is احترافي+ (/api/dashboard/reports/export). Pro's old
// «إحصاءات متقدمة» bullet promised a deeper analytics layer that never
// existed — the seeds now sell «تصدير CSV للتقارير» (the export IS the
// only real Pro-level analytics differentiator), and this heal map
// covers rows seeded with the old bullet (production included).
//
// The three seed twins (api/plans FAMILY_PLANS + scripts/seed-family.js +
// scripts/e2e-seed.mjs) now carry the reworded bullets; the plans table is
// seed-on-EMPTY, so rows seeded before the rewords (production included)
// heal at the TWO read seams via healPlanClaim — the P13-2d display-fold
// doctrine. These pins hold all three of those layers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { healPlanClaim } from "../../src/lib/plan-claims.ts";

const read = (p: string): string =>
  readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

const OLD = "إشعارات واتساب فورية";
const NEW = "رسائل واتساب للطلبات والتأكيدات";
const OLD_REPORTS = "تقارير أداء أسبوعية";
const NEW_REPORTS = "تقارير أداء عند الطلب";
const OLD_ADVANCED = "إحصاءات متقدمة";
const NEW_ADVANCED = "تصدير CSV للتقارير";

test("behavior: the legacy bullet heals to the truthful claim at read time", () => {
  assert.equal(healPlanClaim(OLD), NEW);
});

test("behavior (W6-B7): the weekly-reports over-promise heals to the on-demand truth", () => {
  assert.equal(healPlanClaim(OLD_REPORTS), NEW_REPORTS);
});

test("behavior (W7-D): Pro's phantom advanced-analytics bullet heals to the honest CSV-export claim", () => {
  assert.equal(healPlanClaim(OLD_ADVANCED), NEW_ADVANCED);
});

test("behavior: everything else passes through byte-identical — the heal is surgical", () => {
  for (const passthrough of [
    NEW, // already-healed rows are a no-op (idempotent)
    NEW_REPORTS, // the W6-B7 twin is a no-op too
    NEW_ADVANCED, // the W7-D twin is a no-op too
    "كل ميزات الأساسي",
    "دعم فني عبر واتساب", // a DIFFERENT WhatsApp bullet — untouched
    "3 أقسام",
  ]) {
    assert.equal(healPlanClaim(passthrough), passthrough);
  }
});

test("seeds: the three plan-catalog twins carry the truthful claims (one SSOT, no twin drift)", () => {
  const seeds = [
    read("../../src/app/api/plans/route.ts"),
    read("../../scripts/seed-family.js"),
    read("../../scripts/e2e-seed.mjs"),
  ];
  for (const src of seeds) {
    assert.ok(src.includes(NEW), "twin must carry the reworded WhatsApp bullet");
    assert.ok(!src.includes(OLD), "twin must not carry the legacy WhatsApp over-promise");
    assert.ok(src.includes(NEW_REPORTS), "twin must carry the on-demand reports bullet");
    assert.ok(!src.includes(OLD_REPORTS), "twin must not carry the scheduled-weekly over-promise");
    assert.ok(src.includes(NEW_ADVANCED), "twin must carry the honest Pro CSV-export bullet");
    assert.ok(!src.includes(OLD_ADVANCED), "twin must not carry the phantom advanced-analytics bullet");
  }
});

test("seams: BOTH plan read seams apply the heal after the digit fold", () => {
  const apiSeam = read("../../src/app/api/plans/route.ts");
  const ssrSeam = read("../../src/app/pricing/page.tsx");
  for (const src of [apiSeam, ssrSeam]) {
    assert.ok(
      src.includes(".map(westernNumerals).map(healPlanClaim)"),
      "read seam must fold digits THEN heal the claim",
    );
  }
});
