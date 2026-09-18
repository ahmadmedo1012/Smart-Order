/**
 * Idempotent family seed: plans catalog (Smart Menu parity) + the public
 * demo store the landing header links to. Safe to re-run — upserts by
 * natural keys. Works against the DATABASE_URL it is invoked with.
 *
 * Usage: node scripts/seed-family.js
 */
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

const PLANS = [
  {
    name: "Free",
    nameAr: "مجاني",
    price: 0,
    periodDays: 30,
    maxProducts: 15,
    maxOrders: 100,
    sortOrder: 1,
    features: [
      "متجر رقمي يعمل فوراً",
      "١٥ منتجاً و٣ أقسام",
      "١٠٠ طلب شهرياً",
      "منطقة توصيل واحدة",
      "طرق دفع محلية",
    ],
  },
  {
    name: "Basic",
    nameAr: "أساسي",
    price: 19,
    periodDays: 30,
    maxProducts: 100,
    maxOrders: 1000,
    sortOrder: 2,
    features: [
      "كل ميزات المجانية",
      "١٠٠ منتج وأقسام غير محدودة",
      "١٠٠٠ طلب شهرياً",
      "مناطق توصيل متعددة",
      "تتبع مباشر للعميل",
      "دعم فني عبر واتساب",
    ],
  },
  {
    name: "Premium",
    nameAr: "بريميوم",
    price: 29,
    periodDays: 30,
    maxProducts: 9999,
    maxOrders: 10000,
    sortOrder: 3,
    features: [
      "كل ميزات الأساسي",
      "منتجات غير محدودة",
      "١٠٠٠٠ طلب شهرياً",
      "حسابات فريق (٣ أعضاء)",
      "إشعارات واتساب فورية",
      "تقارير أداء أسبوعية",
      "دعم أولوية",
    ],
  },
  {
    name: "Pro",
    nameAr: "احترافي",
    price: 129,
    periodDays: 30,
    maxProducts: 9999,
    maxOrders: 99999,
    sortOrder: 4,
    features: [
      "كل ميزات بريميوم",
      "طلبات غير محدودة",
      "فريق غير محدود",
      "متاجر متعددة من حساب واحد",
      "إحصاءات متقدمة",
      "مدير حساب مخصص",
    ],
  },
];

const DEMO_PRODUCTS = [
  { name: "بيتزا مارغريتا", cat: "بيتزا", price: 45000, desc: "صوص طماطم، موزاريلا، ريحان طازج", featured: true },
  { name: "بيتزا خضراء", cat: "بيتزا", price: 45000, desc: "خضار الموسم مع الجبنة", featured: false },
  { name: "برجر دجاج كبير", cat: "برجر", price: 23500, desc: "صدر دجاج مقرمش مع صوص خاص", featured: false },
  { name: "برجر لحم كلاسيك", cat: "برجر", price: 28000, desc: "لحم طازج على الفحم", featured: true },
  { name: "عصير برتقال طازج", cat: "مشروبات", price: 9000, desc: "برتقال طبيعي ١٠٠٪", featured: false },
  { name: "شاي أخضر بالنعنع", cat: "مشروبات", price: 5000, desc: "شاي بالنعنع الطازج", featured: false },
];

async function main() {
  // ── Plans ──
  for (const plan of PLANS) {
    await db.plan.upsert({
      where: { name: plan.name },
      update: {
        nameAr: plan.nameAr,
        price: plan.price,
        periodDays: plan.periodDays,
        maxProducts: plan.maxProducts,
        maxOrders: plan.maxOrders,
        sortOrder: plan.sortOrder,
        features: JSON.stringify(plan.features),
        isActive: true,
      },
      create: { ...plan, features: JSON.stringify(plan.features) },
    });
  }
  console.log(`seeded ${PLANS.length} plans`);

  const free = await db.plan.findUnique({ where: { name: "Free" } });

  // ── Demo store ──
  let demo = await db.business.findUnique({
    where: { slug: "demo-store" },
    include: { categories: true, paymentMethods: true, deliveryZones: true },
  });

  if (!demo) {
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
    console.log("created demo-store");
  } else {
    console.log("demo-store exists");
  }

  // Products
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
          sortOrder: 0,
        },
      });
    }
    console.log(`seeded ${DEMO_PRODUCTS.length} demo products`);
  }

  // Payment methods
  if (demo.paymentMethods.length === 0) {
    const pmDefs = [
      { type: "COD", name: "الدفع عند التوصيل", instructions: "ادفع نقداً عند وصول طلبك", config: null, sortOrder: 1 },
      { type: "LIBYANA", name: "ليبيانا", instructions: "حوّل المبلغ على الرقم الظاهر ثم أكمل الطلب", config: JSON.stringify({ number: "0942119637" }), sortOrder: 2 },
      { type: "MADAR", name: "مدار", instructions: "حوّل المبلغ على الرقم الظاهر ثم أكمل الطلب", config: JSON.stringify({ number: "0910089975" }), sortOrder: 3 },
    ];
    for (const pm of pmDefs) {
      await db.paymentMethod.create({ data: { businessId: demo.id, ...pm } });
    }
    console.log("seeded demo payment methods");
  }

  // Delivery zones
  if (demo.deliveryZones.length === 0) {
    await db.deliveryZone.create({
      data: { businessId: demo.id, name: "تاجوراء", fee: 8000, minOrder: 30000, isActive: true },
    });
    await db.deliveryZone.create({
      data: { businessId: demo.id, name: "وسط المدينة", fee: 5000, minOrder: 20000, isActive: true },
    });
    console.log("seeded demo delivery zones");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
