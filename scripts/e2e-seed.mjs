/**
 * E2E seed — بطارية المتصفح (Playwright) تعمل فوق قاعدة مخصصة file:./db/e2e.db.
 * البذرة: كتالوج الخطط + المتجر التجريبي العام (نفس بيانات /api/seed
 * و scripts/seed-family.js الحرفية — بلا اختلاق) + مستخدم تاجر OWNER
 * تسجّل مواصفات المتصفح دخوله عبر نموذج الدخول الحقيقي.
 *
 * حارس: يرفض العمل إلا على قاعدة e2e المخصصة — لا يزرع قاعدة التطوير
 * أبدًا (قاعدة التطوير الافتراضية — راجع .env.example).
 *
 * Usage (تُشغَّل تلقائيًا من playwright.config.ts webServer):
 *   DATABASE_URL="file:./db/e2e.db" node scripts/e2e-seed.mjs
 */
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/* بيانات الاعتماد التجريبية — صادقة وموثقة (CLAUDE.md §e2e)، قابلة
   للتجاوز عبر البيئة. كلمة المرور تُهشَّ بنفس خوارزمية التطبيق
   (src/lib/password.ts: PBKDF2-SHA512 · 600k دورة · 64 بايت). */
const MERCHANT_EMAIL = process.env.E2E_MERCHANT_EMAIL || "owner@demo.smart-order.ly";
const MERCHANT_PASSWORD = process.env.E2E_MERCHANT_PASSWORD || "E2e-Oasis-2026";
const MERCHANT_NAME = "مالك مخبز الواحة";

const ITERATIONS = 600_000;
const KEYLEN = 64;
const DIGEST = "sha512";

function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST);
  return `pbkdf2$${ITERATIONS}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

/* ── نفس بيانات seed-family.js / api/seed (idempotent by natural keys) ──
   P14 (2-d/3-d): الميزات لم تعد تعيد ذكر الحدود الرقمية (المنتجات/الطلبات
   الشهرية) — خانتا الحد في بطاقة الباقة هما حامل الرقم الوحيد؛ القديم
   يُطوى عند العرض عبر lib/plan-types.ts foldRestatedLimits. */

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

const DEMO_PRODUCTS = [
  { name: "بيتزا مارغريتا", cat: "بيتزا", price: 45000, desc: "صوص طماطم، موزاريلا، ريحان طازج", featured: true },
  { name: "بيتزا خضراء", cat: "بيتزا", price: 45000, desc: "خضار الموسم مع الجبنة", featured: false },
  { name: "برجر دجاج كبير", cat: "برجر", price: 23500, desc: "صدر دجاج مقرمش مع صوص خاص", featured: false },
  { name: "برجر لحم كلاسيك", cat: "برجر", price: 28000, desc: "لحم طازج على الفحم", featured: true },
  { name: "عصير برتقال طازج", cat: "مشروبات", price: 9000, desc: "برتقال طبيعي 100٪", featured: false },
  { name: "شاي أخضر بالنعنع", cat: "مشروبات", price: 5000, desc: "شاي بالنعنع الطازج", featured: false },
];

const PAYMENT_METHODS = [
  { type: "COD", name: "الدفع عند التوصيل", instructions: "ادفع نقداً عند وصول طلبك", config: null, sortOrder: 1 },
  { type: "LIBYANA", name: "ليبيانا", instructions: "حوّل المبلغ على الرقم الظاهر ثم أكمل الطلب", config: JSON.stringify({ number: "0942119637" }), sortOrder: 2 },
  { type: "MADAR", name: "مدار", instructions: "حوّل المبلغ على الرقم الظاهر ثم أكمل الطلب", config: JSON.stringify({ number: "0910089975" }), sortOrder: 3 },
];

const DELIVERY_ZONES = [
  { name: "تاجوراء", fee: 8000, minOrder: 30000, sortOrder: 1 },
  { name: "وسط المدينة", fee: 5000, minOrder: 20000, sortOrder: 2 },
];

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.includes("e2e.db")) {
    console.error(
      `[e2e-seed] رفض العمل: DATABASE_URL (${url || "غير مضبوط"}) ليست قاعدة e2e المخصصة (file:./db/e2e.db). ` +
        "البذرة لا تلمس قاعدة التطوير أبدًا.",
    );
    process.exit(1);
  }

  // ── الخطط ──
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

  const free = await db.plan.findUnique({ where: { name: "Free" } });

  // ── المتجر التجريبي ──
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
  }

  // المنتجات
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
  }

  // طرق الدفع
  if (demo.paymentMethods.length === 0) {
    for (const pm of PAYMENT_METHODS) {
      await db.paymentMethod.create({ data: { businessId: demo.id, ...pm } });
    }
  }

  // مناطق التوصيل
  if (demo.deliveryZones.length === 0) {
    for (const z of DELIVERY_ZONES) {
      await db.deliveryZone.create({ data: { businessId: demo.id, ...z, isActive: true } });
    }
  }

  // ── تاجر الـe2e: مستخدم OWNER على المتجر التجريبي ──
  const user = await db.user.upsert({
    where: { email: MERCHANT_EMAIL },
    update: {
      name: MERCHANT_NAME,
      // إعادة الهش في كل تشغيل: كلمة المرور التجريبية تبقى صالحة عبر
      // إعادات التشغيل حتى لو غيّر أحدهم كلمة مرور الجلسة السابقة.
      passwordHash: hashPassword(MERCHANT_PASSWORD),
      isPlatformAdmin: false,
    },
    create: {
      email: MERCHANT_EMAIL,
      name: MERCHANT_NAME,
      passwordHash: hashPassword(MERCHANT_PASSWORD),
      phone: "0910000001",
      isPlatformAdmin: false,
    },
  });

  await db.businessMember.upsert({
    where: { businessId_userId: { businessId: demo.id, userId: user.id } },
    update: { role: "OWNER", extraPerms: "" },
    create: { businessId: demo.id, userId: user.id, role: "OWNER", extraPerms: "" },
  });

  console.log(
    `[e2e-seed] demo-store جاهز (٢ فئة نشطة، ${DEMO_PRODUCTS.length} منتجات، ${PAYMENT_METHODS.length} طرق دفع، ${DELIVERY_ZONES.length} مناطق) + التاجر ${MERCHANT_EMAIL} (OWNER)`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
