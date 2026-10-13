import { test, expect } from "@playwright/test";
import { createOrderViaApi } from "./helpers";

/**
 * صفحة التتبع (رابط الاستلام العام) — حراسة التوكن، درب المحطات
 * الكامل لطلب التوصيل، إخفاء «في الطريق إليك» لمتغير الاستلام،
 * ختم الحالة المعلن aria-live، ورقم الطلب الأحادي.
 */

test.describe("تتبع الطلب", () => {
  /* ملاحظة نقلٍ صادقة (Next 16 streaming): مسار /track/[token] لديه
     loading.tsx — قذيفة الصفحة تُرسل برأس 200 ثم notFound() يُرسم داخل
     التدفق. الحقيقة المرئية للزبون (وحقيقة SEO: noindex مضبوط على
     المسار) هي صفحة 404 نفسها — لذلك نثبت محتواها ونمنع أي تسريب
     لواجهة التتبع، لا رقم النقل. */
  test("توكن غير صالح → صفحة 404 (حارس الصيغة)", async ({ page }) => {
    await page.goto("/track/short");
    await expect(page.getByRole("heading", { name: "404", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "الصفحة غير موجودة" })).toBeVisible();
    // لا واجهة تتبع: لا ختم حالة ولا درب محطات ولا رقم طلب
    await expect(page.locator("ol")).toHaveCount(0);
    await expect(page.getByText("مسار الطلب", { exact: true })).toHaveCount(0);
  });

  test("توكن سليم الشكل غير موجود في القاعدة → صفحة 404", async ({ page }) => {
    // 32 محرفًا سداسيًا عشريًا: يجتاز حارس الصيغة لكنه ليس توكن طلب
    await page.goto("/track/0123456789abcdef0123456789abcdef");
    await expect(page.getByRole("heading", { name: "الصفحة غير موجودة" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "404", exact: true })).toBeVisible();
    await expect(page.locator("ol")).toHaveCount(0);
  });

  test("درب المحطات كامل لطلب توصيل — 6 محطات + خاتمة الوجهة، NEW نشطة", async ({ page }) => {
    const order = await createOrderViaApi(page.request);
    await page.goto(`/track/${order.publicToken}`);

    // رقم الطلب: أحادي (IBM Plex Mono عبر --font-mono)
    const h1 = page.getByRole("heading", { level: 1, name: order.orderNumber });
    await expect(h1).toBeVisible();
    await expect(h1).toHaveCSS("font-family", /Plex Mono/);
    expect(order.orderNumber).toMatch(/^SO-\d{8}-\d{4}$/);

    // ختم الحالة: معلن aria-live (r140 P3-10 — الحالة تتغير بالاستطلاع)
    const stamp = page
      .locator('[role="status"][aria-live="polite"]')
      .filter({ hasText: "جديد" });
    await expect(stamp).toBeVisible();

    // درب المحطات: TRACKING_FLOW كاملًا (توصيل) + عقدة الخاتمة
    const road = page.locator("ol li");
    await expect(road).toHaveCount(7, { timeout: 15_000 });
    for (const label of [
      "استُقبل الطلب",
      "تم التأكيد",
      "قيد التحضير",
      "جاهز",
      "في الطريق إليك",
      "تم التسليم",
    ]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }

    // المحطة النشطة: استُقبل الطلب + وسم المرحلة الحالية
    await expect(page.getByText("المرحلة الحالية")).toBeVisible();
    // المسافة المقطوعة: البرتقالي المتقطع حتى العقدة النشطة (route grammar)
    const activeNode = page.locator("ol li").filter({ hasText: "استُقبل الطلب" }).locator("span.rounded-full").first();
    await expect(activeNode).toHaveClass(/animate-pulse-soft/);

    // الخاتمة: عقدة الوجهة بحلقة مفتوحة متقطعة (الطلب لم يُسلَّم بعد)
    await expect(page.getByText("الوجهة", { exact: true })).toBeVisible();
    const terminus = page.locator("ol li").filter({ hasText: "الوجهة" }).locator("span.rounded-full").first();
    await expect(terminus).toHaveClass(/border-dashed/);

    // الإيصال: بند + رسوم توصيل + إجمالي أحادي
    await expect(page.getByText("بيتزا مارغريتا")).toBeVisible();
    await expect(page.getByText("التوصيل", { exact: true })).toBeVisible();
    const total = page.getByText("50 د.ل", { exact: true });
    await expect(total).toBeVisible();
    await expect(total).toHaveCSS("font-family", /Plex Mono/);

    // سطر التواصل: هاتف المتجر قابل للنقر (tel:)
    await expect(page.getByRole("link", { name: "اتصال بالمتجر" })).toBeVisible();
  });

  test("متغير الاستلام (PICKUP) يخفي محطة «في الطريق إليك»", async ({ page }) => {
    const order = await createOrderViaApi(page.request, { fulfillmentType: "PICKUP" });
    await page.goto(`/track/${order.publicToken}`);

    // 5 محطات (بلا OUT_FOR_DELIVERY) + الخاتمة
    await expect(page.locator("ol li")).toHaveCount(6, { timeout: 15_000 });
    await expect(page.getByText("في الطريق إليك")).toHaveCount(0);
    await expect(page.getByText("استلام من الفرع")).toBeVisible();

    // سطر العميل: الاسم + نوع الاستلام
    await expect(page.getByText("زبون التتبع التجريبي · استلام من الفرع")).toBeVisible();
  });

  test("رابط التتبع عند 390px — لا تمرير أفقي", async ({ page }) => {
    const order = await createOrderViaApi(page.request);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/track/${order.publicToken}`);
    await expect(page.getByRole("heading", { level: 1, name: order.orderNumber })).toBeVisible();
    await expect(page.locator("ol li").first()).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
