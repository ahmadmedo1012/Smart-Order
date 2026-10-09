import type { Metadata } from "next";
import { PricingClient } from "@/components/pricing/pricing-client";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  /* r132 (F1c, A11 P1/P2): suffix stripped — the root template already
     appends " | سمارت أوردر" (hardcoding it here produced the double
     suffix "… | سمارت أوردر | سمارت أوردر" in tabs + SERP). Canonical
     added (marketing pages had none). */
  title: "الباقات والأسعار",
  description: "خطط سمارت أوردر — ابدأ مجاناً وارتقِ متى ما كبر عملك. أسعار بالدينار الليبي.",
  alternates: { canonical: "/pricing" },
};

/* r131-F2 (SO-2, A8 perf): pricing left force-dynamic — ISR 60s (the plan
 * catalog changes rarely; 60s staleness is the SM-precedented profile). */
export const revalidate = 60;

/** Server-rendered initial plans (SEO-visible, no post-hydrate waterfall). */
async function getPlans() {
  try {
    const plans = await db.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return plans.map((p) => ({
      id: p.id,
      name: p.name,
      nameAr: p.nameAr,
      price: p.price,
      periodDays: p.periodDays,
      maxProducts: p.maxProducts,
      maxOrders: p.maxOrders,
      sortOrder: p.sortOrder,
      features: safeParse(p.features),
    }));
  } catch {
    return null;
  }
}

function safeParse(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((f) => typeof f === "string") : [];
  } catch {
    return [];
  }
}

export default async function PricingPage() {
  const initialPlans = await getPlans();
  return <PricingClient initialPlans={initialPlans} />;
}
