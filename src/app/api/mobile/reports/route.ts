// P36 Phase C (C4) — the mobile merchant reports summary.
//
// The RN owner app's reports screen asks the web surface's question with
// the web surface's own accounting, but over the owner's chosen window
// (from/to calendar days, Tripoli) and with the status distribution the
// web reports response doesn't carry (the stats route's statusCounts are
// all-time; these are windowed). The aggregation is NOT duplicated: it
// lives in the W7-D extraction seam (lib/reports-queries.getReportSummary)
// beside the 30/90-day twin, so revenue/orders/AOV follow the reports
// exclusion convention (CANCELLED/REJECTED never count) and the series is
// the same zero-filled Tripoli day buckets.
//
// Authz is the family ladder verbatim, Bearer-first by namespace law:
// requireMobileSession (a cookie NEVER authenticates /api/mobile/* — C3)
// → requireBusiness (multi-tenant membership) → requirePermission(
// orders.read) → the W7-D Premium+ feature gate («تقارير أداء عند الطلب»
// is sold on بريميوم — a mobile surface that undercut the web gate would
// be the family's «paid feature with no gate» bug). Validation refuses
// before any aggregation query runs: malformed days, from > to, future
// windows, and spans beyond 366 days (the web route's bounded-window
// doctrine, widened to the app's honest maximum — a year of daily buckets
// keeps the group-by cost known).

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireMobileSession, requireBusiness, requirePermission } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/api";
import {
  resolveBusinessPlanTier,
  assertPlanFeature,
  planAllowsFeature,
} from "@/lib/plan-entitlements";
import { getReportSummary, tripoliDayInstant } from "@/lib/reports-queries";
import { tripoliDayStart, tripoliDateParts } from "@/lib/arabic";

export const runtime = "nodejs";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

const querySchema = z.object({
  businessId: z.string().optional(),
  from: z.string().regex(DAY_RE, "صيغة التاريخ: YYYY-MM-DD").optional(),
  to: z.string().regex(DAY_RE, "صيغة التاريخ: YYYY-MM-DD").optional(),
});

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Calendar-day key of a Tripoli-midnight instant. */
function dayKeyOf(ms: number): string {
  const { y, m, d } = tripoliDateParts(new Date(ms));
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** A real calendar day (round-trip: 2026-02-31 and friends never survive
 *  a Tripoli-midnight parse → parts round-trip), else null. */
function validDay(value: string): string | null {
  const ms = tripoliDayInstant(value);
  return Number.isFinite(ms) && dayKeyOf(ms) === value ? value : null;
}

export async function GET(req: NextRequest) {
  try {
    /* Bearer-only by contract — the C3 mobile-surface law. */
    const { user } = await requireMobileSession();
    const url = new URL(req.url);
    const q = querySchema.parse(Object.fromEntries(url.searchParams.entries()));
    const member = await requireBusiness(user, q.businessId);
    requirePermission(member, "orders.read");
    const businessId = member.businessId;

    /* Window resolution — default: the last 30 Tripoli calendar days
       (today included), the honest default every reporting screen opens
       on. Refusals below answer BEFORE the tier read and the aggregation
       (cheap validation first, the family's gate ordering). */
    const todayStart = tripoliDayStart();
    let fromDay = q.from ?? dayKeyOf(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000);
    let toDay = q.to ?? dayKeyOf(todayStart.getTime());

    if (q.from) {
      const v = validDay(q.from);
      if (!v) return fail("تاريخ البداية غير صحيح — صيغة التاريخ: YYYY-MM-DD", 422, "VALIDATION");
      fromDay = v;
    }
    if (q.to) {
      const v = validDay(q.to);
      if (!v) return fail("تاريخ النهاية غير صحيح — صيغة التاريخ: YYYY-MM-DD", 422, "VALIDATION");
      toDay = v;
    }
    if (tripoliDayInstant(fromDay) > tripoliDayInstant(toDay)) {
      return fail("تاريخ البداية بعد تاريخ النهاية", 422, "VALIDATION");
    }
    if (tripoliDayInstant(toDay) > todayStart.getTime()) {
      return fail("لا يمكن اختيار نافذة في المستقبل", 422, "VALIDATION");
    }
    const spanDays =
      (tripoliDayInstant(toDay) - tripoliDayInstant(fromDay)) / (24 * 60 * 60 * 1000) + 1;
    if (spanDays > 366) {
      return fail("النافذة كبيرة جداً — الحد الأقصى 366 يوماً", 422, "VALIDATION");
    }

    /* W7-D parity: the SAME بريميوم+ gate the web reports surface rides
       (resolved before any aggregation — a refused call pays only the
       tier read). */
    const tier = await resolveBusinessPlanTier(businessId);
    assertPlanFeature(tier, "reports");

    const summary = await getReportSummary(businessId, fromDay, toDay);

    return ok({
      ...summary,
      /* The server-truth CSV preference (احترافي+) — never enforcement;
         the export route (dual-transport, /api/dashboard/reports/export)
         decides from its own plan read. */
      canExportCsv: planAllowsFeature(tier, "csvExport"),
    });
  } catch (err) {
    return handleError(err);
  }
}
