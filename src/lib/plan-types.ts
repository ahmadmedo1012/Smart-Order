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

/** The subset the dashboard plan badge renders. */
export interface PlanSummary {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  maxProducts: number;
  maxOrders: number;
}

/** Fetch the public plan catalog (active plans, sortOrder asc). Throws on failure. */
export async function fetchPlans(): Promise<Plan[]> {
  const res = await fetch("/api/plans");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { data?: Plan[] };
  return json.data ?? [];
}

/** Western digits with thousands separators — hydration-safe (family policy). */
export function toArabicNumber(n: number): string {
  return n.toLocaleString("en-US");
}
