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
  /* P40 (P2-1 — the W6-B4 twin's final leg): the reworded WhatsApp
     bullet is itself an ALL-PLAN capability — wa.me order/confirmation
     deep links are ungated (api/public/orders buildOrderMessage rides
     every plan; lib/whatsapp has no plan branch) and the tracking link
     it carries is the same publicToken every order gets. The bullet
     now lives in the pricing page's «دائماً في كل الباقات» baseline
     block, NOT on a tier card where it reads as a paid differentiator.
     Rows still carrying it (or its «إشعارات واتساب فورية» ancestor,
     which heals into it) fold OUT at display — the same seam, one
     step further. */
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

/* ── P40 (P1-3 + P2-1) — RETIRED claims: bullets with no truthful tier-card
 * replacement, folded OUT at display (never rewritten, never shown).
 *
 * THE EVIDENCE (code-traced, P40-5d):
 *   · «متاجر متعددة من حساب واحد» (P1-3, Pro): SOLD but UNIMPLEMENTED —
 *     only api/auth/register and api/seed create businesses; /api/business
 *     is GET+PATCH, no route/UI anywhere creates a second business. The
 *     two REAL Pro differentiators the audit suggested verifying (unlimited
 *     team via staff route 9999, CSV export) are ALREADY on the card —
 *     there is nothing truthful left to swap in, so the phantom folds out.
 *     Shipping multi-store stays a separate product decision (deferred).
 *   · «تتبع مباشر للعميل» (P2-1, Basic): ALL-PLAN — every order gets a
 *     publicToken (api/public/orders, no plan branch) and /track is public.
 *   · «دعم فني عبر واتساب» (P2-1 class, Basic): ALL-PLAN — one support
 *     number (SUPPORT_WHATSAPP), ungated, on every surface.
 *   · «متجر رقمي يعمل فوراً» (SO-2, Free): ALL-PLAN baseline — the register
 *     flow creates a store on every plan including Free; now spoken by the
 *     pricing page's «دائماً في كل الباقات» block instead of the Free card.
 *   · «رسائل واتساب للطلبات والتأكيدات» (P2-1, Premium): ALL-PLAN — see
 *     the LEGACY_CLAIMS comment above; also the heal TARGET of the old
 *     «إشعارات واتساب فورية», so healing runs FIRST and retirement catches
 *     both generations of the mis-sold bullet in one pass.
 *
 * The doctrine is unchanged: display-time only, the DB is never rewritten,
 * both plan read seams (api/plans safeParseFeatures + pricing/page.tsx
 * safeParse) apply it after the digit fold and the claim heal, so the
 * register wizard and the pricing page can never disagree. NO behavior
 * ever changes — tracking and WhatsApp links keep working on every plan
 * (the fix is to the CLAIMS, never a gate). */

/** Claims retired from tier-card display — all-plan baseline or
 *  unimplemented; the seams drop them (null) after healing. */
const RETIRED_CLAIMS: ReadonlySet<string> = new Set([
  "متاجر متعددة من حساب واحد",
  "تتبع مباشر للعميل",
  "دعم فني عبر واتساب",
  "متجر رقمي يعمل فوراً",
  "رسائل واتساب للطلبات والتأكيدات",
]);

/** Heal one feature bullet at read time; everything else passes through
 *  byte-identical. Returns null for RETIRED claims (fold out — the seams
 *  drop them) and for legacy claims whose healed replacement is retired.
 *  Idempotent — already-healed rows carry the new string, which the
 *  legacy map never matches, and retired strings never re-enter. */
export function healPlanClaim(feature: string): string | null {
  const healed = LEGACY_CLAIMS[feature] ?? feature;
  return RETIRED_CLAIMS.has(healed) ? null : healed;
}
