// P42 (Wave 1 §1) — the plan RESOURCE caps: categories + delivery zones.
//
// THE FAMILY LAW (the W2-D2 plan-truth doctrine): a number a card sells is a
// contract — the Free card sells «3 أقسام» and «منطقة توصيل واحدة», and the
// Basic card sells «أقسام غير محدودة» / «مناطق توصيل متعددة». Until P42 the
// gates were GLOBAL literals no card ever promised (50 categories / 40
// zones): a Free business could stack 47 categories past its promise, and a
// Basic business would be stopped far short of the «غير محدودة» its card
// sells. The caps are now PER-PLAN.
//
// THE SEAM (the plan-entitlements-core contract): the plans table carries
// NO category/zone column — the pricing cards are the only source of the
// promise — so, exactly like the staff route's TEAM_SEATS_BY_PLAN, the cap
// is derived from the plan NAME against the family catalog and the paid
// fallback is the practical-«unlimited» sanity bound (500 categories /
// 200 zones — the family's «unlimited» convention adapted to what a real
// menu could ever hold). An unrecognized plan name reads the PAID bound:
// the map's default IS the paid-tier promise, and currentPlan() (every
// route's own twin) has already resolved null/expired to the Free ROW —
// the only caller that can reach the fallback with a non-Free name is a
// genuinely paid (or renamed) catalog row.
//
// PURE half only (zero imports — node --test reads it bare; client
// components never drag the database into their bundle): the routes keep
// their own in-transaction currentPlan twin (the count gate shares one tx
// with the mutation — the W3-F row-lock contract) and read the decision
// from here.

/** Free's card sells «3 أقسام» — the only plan that names a category number. */
export const CATEGORY_CAPS_BY_PLAN: Record<string, number> = { Free: 3 };

/** The paid tiers' practical-«unlimited» category bound («أقسام غير محدودة»). */
export const PAID_CATEGORY_CAP = 500;

/** Free's card sells «منطقة توصيل واحدة» — the only plan that names a zone number. */
export const ZONE_CAPS_BY_PLAN: Record<string, number> = { Free: 1 };

/** The paid tiers' practical-«unlimited» zone bound («مناطق توصيل متعددة»). */
export const PAID_ZONE_CAP = 200;

/** The category ceiling a plan of this name carries (Free 3; paid 500). */
export function categoryCapFor(planName: string): number {
  return CATEGORY_CAPS_BY_PLAN[planName] ?? PAID_CATEGORY_CAP;
}

/** The delivery-zone ceiling a plan of this name carries (Free 1; paid 200). */
export function zoneCapFor(planName: string): number {
  return ZONE_CAPS_BY_PLAN[planName] ?? PAID_ZONE_CAP;
}

/** The refusal copy — the family's product-limit wording (the plan's OWN
 *  number rides the message; 409 PLAN_LIMIT carries it out of the tx). */
export function categoryCapMessage(cap: number): string {
  return `لقد وصلت للحد الأقصى للأقسام (${cap}) في خطتك. قم بترقية خطتك لإضافة المزيد.`;
}

/** The refusal copy for zones — the same family sentence shape. */
export function zoneCapMessage(cap: number): string {
  return `لقد وصلت للحد الأقصى لمناطق التوصيل (${cap}) في خطتك. قم بترقية خطتك لإضافة المزيد.`;
}
