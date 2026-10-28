import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, handleError } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { dbRateLimit, clientIp } from "@/lib/rate-limit";
import { timingSafeEqualStr } from "@/lib/timing-safe";

export const runtime = "nodejs";

/**
 * POST /api/seed?secret=… — idempotent family seed (Smart Menu /api/seed
 * twin): the public demo store + the plans catalog. Authorised by either
 * a platform-admin session or the SEED_SECRET env value.
 */
/**
 * P29-C2 (demo imagery): the flagship demo store the landing CTA points
 * to now carries real menu photography (public/demo/*, deterministic
 * repo-served assets) — the letter-monogram fallback stays for real
 * merchants' photo-less products, but the showcase demonstrates the full
 * photo experience the product sells.
 */
const DEMO_PRODUCTS = [
  { name: "بيتزا مارغريتا", cat: "بيتزا", price: 45000, desc: "صوص طماطم، موزاريلا، ريحان طازج", featured: true, img: "/demo/margherita.jpg" },
  { name: "بيتزا خضراء", cat: "بيتزا", price: 45000, desc: "خضار الموسم مع الجبنة", featured: false, img: "/demo/green-pizza.jpg" },
  { name: "برجر دجاج كبير", cat: "برجر", price: 23500, desc: "صدر دجاج مقرمش مع صوص خاص", featured: false, img: "/demo/chicken-burger.jpg" },
  { name: "برجر لحم كلاسيك", cat: "برجر", price: 28000, desc: "لحم طازج على الفحم", featured: true, img: "/demo/beef-burger.jpg" },
  { name: "عصير برتقال طازج", cat: "مشروبات", price: 9000, desc: "برتقال طبيعي 100%", featured: false, img: "/demo/orange-juice.jpg" },
  { name: "شاي أخضر بالنعنع", cat: "مشروبات", price: 5000, desc: "شاي بالنعنع الطازج", featured: false, img: "/demo/mint-tea.jpg" },
];

export async function POST(req: NextRequest) {
  try {
    /* r140 (P3-8): حد معدل قبل أي بحث جلسة/قاعدة — المسار الوحيد من
       المسارات الحساسة السبعة الذي كان مفتوحًا لكل طلب مجهول (بقية
       المسارات محدودة؛ نفس نمط media/upload مع Retry-After من r138). */
    const rl = await dbRateLimit(`seed:${clientIp(req)}`, 5, 10 * 60 * 1000);
    if (!rl.ok) {
      return fail("عدد كبير من المحاولات، انتظر قليلاً", 429, undefined, { "retry-after": String(rl.retryAfterSec) });
    }

    const secret = req.nextUrl.searchParams.get("secret");
    const envSecret = process.env.SEED_SECRET;
    /* W6-B4 (audit P3-a): كان المقارنة `===` سريعة الانقطاع — مقارنة قيمة
       السر عبر توقيت المسار تكشف محارفه تباعا. الآن عبر timingSafeEqualStr
       (lib/timing-safe — تجزئة الطرفين لثابت الطول ثم timingSafeEqual):
       السر الخاطئ والغائب والطول المختلف كلها نفس التكلفة ونفس رد 403
       «غير مصرح» — لا يُعرف أيّها فشل. (البوابات الأخرى باقية كما هي:
       429 معدل المحاولات ثم جلسة مدير المنصة.) */
    let authorized = !!(envSecret && secret && timingSafeEqualStr(secret, envSecret));
    if (!authorized) {
      const user = await getAuthUser().catch(() => null);
      authorized = !!user?.isPlatformAdmin;
    }
    if (!authorized) return fail("غير مصرح", 403);

    const created = { store: false, products: 0, paymentMethods: 0, zones: 0 };

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

    /* P29-C2: idempotent by product name — create the missing, refresh the
       curated photo on the existing (the previous count===0 gate meant a
       re-seed could never upgrade an already-seeded demo store). */
    const existingProducts = await db.product.findMany({
      where: { businessId: demo.id, isArchived: false },
    });
    for (const p of DEMO_PRODUCTS) {
      const match = existingProducts.find((e) => e.name === p.name);
      if (!match) {
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
            imageUrl: p.img,
          },
        });
        created.products += 1;
      } else if (match.imageUrl !== p.img) {
        await db.product.update({ where: { id: match.id }, data: { imageUrl: p.img } });
        created.products += 1;
      }
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
