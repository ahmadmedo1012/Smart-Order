// W7-D — the plan FEATURE-entitlement ladder pins (the W6-B7 residual:
// reports/CSV breadth). Pure-decision tests against
// plan-entitlements-core.ts — the same module the routes' gates read
// (lib/plan-entitlements.ts resolveBusinessPlanTier + assertPlanFeature),
// so these boundary numbers ARE the enforcement contract:
//   · reports = بريميوم+ (sortOrder 3) — «تقارير أداء عند الطلب» is sold
//     on the Premium card, so Premium and above read the surface;
//   · csvExport = احترافي+ (sortOrder 4) — the reworded Pro bullet
//     «تصدير CSV للتقارير», the only real Pro-level analytics
//     differentiator (code-traced: no deeper analytics subset exists);
//   · fail-closed: an unknown/missing tier opens NOTHING (product gates
//     are not money paths — the W2-D2 count-gate doctrine, mirrored by
//     the Smart-Menu W7-B twin);
//   · the copy is the family's single denial sentence per feature
//     (Smart-Menu W7-B wording) so every 403 site speaks one line.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PLAN_FEATURES,
  planAllowsFeature,
  entitlementsForPlan,
  planFeatureDeniedCopy,
  planFeatureLockLabel,
} from "../../src/lib/plan-entitlements-core.ts";

const FREE = { name: "Free", nameAr: "مجاني", sortOrder: 1 };
const BASIC = { name: "Basic", nameAr: "أساسي", sortOrder: 2 };
const PREMIUM = { name: "Premium", nameAr: "بريميوم", sortOrder: 3 };
const PRO = { name: "Pro", nameAr: "احترافي", sortOrder: 4 };

/* The seeds' ladder rank (FAMILY_PLANS sortOrder) — the same rank the
   subscription review upgrades ride. These two numbers are the pricing
   owner's documented one-line revert knobs. */
test("ladder: reports is بريميوم+ (sortOrder 3), csvExport is احترافي+ (sortOrder 4)", () => {
  assert.equal(PLAN_FEATURES.reports.minSortOrder, 3);
  assert.equal(PLAN_FEATURES.csvExport.minSortOrder, 4);
  assert.equal(PLAN_FEATURES.reports.minPlanNameAr, "بريميوم");
  assert.equal(PLAN_FEATURES.csvExport.minPlanNameAr, "احترافي");
});

test("behavior: the reports ladder — Free/Basic denied, Premium/Pro allowed", () => {
  assert.equal(planAllowsFeature(FREE, "reports"), false);
  assert.equal(planAllowsFeature(BASIC, "reports"), false);
  assert.equal(planAllowsFeature(PREMIUM, "reports"), true);
  assert.equal(planAllowsFeature(PRO, "reports"), true);
});

test("behavior: the CSV ladder — the one-tap export is Pro+ (Premium reads the data, does not export it)", () => {
  assert.equal(planAllowsFeature(FREE, "csvExport"), false);
  assert.equal(planAllowsFeature(BASIC, "csvExport"), false);
  assert.equal(planAllowsFeature(PREMIUM, "csvExport"), false);
  assert.equal(planAllowsFeature(PRO, "csvExport"), true);
});

test("behavior: fail-closed — unknown/missing tier opens nothing (product gates are not money paths)", () => {
  assert.equal(planAllowsFeature(null, "reports"), false);
  assert.equal(planAllowsFeature(null, "csvExport"), false);
  assert.equal(planAllowsFeature(undefined, "reports"), false);
  assert.equal(
    planAllowsFeature({ name: null, nameAr: null, sortOrder: null }, "reports"),
    false,
  );
  assert.equal(
    planAllowsFeature({ name: null, nameAr: null, sortOrder: null }, "csvExport"),
    false,
  );
});

test("behavior: entitlementsForPlan is the whole map for one tier (the locked-UI preference)", () => {
  assert.deepEqual(entitlementsForPlan(FREE), { reports: false, csvExport: false });
  assert.deepEqual(entitlementsForPlan(PREMIUM), { reports: true, csvExport: false });
  assert.deepEqual(entitlementsForPlan(PRO), { reports: true, csvExport: true });
  assert.deepEqual(entitlementsForPlan(null), { reports: false, csvExport: false });
});

test("copy: the family's denial sentence names the minimum plan and the upgrade path (one literal per feature)", () => {
  assert.equal(
    planFeatureDeniedCopy("reports"),
    "هذه الميزة متوفرة في خطة «بريميوم» فأعلى. قم بالترقية للمتابعة.",
  );
  assert.equal(
    planFeatureDeniedCopy("csvExport"),
    "هذه الميزة متوفرة في خطة «احترافي» فأعلى. قم بالترقية للمتابعة.",
  );
});

test("copy: the lock label carries the feature label + the plan (the disabled-button explanation)", () => {
  assert.ok(planFeatureLockLabel("reports").includes("بريميوم"));
  assert.ok(planFeatureLockLabel("csvExport").includes("احترافي"));
  assert.ok(planFeatureLockLabel("csvExport").includes("تصدير CSV للتقارير"));
  assert.ok(planFeatureLockLabel("reports").includes("الترقية"));
});
