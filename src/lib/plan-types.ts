"use client";

/** Family plan type (Smart Menu plan-types.ts twin, string ids for cuid). */
export interface Plan {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  periodDays: number;
  maxProducts: number;
  maxOrders: number;
  sortOrder: number;
  features: string[];
}

/** Western digits with ar-LY dot thousands grouping ("2.990") — the
 * fleet canon (r133 A12 S1/R6: ONE grouping regime; was en-US commas,
 * so the pricing page rendered "2,990" next to CountUp's ar-LY
 * "2.990"). Hand-rolled, not Intl, so the output is byte-identical on
 * server and client regardless of ICU build — hydration-safe (family
 * policy); matches Intl ar-LY exactly. */
export function toArabicNumber(n: number): string {
  const [int, frac] = String(n).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return frac ? `${grouped}.${frac}` : grouped;
}

/* ── P14 (2-d/3-d) — pricing display fold: ONE visual block per number ──
 *
 * The plan card's limits block (المنتجات / الطلبات الشهرية) is the single
 * visual carrier of maxProducts/maxOrders. Feature bullets that merely
 * restate those two numbers fold OUT at display time:
 *   · pure restatement ("100 طلب شهرياً", "منتجات غير محدودة" when the
 *     limits block already says غير محدود) → dropped;
 *   · mixed bullets keep their unique entitlement fragment —
 *     "15 منتجاً و3 أقسام" → "3 أقسام" (the 15 lives in the limits block,
 *     the 3-category entitlement survives).
 * Every genuine plan entitlement and commercial value is preserved — the
 * numbers just stop appearing twice in competing visual blocks on the same
 * card. Rows seeded before this fold heal at read (the P13-2d T3
 * westernNumerals precedent — folds are display-only, the DB is never
 * rewritten); the seeds themselves no longer carry the duplication.
 * Pure function → identical output on server and client (family hydration
 * policy). The local digit-fold mirrors lib/arabic.ts westernNumerals —
 * kept dependency-free so node --test imports the module bare. */

/** Same thresholds the register wizard's itemsPhrase uses for «غير محدود». */
const UNLIMITED_PRODUCTS = 9999;
const UNLIMITED_ORDERS = 99999;

function toWesternDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function foldOne(feature: string, maxProducts: number, maxOrders: number): string | null {
  /* digits normalized (Arabic-Indic → Western, pre-r133 rows) and grouping
   * separators stripped for MATCHING only ("10.000" ar-LY vs the bullet's
   * "10000"); returned text keeps its separators. */
  const folded = toWesternDigits(feature.trim());
  if (!folded) return null;
  const bare = folded.replace(/[.,٫]/g, "");
  const productsNum = toWesternDigits(String(maxProducts)).replace(/[.,]/g, "");
  const ordersNum = toWesternDigits(String(maxOrders)).replace(/[.,]/g, "");

  // 1) pure orders restatement: "N طلب شهرياً" / "N طلباً شهرياً"
  if (new RegExp(`^${escapeRe(ordersNum)}\\s*طلبا?ً?\\s*شهرياً$`).test(bare)) {
    return null;
  }
  // 2) products prefix: "N منتجاً و…" / "N منتج و…" → keep the tail
  //    (the entitlement after the «و»); nothing after the «و» → drop.
  //    Matched against `folded` (separators intact) so the slice indexes
  //    are exact — a bullet whose number carries grouping never matches
  //    here and passes through untouched (safe: not a plain restatement).
  const productsPrefix = new RegExp(`^${escapeRe(productsNum)}\\s*منتجا?ً?\\s*و\\s*`);
  const prefixMatch = folded.match(productsPrefix);
  if (prefixMatch) {
    const tail = folded.slice(prefixMatch[0]!.length).trim();
    return tail.length > 0 ? tail : null;
  }
  // 3) unlimited restatement — the limits block already says «غير محدود»
  if (maxProducts >= UNLIMITED_PRODUCTS && bare === "منتجات غير محدودة") {
    return null;
  }
  if (maxOrders >= UNLIMITED_ORDERS && bare === "طلبات غير محدودة") {
    return null;
  }
  return feature.trim();
}

/** Fold limit-restating feature bullets at display time — see the block
 *  comment above. Non-matching bullets pass through byte-identical. */
export function foldRestatedLimits(
  features: readonly string[],
  maxProducts: number,
  maxOrders: number,
): string[] {
  const out: string[] = [];
  for (const raw of features) {
    const folded = foldOne(raw, maxProducts, maxOrders);
    if (folded !== null) out.push(folded);
  }
  return out;
}
