import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, handleError } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/seed?secret=… — idempotent family seed (Smart Menu /api/seed
 * twin): the public demo store + the plans catalog. Authorised by either
 * a platform-admin session or the SEED_SECRET env value.
 */
const DEMO_PRODUCTS = [
  { name: "بيتزا مارغريتا", cat: "بيتزا", price: 45000, desc: "صوص طماطم، موزاريلا، ريحان طازج", featured: true },
  { name: "بيتزا خضراء", cat: "بيتزا", price: 45000, desc: "خضار الموسم مع الجبنة", featured: false },
  { name: "برجر دجاج كبير", cat: "برجر", price: 23500, desc: "صدر دجاج مقرمش مع صوص خاص", featured: false },
  { name: "برجر لحم كلاسيك", cat: "برجر", price: 28000, desc: "لحم طازج على الفحم", featured: true },
  { name: "عصير برتقال طازج", cat: "مشروبات", price: 9000, desc: "برتقال طبيعي ١٠٠٪", featured: false },
  { name: "شاي أخضر بالنعنع", cat: "مشروبات", price: 5000, desc: "شاي بالنعنع الطازج", featured: false },
];

export async function POST(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get("secret");
    const envSecret = process.env.SEED_SECRET;
    let authorized = !!(envSecret && secret && secret === envSecret);
    if (!authorized) {
      const user = await getAuthUser().catch(() => null);
      authorized = !!user?.isPlatformAdmin;
    }
    if (!authorized) return fail("غير مصرح", 403);

    let created = { store: false, products: 0, paymentMethods: 0, zones: 0 };

    let demo = await db.business.findUnique({
      where: { slug: "demo-store" },
      include: { categories: true, paymentMethods: true, deliveryZones: true },
    });

    if (!demo) {
      const free = await db.plan.findUnique({ where: { name: "Free" } });
      demo = await db.business.create({
        data: {
          slug: "demo-store",
          name: "مخبز الواحة — تجريبي",
          description: "متجر تجريبي يعرض تجربة التسوق الكاملة في سمارت أوردر",
          city: "طرابلس",
          phone: "0910000000",
          whatsappNumber: "218910000000",
          isActive: true,
          isPublished: true,
          onboardingStep: 5,
          planId: free?.id,
          categories: {
            create: [
              { name: "بيتزا", sortOrder: 1 },
              { name: "برجر", sortOrder: 2 },
              { name: "مشروبات", sortOrder: 3 },
            ],
          },
        },
        include: { categories: true, paymentMethods: true, deliveryZones: true },
      });
      created.store = true;
    }

    const productCount = await db.product.count({ where: { businessId: demo.id, isArchived: false } });
    if (productCount === 0) {
      for (const p of DEMO_PRODUCTS) {
        const category = demo.categories.find((c) => c.name === p.cat);
        await db.product.create({
          data: {
            businessId: demo.id,
            categoryId: category?.id,
            name: p.name,
            description: p.desc,
            price: p.price,
            isAvailable: true,
            isFeatured: p.featured,
          },
        });
      }
      created.products = DEMO_PRODUCTS.length;
    }

    if (demo.paymentMethods.length === 0) {
      const pmDefs = [
        { type: "COD", name: "الدفع عند التوصيل", instructions: "ادفع نقداً عند وصول طلبك", config: null, sortOrder: 1 },
        { type: "LIBYANA", name: "ليبيانا", instructions: "حوّل المبلغ على الرقم الظاهر ثم أكمل الطلب", config: JSON.stringify({ number: "0942119637" }), sortOrder: 2 },
        { type: "MADAR", name: "مدار", instructions: "حوّل المبلغ على الرقم الظاهر ثم أكمل الطلب", config: JSON.stringify({ number: "0910089975" }), sortOrder: 3 },
      ];
      for (const pm of pmDefs) {
        await db.paymentMethod.create({ data: { businessId: demo.id, ...pm } });
      }
      created.paymentMethods = 3;
    }

    if (demo.deliveryZones.length === 0) {
      await db.deliveryZone.create({ data: { businessId: demo.id, name: "تاجوراء", fee: 8000, minOrder: 30000, isActive: true } });
      await db.deliveryZone.create({ data: { businessId: demo.id, name: "وسط المدينة", fee: 5000, minOrder: 20000, isActive: true } });
      created.zones = 2;
    }

    return ok({ seeded: created });
  } catch (err) {
    return handleError(err);
  }
}
