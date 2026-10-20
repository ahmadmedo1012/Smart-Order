// W7-D — the server-side reports CSV export (the Pro+ gate's real seam).
//
// W6-B4 built the export CLIENT-side («no second fetch, no server CSV
// surface to own») — which meant NO seam a plan gate could refuse: anyone
// who could read the reports data could rebuild the artifact. The family
// closed the identical hole in Smart-Menu this same wave (W6-A3#5's free
// browser-side aggregation → W7-B's gated /api/orders/export): the sold
// feature is the ONE-TAP EXPORT ARTIFACT, and a gate needs the seam the
// export consumes. The export is therefore a real route:
//   · «تصدير CSV للتقارير» is sold on احترافي (the reworded Pro bullet)
//     — below-tier callers get the family's 403 PLAN_ENTITLEMENT copy
//     BEFORE any aggregation runs (the tier read is the only cost);
//   · the body is the W6-B4 builder VERBATIM (lib/report-csv.ts, with
//     the W6-B8 formula-injection guard) over the SAME aggregation the
//     reports page shows (lib/reports-queries.ts) — the exported file
//     can never disagree with the screen;
//   · UTF-8 BOM (Excel-safe Arabic headers) + the honest W6-B4 filename
//     (product + slug + window + Tripoli stamp) in Content-Disposition;
//   · no row cap: the window contract already bounds the cost — the
//     export's aggregation is byte-identical to the ungated reports
//     GET's (30/90-day windows, top-10 products), so it carries no
//     extra limiter: same cost, same surface class;
//   · STAFF with orders.read may export for a Pro business (the
//     entitlement rides the BUSINESS's tier — the W2-D2 count-gate
//     semantics; permission decides WHO, the tier WHAT).
// One-line revert for the pricing owner: PLAN_FEATURES.csvExport
// .minSortOrder 4→3 in lib/plan-entitlements-core.ts.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireBusiness, requirePermission } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { resolveBusinessPlanTier, assertPlanFeature } from "@/lib/plan-entitlements";
import { getReportData, type ReportsWindowDays } from "@/lib/reports-queries";
import { buildReportCsv, reportCsvFileName } from "@/lib/report-csv";

export const runtime = "nodejs";

/* The reports route's window contract verbatim — the export serves the
   window the screen shows, nothing wider. */
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

    /* W7-D: the Pro+ gate — before any aggregation; the tier read is the
       only DB cost a refused call pays. */
    const tier = await resolveBusinessPlanTier(businessId);
    assertPlanFeature(tier, "csvExport");

    /* The refine above already rejects anything but 30/90 — this is the
       type-level narrowing of the SAME contract (never a second
       behavior). */
    const days: ReportsWindowDays = q.days === 90 ? 90 : 30;

    const [biz, data] = await Promise.all([
      db.business.findUnique({
        where: { id: businessId },
        select: { slug: true, name: true },
      }),
      getReportData(businessId, days),
    ]);

    const csv = buildReportCsv(data, biz?.name ?? "");
    /* UTF-8 BOM keeps Excel reading the Arabic headers correctly (the
       W6-B4 transport contract, now server-side). */
    const body = `\uFEFF${csv}`;
    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": "text/csv;charset=utf-8",
        "content-disposition": `attachment; filename="${reportCsvFileName(biz?.slug ?? "store", days)}"`,
        /* The export is a point-in-time artifact owned by its stamp —
           never a shared-cache candidate. */
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
