import { test, expect } from "@playwright/test";
import { MERCHANT } from "./helpers";

/**
 * W7-D — القفل الصادق لسطح التقارير في المتصفح.
 *
 * المتجر التجريبي على الخطة المجانية عمداً (قرار موثق: صفحة
 * التقارير المقفولة فيه هي العرض الصادق لمسار الترقية، ليست قفلاً
 * خفياً) — فالتاجر المبذور يجب أن يرى:
 *   1. الحالة المقفولة بالعنوان الذي يذكر الخطة (من ثابت البوابة
 *      نفسه — PLAN_FEATURES، فلا يمكن للنسخة أن تختلف عن البوابة)؛
 *   2. نداء الترقية الحقيقي إلى /pricing (السطح الموجود)؛
 *   3. لا جداول ولا أعمدة ولا بذير بيانات — القفل ليس صفحة معطوبة.
 *
 * ثم الرحلة نفسها: زر الترقية يصل حقاً إلى /pricing حيث تُعرض
 * الخطة الاحترافية برصاصة الصدق الجديدة «تصدير CSV للتقارير»
 * (البذرة المعاد صياغتها — العرض الحي لتوأم البذرة).
 */

test.describe("لوحة التاجر — التقارير المقفولة (W7-D)", () => {
  test("التاجر المجاني يرى القفل الصادق: العنوان يذكر بريميوم + نداء الترقية إلى الباقات + لا سطح بيانات", async ({ page }) => {
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

    // ── صفحة التقارير: الحالة المقفولة ──
    const reportsResponse = page.waitForResponse(
      (r) => r.url().includes("/api/dashboard/reports") && r.request().method() === "GET",
    );
    await page.goto("/dashboard/reports");
    const res = await reportsResponse;
    // البوابة الخادمية تكلمت: 403 — لا سطح بيانات أصلاً
    expect(res.status()).toBe(403);

    await expect(
      page.getByRole("heading", { level: 1, name: "التقارير" }),
    ).toBeVisible();
    // العنوان المقفل يذكر الخطة الدنيا من ثابت البوابة (مصدر واحد للنسخة)
    await expect(
      page.getByText("التقارير متوفرة في خطة «بريميوم» فأعلى"),
    ).toBeVisible();
    // نداء الترقية الحقيقي — رابط إلى السطح الموجود
    const upgrade = page.getByRole("link", { name: "عرض الباقات والترقية" });
    await expect(upgrade).toBeVisible();

    // القفل ليس صفحة بيانات معطوبة: لا مفاتيح نافذة، لا جداول
    await expect(page.getByRole("group", { name: "نافذة التقرير" })).toHaveCount(0);
    await expect(page.locator("table")).toHaveCount(0);
  });

  test("نداء الترقية يصل حقاً إلى /pricing حيث تعرض الخطة الاحترافية رصاصة الصدق «تصدير CSV للتقارير»", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill(MERCHANT.email);
    await page.locator("#password").fill(MERCHANT.password);
    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/auth/login") && r.request().method() === "POST",
      ),
      page.getByRole("button", { name: "تسجيل الدخول" }).click(),
    ]);
    await page.waitForURL("**/dashboard");

    await page.goto("/dashboard/reports");
    await expect(
      page.getByText("التقارير متوفرة في خطة «بريميوم» فأعلى"),
    ).toBeVisible();
    await page.getByRole("link", { name: "عرض الباقات والترقية" }).click();
    await page.waitForURL("**/pricing");

    // صفحة الباقات: رصاصة الخطة الاحترافية المعاد صياغتها (توأم البذرة)
    await expect(
      page.getByText("تصدير CSV للتقارير"),
    ).toBeVisible({ timeout: 15_000 });
    // والرصاصة الشبحية القديمة لا تظهر في أي مكان
    await expect(page.getByText("إحصاءات متقدمة")).toHaveCount(0);
  });
});
