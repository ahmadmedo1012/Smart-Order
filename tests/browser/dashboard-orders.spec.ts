import { test, expect } from "@playwright/test";
import { createOrderViaApi, MERCHANT } from "./helpers";

/**
 * لوحة التاجر — الاختبار النقدي: دخول التاجر المبذور عبر نموذج الدخول
 * الحقيقي ← قائمة الطلبات (تبويبات + جدول) ← تفاصيل طلب مبذور ←
 * انتقال حقيقي عبر آلة الحالات (NEW → CONFIRMED) عبر الزر الحقيقي ←
 * الختم يتحدث + السجل الزمني يستقبل الخاتم الجديد.
 * الـ PATCH حقيقي — يمرّ عبر /api/orders/[id] وآلة الحالات في الخادم.
 */

test.describe("لوحة التاجر — الطلبات", () => {
  test("دخول ← القائمة ← التفاصيل ← تأكيد الطلب (NEW→CONFIRMED) عبر الزر الحقيقي", async ({ page }) => {
    // طلب NEW مملوك لهذه الجولة (يُنشأ عبر API العام — نفس مسار المال)
    const order = await createOrderViaApi(page.request, {
      customerName: "زبونة لوحة التاجر",
    });

    // ── الدخول عبر النموذج الحقيقي ──
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "الربط الذكي" })).toBeVisible();
    await page.locator("#email").fill(MERCHANT.email);
    await page.locator("#password").fill(MERCHANT.password);
    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/auth/login") && r.request().method() === "POST",
      ),
      page.getByRole("button", { name: "تسجيل الدخول" }).click(),
    ]);
    await page.waitForURL("**/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);

    // ── قائمة الطلبات: العنوان + التبويبات + الجدول ──
    await page.goto("/dashboard/orders");
    await expect(page.getByRole("heading", { level: 1, name: "الطلبات" })).toBeVisible();

    // شريط التبويبات (role=group r131): الكل + كل الحالات الثمانية
    const tabs = page.getByRole("group", { name: "فلترة حالة الطلب" }).getByRole("button");
    await expect(tabs).toHaveCount(9, { timeout: 15_000 });
    await expect(tabs.first()).toHaveText("الكل");

    // الجدول: صف الطلب المبذور حاضر برقمه الأحادي
    const orderLink = page.getByRole("link", { name: order.orderNumber, exact: true });
    await expect(orderLink).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("table tbody tr").first()).toBeVisible();

    // ── تفاصيل الطلب ──
    await orderLink.click();
    await page.waitForURL(new RegExp(`/dashboard/orders/${order.id}$`));
    const h1 = page.getByRole("heading", { level: 1, name: order.orderNumber });
    await expect(h1).toBeVisible();
    await expect(h1).toHaveCSS("font-family", /Plex Mono/);

    // ختم الحالة قبل الانتقال: جديد
    await expect(page.getByText("جديد", { exact: true })).toBeVisible();

    // السجل الزمني: العمود الفقري المتباعد (route-spine) + خاتم الاستقبال
    await expect(page.getByRole("heading", { name: "سجل الطلب" })).toBeVisible();
    await expect(page.locator(".route-spine-segment")).toHaveCount(1);
    await expect(page.getByText("استُقبل الطلب")).toBeVisible();

    // ── الانتقال الحقيقي: زر «تأكيد الطلب» الأساسي ← حوار التأكيد ──
    await page.getByRole("button", { name: "تأكيد الطلب" }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "تأكيد الطلب" })).toBeVisible();
    await expect(dialog.getByText(`الطلب ${order.orderNumber}`)).toBeVisible();

    const [patch] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.request().method() === "PATCH" &&
          new RegExp(`/api/orders/${order.id}`).test(r.url()),
      ),
      dialog.getByRole("button", { name: "تأكيد", exact: true }).click(),
    ]);
    expect(patch.status()).toBe(200);

    // ── ما بعد الانتقال: الختم يتحدث + السجل يستقبل الخاتم ──
    await expect(page.getByText("مؤكد", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("جديد", { exact: true })).toHaveCount(0);
    // خاتم السجل: «الحالة: مؤكد» + اسم من نفّذ الانتقال (التاجر المبذور)
    await expect(page.getByText("الحالة: مؤكد")).toBeVisible();
    await expect(page.locator("ol").getByText("مالك مخبز الواحة")).toBeVisible();
  });
});
