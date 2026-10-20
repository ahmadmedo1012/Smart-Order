// Business reporting — "how is the business doing over time?"
// W6-B4 (audit W6-A4 gap #1): the dashboard overview answers «what needs
// my attention now»; this surface answers the owner's longer questions —
// best sellers, revenue trend, delivery mix — over a selectable 30/90-day
// window. Auth/permission scoping is the stats-route pattern verbatim:
// requireAuth → requireBusiness(businessId) → requirePermission(orders.read)
// (the audit's sketch — reporting is an orders-read surface, STAFF included).
//
// W7-D (the W6-B7 residual CLOSED): «تقارير أداء عند الطلب» is SOLD on
// بريميوم — until this commit it was readable by any plan with
// orders.read. The family law (SmartBot P21-W3-B #5: «a paid feature
// with no gate is a bug») now gates the whole surface at بريميوم+:
// the plan tier is resolved (W2-D2 currentPlan semantics — lapsed paid
// plans degrade to Free) and a below-tier call answers the family's
// 403 PLAN_ENTITLEMENT copy BEFORE any aggregation query runs (only
// the auth + plan-row reads precede the refusal). The one-line revert
// for the pricing owner: PLAN_FEATURES.reports.minSortOrder 3→1 in
// lib/plan-entitlements-core.ts. STAFF semantics ride the BUSINESS's
// plan exactly like the W2-D2 count gates — permission still decides
// WHO reads; the tier decides WHAT the business unlocked.
// The response carries canExportCsv (احترافي+) so the page can shape
// the CSV lock; the export itself is enforced at its own route.

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireBusiness, requirePermission } from "@/lib/auth";
import { ok, handleError } from "@/lib/api";
import {
  resolveBusinessPlanTier,
  assertPlanFeature,
  planAllowsFeature,
} from "@/lib/plan-entitlements";
import { getReportData, type ReportsWindowDays } from "@/lib/reports-queries";

export const runtime = "nodejs";

/* Window contract: 30 days (default) or 90 — the two honest, bounded
   windows the UI offers. Arbitrary client-chosen windows would invite
   unbounded group-by scans; the two catalogued ones keep the cost known. */
const querySchema = z.object({
  businessId: z.string().optional(),
  days: z.coerce
    .number()
    .int()
    .refine((v) => v === 30 || v === 90, "النافذة المدعومة: 30 أو 90 يوماً")
    .default(30),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const q = querySchema.parse(Object.fromEntries(url.searchParams.entries()));
    const member = await requireBusiness(user, q.businessId);
    requirePermission(member, "orders.read");
    const businessId = member.businessId;

    /* W7-D: the Premium+ gate — resolved BEFORE any feature work. The
       tier read is the only DB cost a refused call pays. */
    const tier = await resolveBusinessPlanTier(businessId);
    assertPlanFeature(tier, "reports");

    /* The refine above already rejects anything but 30/90 — this is the
       type-level narrowing of the SAME contract (never a second
       behavior). */
    const days: ReportsWindowDays = q.days === 90 ? 90 : 30;

    const data = await getReportData(businessId, days);

    return ok({
      ...data,
      /* The server-truth preference for the page's CSV lock (احترافي+).
         Never enforcement — /api/dashboard/reports/export decides from
         its own plan read. */
      canExportCsv: planAllowsFeature(tier, "csvExport"),
    });
  } catch (err) {
    return handleError(err);
  }
}
