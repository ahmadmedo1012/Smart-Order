// W7-D — the plan FEATURE-entitlement source (the W6-B7 residual: the
// reports/CSV breadth the seeds sell but nothing enforced).
//
// THE FAMILY LAW (SmartBot P21-W3-B Convention #5): «a paid feature with
// no gate is a bug, not a TODO» — sold-but-ungated features are
// entitlement bugs. This module is the Smart-Menu plan-entitlements-core
// twin (same-wave W7-B, G-4): the PURE half only — the tier ladder, the
// decision, and the Arabic copy — with ZERO imports so node --test reads
// it bare and client components never drag the database into their
// bundle (the lib/plan-claims.ts seam contract).
//
// THE LADDER (src/app/api/plans/route.ts FAMILY_PLANS sortOrder, the
// same rank the subscription review upgrades ride): Free 1 · Basic 2 ·
// بريميوم 3 · احترافي 4. Decisions read sortOrder ONLY — plan names
// feed the copy, never the decision, so a renamed row can't fork the
// gate from the ladder.
//
// THE W7-D RULINGS this table encodes (evidence in the routes):
//   · reports   («تقارير أداء عند الطلب», sold on بريميوم): the whole
//     /api/dashboard/reports surface — بريميوم فأعلى.
//   · csvExport («تصدير CSV للتقارير», the reworded احترافي bullet):
//     the one-tap CSV artifact at /api/dashboard/reports/export —
//     احترافي فأعلى. Evidence first: NO deeper "advanced analytics"
//     subset exists beyond the reports surface (stats route = the
//     universal overview KPIs, reports route = the only trend/best-
//     seller surface), so CSV is the only real Pro-level analytics
//     differentiator — the seed bullet is reworded to name it.
//
// FAIL-CLOSED (documented deviation from the money-core fail-open):
// feature gates are product entitlements, not money paths — an unknown/
// missing plan (sortOrder null/undefined) opens NOTHING. The wrong
// denial is a support ticket, not lost money; the W2-D2 count gates in
// this repo made the same call (the Free-literal tail on a never-seeded
// plans table) and the Smart-Menu W7-B twin documents the identical
// reasoning.

/** The gated features (closed union — an unknown key is a tsc error, the
 *  family's «unknown flag fails LOUDLY» at compile time). */
export type PlanFeatureKey = "reports" | "csvExport";

export interface PlanFeatureDef {
  /** Minimum plan sortOrder from the FAMILY_PLANS ladder. */
  minSortOrder: number;
  /** The minimum plan's Arabic name (from the seeds) — feeds the copy. */
  minPlanNameAr: string;
  /** Arabic label of the feature — feeds the locked-UI copy. */
  labelAr: string;
}

export const PLAN_FEATURES: Record<PlanFeatureKey, PlanFeatureDef> = {
  reports: { minSortOrder: 3, minPlanNameAr: "بريميوم", labelAr: "تقارير الأداء عند الطلب" },
  csvExport: { minSortOrder: 4, minPlanNameAr: "احترافي", labelAr: "تصدير CSV للتقارير" },
};

/** The minimum tier shape the decision needs (any plan-row read). */
export type PlanTier =
  | { name: string | null; nameAr: string | null; sortOrder: number | null }
  | null
  | undefined;

/** Pure decision: does a tier of this rank open the feature?
 *  Unknown/missing tier (sortOrder null/undefined) opens nothing. */
export function planAllowsFeature(plan: PlanTier, feature: PlanFeatureKey): boolean {
  return (plan?.sortOrder ?? 0) >= PLAN_FEATURES[feature].minSortOrder;
}

/** The whole entitlement map for one tier (locked-UI preference — never
 *  enforcement; the routes re-decide from the plan row they read). */
export function entitlementsForPlan(plan: PlanTier): Record<PlanFeatureKey, boolean> {
  return {
    reports: planAllowsFeature(plan, "reports"),
    csvExport: planAllowsFeature(plan, "csvExport"),
  };
}

/** The family's feature-denial copy — ONE literal per feature across
 *  every site (the Smart-Menu W7-B twin wording, so the family speaks
 *  one sentence). Upgrade-shaped, Arabic, names the minimum plan. */
export function planFeatureDeniedCopy(feature: PlanFeatureKey): string {
  const { minPlanNameAr } = PLAN_FEATURES[feature];
  return `هذه الميزة متوفرة في خطة «${minPlanNameAr}» فأعلى. قم بالترقية للمتابعة.`;
}

/** The short lock label for disabled buttons (rides next to a /pricing
 *  link — the pricing surface is the family's upgrade destination). */
export function planFeatureLockLabel(feature: PlanFeatureKey): string {
  const { minPlanNameAr, labelAr } = PLAN_FEATURES[feature];
  return `${labelAr} متوفرة في خطة «${minPlanNameAr}» — قم بالترقية`;
}
