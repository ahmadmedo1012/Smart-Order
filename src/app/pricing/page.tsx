import type { Metadata } from "next";
import { PricingClient } from "@/components/pricing/pricing-client";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "الباقات والأسعار | سمارت أوردر",
  description: "خطط سمارت أوردر — ابدأ مجاناً وارتقِ متى ما كبر عملك. أسعار بالدينار الليبي.",
};

export const dynamic = "force-dynamic";

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
