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
