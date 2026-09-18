import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET /api/plans — public plan catalog (family twin of Smart Menu /api/plans):
 * active plans, sortOrder asc, features parsed from JSON.
 *
 * Self-seeding: on an empty plans table (fresh deployment) the family
 * catalog is upserted once, idempotently — so /pricing never renders an
 * empty state on a cold database (same philosophy as Smart Menu /api/seed).
 */
const FAMILY_PLANS = [
  {
    name: "Free",
    nameAr: "مجاني",
    price: 0,
    periodDays: 30,
    maxProducts: 15,
    maxOrders: 100,
    sortOrder: 1,
    features: ["متجر رقمي يعمل فوراً", "١٥ منتجاً و٣ أقسام", "١٠٠ طلب شهرياً", "منطقة توصيل واحدة", "طرق دفع محلية"],
  },
  {
    name: "Basic",
    nameAr: "أساسي",
    price: 19,
    periodDays: 30,
    maxProducts: 100,
    maxOrders: 1000,
    sortOrder: 2,
    features: ["كل ميزات المجانية", "١٠٠ منتج وأقسام غير محدودة", "١٠٠٠ طلب شهرياً", "مناطق توصيل متعددة", "تتبع مباشر للعميل", "دعم فني عبر واتساب"],
  },
  {
    name: "Premium",
    nameAr: "بريميوم",
    price: 29,
    periodDays: 30,
    maxProducts: 9999,
    maxOrders: 10000,
    sortOrder: 3,
    features: ["كل ميزات الأساسي", "منتجات غير محدودة", "١٠٠٠٠ طلب شهرياً", "حسابات فريق (٣ أعضاء)", "إشعارات واتساب فورية", "تقارير أداء أسبوعية", "دعم أولوية"],
  },
  {
    name: "Pro",
    nameAr: "احترافي",
    price: 129,
    periodDays: 30,
    maxProducts: 9999,
    maxOrders: 99999,
    sortOrder: 4,
    features: ["كل ميزات بريميوم", "طلبات غير محدودة", "فريق غير محدود", "متاجر متعددة من حساب واحد", "إحصاءات متقدمة", "مدير حساب مخصص"],
  },
];

async function ensurePlansSeeded() {
  const count = await db.plan.count();
  if (count > 0) return;
  for (const plan of FAMILY_PLANS) {
    await db.plan.upsert({
      where: { name: plan.name },
      update: { nameAr: plan.nameAr, price: plan.price, periodDays: plan.periodDays, maxProducts: plan.maxProducts, maxOrders: plan.maxOrders, sortOrder: plan.sortOrder, features: JSON.stringify(plan.features), isActive: true },
      create: { ...plan, features: JSON.stringify(plan.features) },
    });
  }
}

export async function GET() {
  try {
    await ensurePlansSeeded().catch(() => undefined);
    const plans = await db.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    const data = plans.map((p) => ({
      id: p.id,
      name: p.name,
      nameAr: p.nameAr,
      price: p.price,
      periodDays: p.periodDays,
      maxProducts: p.maxProducts,
      maxOrders: p.maxOrders,
      sortOrder: p.sortOrder,
      features: safeParseFeatures(p.features),
    }));

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: true, data: [] }, { status: 200 });
  }
}

function safeParseFeatures(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((f) => typeof f === "string") : [];
  } catch {
    return [];
  }
}
