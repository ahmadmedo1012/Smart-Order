// W7-D — the SERVER half of the plan feature gates: the tier read + the
// assert. The pure ladder/copy lives in plan-entitlements-core.ts (zero
// imports — node --test + client-safe); this file carries the database
// and is imported by routes only.
//
// SINGLE PLAN-READ POINT for feature gates: resolveBusinessPlanTier is
// the W2-D2 currentPlan contract extracted for read-path gates —
//   · business.planId is written by the platform-admin approval
//     (/api/subscriptions/[id]/review) and subscriptionEnds is that
//     approval's expiry: a PAID plan past its window degrades to the
//     Free row («يظل متجرك نشطاً حتى نهاية الفترة المدفوعة» — the
//     family's lapsed-subscription law);
//   · a null planId (the register flow writes none) resolves to the
//     Free ROW — the seeded catalog is the single source of the
//     promised numbers;
//   · a never-seeded plans table falls to the Free literal tail
//     (sortOrder 1) so the gate fails CLOSED, never open (the W2-D2
//     doctrine, mirrored here — product gates are not money paths).
// The three W2-D2 count gates keep their own in-transaction twins
// (they share one tx with the mutation being gated — the CAS race
// contract); this read-path resolver serves the feature gates, where
// no mutation follows and a plain read is the whole cost.

import { db } from "@/lib/db";
import { ApiFailError } from "@/lib/api";
import {
  planAllowsFeature,
  planFeatureDeniedCopy,
  type PlanFeatureKey,
  type PlanTier,
} from "@/lib/plan-entitlements-core";

export * from "@/lib/plan-entitlements-core";

export interface BusinessPlanTier {
  name: string | null;
  nameAr: string | null;
  sortOrder: number | null;
}

/** Resolve the business's CURRENT tier for a feature-gate decision —
 *  the W2-D2 currentPlan semantics, read-path edition (see the block
 *  comment above). Two indexed reads worst case: the business row (with
 *  its plan relation) and, on the Free fallback, the Free plan row. */
export async function resolveBusinessPlanTier(businessId: string): Promise<BusinessPlanTier> {
  const biz = await db.business.findUnique({
    where: { id: businessId },
    select: {
      subscriptionEnds: true,
      plan: { select: { name: true, nameAr: true, sortOrder: true } },
    },
  });
  const expired = !!biz?.subscriptionEnds && biz.subscriptionEnds.getTime() <= Date.now();
  if (biz?.plan && !expired) return biz.plan;
  const free = await db.plan.findFirst({
    where: { name: "Free" },
    select: { name: true, nameAr: true, sortOrder: true },
  });
  return free ?? { name: "Free", nameAr: "مجاني", sortOrder: 1 };
}

/** The feature gate for read-path routes — call AFTER the auth/
 *  membership/permission guards and BEFORE any feature work (the
 *  aggregation, the export build). Below tier it throws the family's
 *  403 ApiFailError (handleError maps it to fail(msg, 403,
 *  "PLAN_ENTITLEMENT")), so the refusal carries its exact Arabic copy
 *  and a code the locked UI can recognize. Role semantics follow the
 *  product's RBAC: the entitlement rides the BUSINESS's plan, exactly
 *  like the W2-D2 count gates — OWNER and STAFF of a Free business
 *  meet the same gate (a platform admin has no business membership to
 *  reach these routes with; membership is requireBusiness's law). */
export function assertPlanFeature(tier: PlanTier, feature: PlanFeatureKey): void {
  if (!planAllowsFeature(tier, feature)) {
    throw new ApiFailError(planFeatureDeniedCopy(feature), 403, "PLAN_ENTITLEMENT");
  }
}
