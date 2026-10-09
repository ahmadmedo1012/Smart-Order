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

/** Western digits with thousands separators — hydration-safe (family policy). */
export function toArabicNumber(n: number): string {
  return n.toLocaleString("en-US");
}
