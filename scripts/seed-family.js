/**
 * Idempotent family seed: plans catalog (Smart Menu parity) + the public
 * demo store the landing header links to. Safe to re-run — upserts by
 * natural keys. Works against the DATABASE_URL it is invoked with.
 *
 * P14 (2-d/3-d): feature bullets no longer restate the numeric limits
 * (المنتجات/الطلبات الشهرية) — the plan card's limits block is the single
 * visual carrier of those two numbers; pre-fold rows heal at display time
 * via lib/plan-types.ts foldRestatedLimits.
 *
 * P29-C3 (deploy-time seed — the blind-spot class retire): the Vercel
 * buildCommand runs this AFTER `prisma generate` so the deployed code and
 * the demo data can never drift apart again. The P29-C2 photo refresh
 * shipped in code but production kept `imageUrl: null` for three days
 * because the prescribed manual `POST /api/seed?secret=…` needed a secret
 * nobody ran — "deployed code" must imply "current demo data" structurally.
 *
 * Exit semantics (both intentional):
 *   - Invoked WITHOUT SEED_STRICT: a failure prints a loud [SEED] banner and
 *     exits 0 — a cold/missing DB must never block a deploy (same philosophy
 *     as vercel-db-sync.mjs: a shipped app beats a frozen one).
 *   - Invoked with SEED_STRICT=1 (local/QA): the historical exit 1 on error
 *     is preserved — direct invocations stay loud.
 *
 * Usage: node scripts/seed-family.js          (deploy/non-blocking)
 *        SEED_STRICT=1 node scripts/seed-family.js   (local, strict)
 */
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

/* P30-A (§6 preview isolation): a Vercel preview build must never mutate
 * the database it is pointed at (preview env vars are shared with
 * production unless deliberately scoped — the guard is structural, not
 * config-dependent). Opt-in for a genuinely dedicated preview database:
 * SEED_ALLOW_PREVIEW=1. Local/CI invocations (no VERCEL_ENV) stay ungated
 * — identical behavior to pre-P30. */
if (process.env.VERCEL_ENV === "preview" && process.env.SEED_ALLOW_PREVIEW !== "1") {
  console.log("[SEED] SKIPPED — Vercel preview build (demo data is production-only by default; set SEED_ALLOW_PREVIEW=1 for a dedicated preview database)");
  process.exit(0);
}

/* P30-A (§6 ownership): the demo slug is only ever mutated when the row
 * found there carries the demo identity. A merchant row at «demo-store»
 * (possible only from a pre-RESERVED registration) makes every demo
 * mutation skip loudly instead of touching merchant records — the seed
 * never "refreshes" photos or tops up payment methods on a store it
 * does not own. */
const DEMO_STORE_NAME = "مخبز الواحة — تجريبي";

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
      "3 أقسام",
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
      "أقسام غير محدودة",
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
      "حسابات فريق (3 أعضاء)",
      "رسائل واتساب للطلبات والتأكيدات",
      "تقارير أداء عند الطلب",
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
      "فريق غير محدود",
      "متاجر متعددة من حساب واحد",
      "تصدير CSV للتقارير", // W7-D: the honest Pro bullet — the CSV export is the only real Pro-level analytics differentiator (reports itself is بريميوم+)
      "مدير حساب مخصص",
    ],
  },
];

/* P29-C2 (demo imagery — twin of api/seed): real menu photography for the
   flagship demo store (public/demo/*); letter-monogram fallback stays for
   real merchants' photo-less products. */
const DEMO_PRODUCTS = [
  { name: "بيتزا مارغريتا", cat: "بيتزا", price: 45000, desc: "صوص طماطم، موزاريلا، ريحان طازج", featured: true, img: "/demo/margherita.jpg" },
  { name: "بيتزا خضراء", cat: "بيتزا", price: 45000, desc: "خضار الموسم مع الجبنة", featured: false, img: "/demo/green-pizza.jpg" },
  { name: "برجر دجاج كبير", cat: "برجر", price: 23500, desc: "صدر دجاج مقرمش مع صوص خاص", featured: false, img: "/demo/chicken-burger.jpg" },
  { name: "برجر لحم كلاسيك", cat: "برجر", price: 28000, desc: "لحم طازج على الفحم", featured: true, img: "/demo/beef-burger.jpg" },
  { name: "عصير برتقال طازج", cat: "مشروبات", price: 9000, desc: "برتقال طبيعي 100٪", featured: false, img: "/demo/orange-juice.jpg" },
  { name: "شاي أخضر بالنعنع", cat: "مشروبات", price: 5000, desc: "شاي بالنعنع الطازج", featured: false, img: "/demo/mint-tea.jpg" },
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
        name: DEMO_STORE_NAME,
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
  } else if (demo.name !== DEMO_STORE_NAME) {
    console.error("[SEED] ─────────────────────────────────────────────────────");
    console.error("[SEED] ⚠ slug «demo-store» is occupied by a NON-DEMO business:");
    console.error(`[SEED]   «${demo.name}» — every demo mutation is SKIPPED.`);
    console.error("[SEED]   The family seed never touches merchant records.");
    console.error("[SEED]   (The plans catalog above is still seeded — code-owned.)");
    console.error("[SEED]   If unexpected, investigate the business row before");
    console.error("[SEED]   the next deploy.");
    console.error("[SEED] ─────────────────────────────────────────────────────");
    return { demoSkipped: true };
  } else {
    console.log("demo-store exists");
  }

  // Products — P29-C2: idempotent by name (create missing, refresh the
  // curated photo on existing — the count===0 gate could never upgrade an
  // already-seeded demo store).
  {
    const existing = await db.product.findMany({ where: { businessId: demo.id, isArchived: false } });
    let createdCount = 0;
    let refreshed = 0;
    for (const p of DEMO_PRODUCTS) {
      const match = existing.find((e) => e.name === p.name);
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
            sortOrder: 0,
            imageUrl: p.img,
          },
        });
        createdCount++;
      } else if (match.imageUrl !== p.img) {
        await db.product.update({ where: { id: match.id }, data: { imageUrl: p.img } });
        refreshed++;
      }
    }
    console.log(`demo products: ${createdCount} created, ${refreshed} photo-refreshed`);
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
  .then((result) => {
    if (result && result.demoSkipped) {
      console.log("[SEED] ▲ family seed finished — plans seeded; demo section SKIPPED (slug «demo-store» is not the demo — see banner above)");
    } else {
      console.log("[SEED] ✓ family seed complete (plans + demo-store, idempotent)");
    }
  })
  .catch((e) => {
    console.error("[SEED] ─────────────────────────────────────────────────────");
    console.error("[SEED] ⚠ family seed did NOT complete:");
    console.error(e);
    if (process.env.SEED_STRICT === "1") {
      console.error("[SEED] (SEED_STRICT — strict invocation, exiting 1)");
      process.exit(1);
    }
    console.error("[SEED] Non-strict invocation (deploy chain): the deploy");
    console.error("[SEED] PROCEEDS — the app does not need demo data to build.");
    console.error("[SEED] Fix DATABASE_URL reachability to restore seed-on-deploy.");
    console.error("[SEED] ─────────────────────────────────────────────────────");
    process.exit(0);
  })
  .finally(() => db.$disconnect());
