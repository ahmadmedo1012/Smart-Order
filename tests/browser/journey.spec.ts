import { test, expect } from "@playwright/test";
import { STORE_NAME, STORE_SLUG } from "./helpers";

/**
 * رحلة العميل الكاملة (مسار المال) — المتجر ← حوار المنتج ← السلة ←
 * إتمام الطلب ← الإرسال الحقيقي (POST /api/public/orders) ← التتبع.
 *
 * شاشة النجاح نفسها (r133) عرضٌ انتقالي: submit يرسمها ثم
 * router.replace إلى /track/{token}?placed=1 — لذلك نتحقق من الإرسال
 * عبر استجابة API الحقيقية (201 + رقم طلب + token) ثم من الوصول
 * المتين: لافتة placed + رقم الطلب + درب المحطات.
 */

test.describe("رحلة العميل — المتجر ← السلة ← إتمام الطلب ← التتبع", () => {
  test("الرحلة الكاملة بطلب توصيل حقيقي", async ({ page }) => {
    // ── 1) واجهة المتجر: البطل + شبكة المنتجات ──
    await page.goto(`/store/${STORE_SLUG}`);
    await expect(page.getByRole("heading", { level: 1, name: STORE_NAME })).toBeVisible();
    await expect(
      page.getByText("متجر تجريبي يعرض تجربة التسوق الكاملة في سمارت أوردر"),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "مميز", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "كل المنتجات" })).toBeVisible();
    await expect(page.locator("main article")).toHaveCount(6, { timeout: 20_000 });

    // ── 2) حوار المنتج (اسمه المتاح = اسم المنتج عبر DialogTitle) ──
    await page.getByRole("button", { name: "تفاصيل بيتزا مارغريتا" }).first().click();
    const dialog = page.getByRole("dialog", { name: "بيتزا مارغريتا" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("صوص طماطم، موزاريلا، ريحان طازج")).toBeVisible();

    // ── 3) إضافة إلى السلة ──
    await dialog.getByRole("button", { name: /إضافة/ }).click();
    // الشارة على زر السلة تظهر بعد اكتمال ترطيب السلة
    // W7-G: صيغة العدّ ركبت محرك الجمع (countedArabicPhrase) —
    // «عنصر واحد» بدل «1 عنصر» (قواعد العدد الصحيحة).
    await expect(page.getByRole("button", { name: /عرض السلة \(عنصر واحد\)/ })).toBeVisible();

    // ── 4) درج السلة ──
    await page.getByRole("button", { name: /عرض السلة/ }).first().click();
    const drawer = page.getByRole("dialog");
    await expect(drawer.getByRole("heading", { name: "سلة الطلب" })).toBeVisible();
    await expect(drawer.getByText("بيتزا مارغريتا")).toBeVisible();
    // سطر البند + المجموع التقديري كلاهما 45 د.ل (بند واحد)
    await expect(drawer.getByText("45 د.ل", { exact: true })).toHaveCount(2);

    // ── 5) إتمام الطلب ──
    await page.getByRole("link", { name: "إتمام الطلب" }).click();
    /* P18-W2-d: the checkout h1 speaks the two-voice dim-prefix grammar
       (dim «طلبك» + live claim) — the accessible name is the full claim. */
    await expect(
      page.getByRole("heading", { level: 1, name: "طلبك على بعد خطوة من الإرسال" }),
    ).toBeVisible();

    // مؤشر الرحلة: 3 عقد، الوسطى هي الخطوة النشطة
    const journey = page.locator('ol[aria-label="مسار الطلب"]');
    await expect(journey).toBeVisible();
    await expect(journey.locator("li")).toHaveCount(3);
    await expect(journey.locator('li[aria-current="step"]')).toHaveText(/إتمام الطلب/);

    // بيانات العميل
    await page.locator("#c-name").fill("أحمد المهدي");
    await page.locator("#c-phone").fill("0912345678");

    // منطقة التوصيل: بلاطة «وسط المدينة» (رسوم 5 د.ل، الحد الأدنى 20 د.ل)
    await page.getByRole("button", { name: /وسط المدينة/ }).click();
    await page.locator("#c-area2").fill("الوسط");
    await page.locator("#c-address").fill("شارع الجمهورية، مقابل مبنى البريد");

    // طريقة الدفع: الدفع عند التوصيل
    await page.getByRole("button", { name: "الدفع عند التوصيل", exact: true }).click();

    // الشريط اللاصق: الإجمالي 45 + 5 = 50 د.ل (أحادي tabular)
    const stickyTotal = page.getByText("50 د.ل", { exact: true });
    await expect(stickyTotal).toBeVisible();
    await expect(stickyTotal).toHaveCSS("font-family", /Plex Mono/);

    // ── 6) الإرسال الحقيقي + الشاشة المتينة ──
    const [res] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/public/orders") && r.request().method() === "POST",
      ),
      page.getByRole("button", { name: "إرسال الطلب" }).click(),
    ]);
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    const { orderNumber, publicToken } = body.data.order;
    // رقم الطلب بصيغة اليوم-التسلسل الصادقة (SO-YYYYMMDD-NNNN)
    expect(orderNumber).toMatch(/^SO-\d{8}-\d{4}$/);

    // r133: النجاح المتين — الهبوط على /track/{token}?placed=1
    await page.waitForURL(new RegExp(`/track/${publicToken}`));
    await expect(page).toHaveURL(new RegExp(`/track/${publicToken}\\?placed=1$`));

    // لافتة الاستلام (role=status منذ r133)
    const placedBanner = page.getByRole("status").filter({ hasText: "تم استلام طلبك!" });
    await expect(placedBanner).toBeVisible();

    // رقم الطلب على صفحة التتبع هو رقم الطلب الذي أنشأه الخادم
    const h1 = page.getByRole("heading", { level: 1, name: orderNumber });
    await expect(h1).toBeVisible();

    // ── 7) درب المحطات: 6 محطات + خاتمة الوجهة، NEW نشطة ──
    await expect(page.getByText("استُقبل الطلب")).toBeVisible();
    await expect(page.getByText("المرحلة الحالية")).toBeVisible();
    await expect(page.getByText("تم التأكيد")).toBeVisible();
    await expect(page.getByText("قيد التحضير")).toBeVisible();
    await expect(page.getByText("جاهز", { exact: true })).toBeVisible();
    await expect(page.getByText("في الطريق إليك")).toBeVisible();
    await expect(page.getByText("تم التسليم", { exact: true })).toBeVisible();
    await expect(page.locator("ol li")).toHaveCount(7); // 6 محطات + الخاتمة
    await expect(page.getByText("الوجهة")).toBeVisible();
    await expect(page.getByText("نهاية الطريق بانتظار طلبك")).toBeVisible();

    // سطر العميل: الاسم · التوصيل · المدينة والمنطقة (العنوان الكامل
    // لا يُعرض في التتبع العام — سطر العميل هو الاسم/النوع/المدينة/المنطقة)
    await expect(page.getByText("أحمد المهدي · توصيل · طرابلس الوسط")).toBeVisible();

    // إيصال الطلب: الصنف + رسوم التوصيل 5 د.ل + الإجمالي 50 د.ل (أحادي)
    await expect(page.getByText("التوصيل", { exact: true })).toBeVisible();
    const monoTotal = page.getByText("50 د.ل", { exact: true });
    await expect(monoTotal).toBeVisible();
    await expect(monoTotal).toHaveCSS("font-family", /Plex Mono/);
  });

  /* ── a11y: حلقة التركيز المرئي على أول CTA (رابط التخطي) ── */
  test("focus-visible على أول عنصر تفاعلي في المتجر (رابط التخطي)", async ({ page }) => {
    await page.goto(`/store/${STORE_SLUG}`);
    await expect(page.getByRole("heading", { level: 1, name: STORE_NAME })).toBeVisible();

    await page.keyboard.press("Tab");
    const state = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        label: el.getAttribute("aria-label") ?? el.textContent?.trim() ?? "",
        matchesFocusVisible: el.matches(":focus-visible"),
        outlineWidth: cs.outlineWidth,
        outlineStyle: cs.outlineStyle,
      };
    });
    expect(state).not.toBeNull();
    // أول عنصر قابل للتركيز في الصفحة هو رابط التخطي (عقد البطل)
    expect(state!.label).toContain("تخطَّ");
    // :focus-visible يلتقط + حلقة المهام العامة ترسم (2px solid)
    expect(state!.matchesFocusVisible).toBe(true);
    expect(state!.outlineStyle).toBe("solid");
    expect(parseFloat(state!.outlineWidth)).toBeGreaterThan(0);
  });

  /* ── a11y: 390px بلا تمرير أفقي على واجهة المتجر ── */
  test("المتجر عند 390px — لا تمرير أفقي", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/store/${STORE_SLUG}`);
    await expect(page.getByRole("heading", { level: 1, name: STORE_NAME })).toBeVisible();
    await expect(page.locator("main article").first()).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
