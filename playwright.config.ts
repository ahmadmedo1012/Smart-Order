import { defineConfig, devices } from "@playwright/test";

/**
 * Smart-Order browser e2e — Phase 6 (P6-2-f4).
 *
 * هذا المستودع لم يكن لديه قط e2e للمتصفح — هذه البطارية أول من يشغّله:
 * رحلة العميل الحقيقية (متجر ← حوار المنتج ← السلة ← إتمام الطلب ←
 * التتبع) على خادم إنتاج حقيقي (next start) فوق قاعدة SQLite تجريبية
 * مخصصة، مع تاجر حقيقي يسجّل الدخول ويؤكّد طلبًا عبر آلة الحالات.
 *
 * البنية مرآة وظيفة test في .github/workflows/ci.yml (prisma db push ←
 * build ← start — حيلة الإقلاع r130/W3-B2) + توأم Smart-Link
 * (playwright.config.ts) في نمط E2E_PORT.
 *
 * قاعدة البيانات: ملف SQLite مخصص `file:./db/e2e.db` — لا يمسّ قاعدة
 * التطوير (smart-order.db) أبدًا. يُبثث المخطط بـ prisma db push ثم يُزوَّد
 * بسكربت scripts/e2e-seed.mjs (متجر تجريبي + كتالوج + مناطق + طرق دفع +
 * مستخدم تاجر OWNER) قبل إقلاع الخادم.
 *
 * المنفذ 3115 بُني عمدًا لكي لا يلتقي أبدًا بـ:
 *   3000 (mission-control) · 3111-3114 (وكلاء آخرون في الصندوق المشترك).
 * أي بيئة تستطيع التخطي عبر E2E_PORT.
 */
const E2E_PORT = process.env.E2E_PORT || "3115";
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

/* الصندوق المشترك: 2 نواة / 4GB — عاملان فقط (أكثر يقلب chromium إلى
   «Target crashed» تحت ضغط الذاكرة؛ نفس قرار Smart-Link r-phase6). */
const E2E_WORKERS = process.env.E2E_WORKERS
  ? Number(process.env.E2E_WORKERS)
  : 2;

/* قاعدة البيانات التجريبية المخصصة — الثابت الوحيد المسموح به هنا؛
   سكربت البذرة يرفض العمل على أي قاعدة أخرى (حارس داخلي فيه). */
const E2E_DATABASE_URL = "file:./db/e2e.db";

export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: E2E_WORKERS,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: E2E_BASE_URL,
    trace: "on-first-retry",
    locale: "ar-LY",
    /* المتجر عربي RTL — اترك لغة المتصفح تحاكي الزبون الليبي. */
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    /* نفس سلسلة CI بالضبط: db push (يولّد عميل Prisma أيضًا) ← بذرة ←
       next start. المعطيات عبر env لا عبر سطر الأوامر حتى يرثها الخادم
       كلها. DATABASE_URL يُفرض بعد نشر process.env كي لا يتسرب مسار
       قاعدة أخرى من الصندوق. */
    command: "npx prisma db push --accept-data-loss && node scripts/e2e-seed.mjs && npm run start",
    url: E2E_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: E2E_DATABASE_URL,
      PORT: E2E_PORT,
    },
  },
});
