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
// P40 (P1-3 + P2-1 + SO-2) adds RETIRED claims: bullets with no
// truthful tier-card replacement fold OUT at display (healPlanClaim →
// null, dropped by both read seams):
//   · «متاجر متعددة من حساب واحد» (P1-3, Pro) — sold but unimplemented:
//     only register + seed create businesses; /api/business is GET+PATCH.
//     The real Pro differentiators (unlimited team via the staff route's
//     9999, CSV export) were ALREADY on the card — no replacement exists.
//   · «تتبع مباشر للعميل» (P2-1, Basic) + «رسائل واتساب للطلبات
//     والتأكيدات» (P2-1, Premium) + «دعم فني عبر واتساب» (P2-1 class,
//     Basic) + «متجر رقمي يعمل فوراً» (SO-2, Free) — ALL-PLAN
//     capabilities, now spoken by the pricing page's «دائماً في كل
//     الباقات» block instead of masquerading as tier differentiators.
//     Healing runs FIRST, so the old «إشعارات واتساب فورية» rows heal
//     into the reworded bullet and then retire with it — one pass, both
//     generations. NO behavior change ever accompanies this: tracking
//     and WhatsApp links stay ungated on every plan (the claims were
//     fixed, not the features).
//
// The three seed twins (api/plans FAMILY_PLANS + scripts/seed-family.js +
// scripts/e2e-seed.mjs) no longer carry the retired bullets; the plans
// table is seed-on-EMPTY (and the deploy-time upsert can fail silently
// by design), so rows seeded before the rewords (production included)
// heal at the TWO read seams via healPlanClaim — the P13-2d display-fold
// doctrine. These pins hold all of those layers.
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
/* P40 retirements — see the file's RETIRED_CLAIMS block for evidence. */
const RETIRED_MULTI_STORE = "متاجر متعددة من حساب واحد";
const RETIRED_TRACKING = "تتبع مباشر للعميل";
const RETIRED_SUPPORT = "دعم فني عبر واتساب";
const RETIRED_INSTANT_STORE = "متجر رقمي يعمل فوراً";

test("behavior: the legacy reports over-promise heals to the on-demand truth (W6-B7)", () => {
  assert.equal(healPlanClaim(OLD_REPORTS), NEW_REPORTS);
});

test("behavior: Pro's phantom advanced-analytics bullet heals to the honest CSV-export claim (W7-D)", () => {
  assert.equal(healPlanClaim(OLD_ADVANCED), NEW_ADVANCED);
});

test("behavior (P1-3): the sold-but-unimplemented multi-store bullet retires — null, never displayed", () => {
  assert.equal(healPlanClaim(RETIRED_MULTI_STORE), null);
});

test("behavior (P2-1): the mis-sold all-plan differentiators retire from tier cards", () => {
  assert.equal(healPlanClaim(RETIRED_TRACKING), null);
  assert.equal(healPlanClaim(NEW), null); // the W6-B4 reworded bullet — all-plan now
  assert.equal(healPlanClaim(OLD), null); // …and its «إشعارات واتساب فورية» ancestor heals THEN retires
  assert.equal(healPlanClaim(RETIRED_SUPPORT), null);
  assert.equal(healPlanClaim(RETIRED_INSTANT_STORE), null); // SO-2: baseline-block item
});

test("behavior: everything else passes through byte-identical — the heal is surgical", () => {
  for (const passthrough of [
    NEW_REPORTS, // the W6-B7 twin is a no-op
    NEW_ADVANCED, // the W7-D twin is a no-op
    "كل ميزات الأساسي",
    "حسابات فريق (3 أعضاء)",
    "3 أقسام",
    "دعم أولوية", // Premium's PRIORITY support IS a real tier differentiator
  ]) {
    assert.equal(healPlanClaim(passthrough), passthrough);
  }
});

test("seeds: the three plan-catalog twins no longer carry any retired bullet (one SSOT, no twin drift)", () => {
  const seeds = [
    read("../../src/app/api/plans/route.ts"),
    read("../../scripts/seed-family.js"),
    read("../../scripts/e2e-seed.mjs"),
  ];
  for (const src of seeds) {
    assert.ok(src.includes(NEW_REPORTS), "twin must carry the on-demand reports bullet");
    assert.ok(!src.includes(OLD_REPORTS), "twin must not carry the scheduled-weekly over-promise");
    assert.ok(src.includes(NEW_ADVANCED), "twin must carry the honest Pro CSV-export bullet");
    assert.ok(!src.includes(OLD_ADVANCED), "twin must not carry the phantom advanced-analytics bullet");
    // P40: retired bullets are gone from the seeds (comments documenting the
    // retirement are fine — the FEATURES arrays are what renders).
    for (const retired of [RETIRED_MULTI_STORE, RETIRED_TRACKING, NEW, RETIRED_SUPPORT, RETIRED_INSTANT_STORE]) {
      const featuresBlock = src.slice(src.indexOf("PLANS"), src.lastIndexOf("];"));
      assert.ok(
        !featuresBlock.includes(`"${retired}"`),
        `seed features must not carry the retired bullet «${retired}»`,
      );
    }
  }
});

test("seams: BOTH plan read seams apply the heal (now string|null) and drop retired bullets after the digit fold", () => {
  const apiSeam = read("../../src/app/api/plans/route.ts");
  const ssrSeam = read("../../src/app/pricing/page.tsx");
  for (const src of [apiSeam, ssrSeam]) {
    assert.ok(
      /\.map\(westernNumerals\)\s*\.map\(healPlanClaim\)/.test(src),
      "read seam must fold digits THEN heal the claim",
    );
    assert.ok(
      src.includes(".filter((f): f is string => f !== null)"),
      "read seam must drop retired (null) bullets — live rows heal at display",
    );
  }
});

test("pricing (SO-2): the «دائماً في كل الباقات» baseline block carries the repositioned all-plan truths", () => {
  const pricing = read("../../src/components/pricing/pricing-client.tsx");
  assert.ok(pricing.includes("دائماً في كل الباقات"), "the block heading exists");
  for (const item of [
    "متجر رقمي يعمل فوراً",
    "تتبع مباشر للطلبات",
    "رسائل واتساب للطلبات",
    "لوحة تحكم عربية",
    "دعم واتساب",
  ]) {
    assert.ok(pricing.includes(`"${item}"`), `the block must list the verified all-plan item «${item}»`);
  }
});
