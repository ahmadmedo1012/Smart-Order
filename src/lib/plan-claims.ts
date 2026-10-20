// Plan-features claim healing — the P13-2d read-seam precedent applied to
// a COPY drift (W6-B4).
//
// THE VERIFIED CLAIM (W6-A2 live pricing probe + the seeds): the Premium
// card promised «إشعارات واتساب فورية» — instant WhatsApp notifications.
// Reality (code-traced):
//   · order create returns a wa.me deep link the CUSTOMER taps to SEND
//     the structured order message to the business (public/orders/route.ts
//     buildOrderMessage + checkout success-screen.tsx) — customer-initiated;
//   · the dashboard order detail carries a manual «واتساب» action that
//     opens a pre-built confirmation + tracking-link message to the
//     customer (orders/[id]/page.tsx customerWa) — owner-initiated;
//   · NOTHING is automatic or instant on arrival: the owner-side
//     notification is the dashboard's 20s visibility-gated poll + toast,
//     and no WhatsApp Business API / push exists anywhere.
// So «إشعارات … فورية» over-promises; what is real is link-based WhatsApp
// order/confirmation messages (on every plan). The seeds now say that, and
// this seam heals the rows that were seeded before the reword — the plans
// table is seed-on-EMPTY (api/plans ensurePlansSeeded), so existing rows
// (production included) never re-seed. Same doctrine as the digit fold:
// display-time only, the DB is never rewritten; both plan read seams
// (api/plans safeParseFeatures + pricing/page.tsx safeParse) apply it, so
// the register wizard and the pricing page can never disagree.
// Pure function, no "use client" — importable from server routes AND the
// client-side fold pipeline; node --test imports it bare.

/** Known-bad legacy feature bullets → their truthful replacements. */
const LEGACY_CLAIMS: Record<string, string> = {
  // the only verified over-promises so far — see the block comments above
  "إشعارات واتساب فورية": "رسائل واتساب للطلبات والتأكيدات",
  /* W6-B7 (W6-B4's flagged residual): Premium promised «تقارير أداء
     أسبوعية» — scheduled weekly reports. Reality (code-traced after
     W6-B4 shipped the surface): reports ARE real and owner-reachable,
     but ON-DEMAND (/dashboard/reports — 30/90-day windows, best
     sellers, CSV), never scheduled/emailed weekly. The truthful bullet
     says on-demand. W7-D CLOSED the entitlement breadth this flagged:
     the surface is now genuinely بريميوم+ (lib/plan-entitlements-core
     PLAN_FEATURES.reports) — the claim and the gate finally agree. */
  "تقارير أداء أسبوعية": "تقارير أداء عند الطلب",
  /* W7-D: Pro promised «إحصاءات متقدمة» — a deeper analytics layer.
     Reality (code-traced this wave): the reports surface is the ONLY
     trend/best-seller surface (now بريميوم+), and the one real
     Pro-level analytics differentiator is the CSV export artifact
     (/api/dashboard/reports/export, gated احترافي+). The seeds now
     sell «تصدير CSV للتقارير»; this entry heals the rows seeded with
     the over-promising bullet (production included — same seed-on-EMPTY
     doctrine as above). */
  "إحصاءات متقدمة": "تصدير CSV للتقارير",
};

/** Heal one feature bullet at read time; everything else passes through
 *  byte-identical. Idempotent — already-healed rows carry the new string,
 *  which this map never matches. */
export function healPlanClaim(feature: string): string {
  return LEGACY_CLAIMS[feature] ?? feature;
}
