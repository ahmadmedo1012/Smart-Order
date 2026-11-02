import { test, expect } from "@playwright/test";

/**
 * P42 — أرقام حدود الباقات على /pricing تُرسم فوراً وبلا وميح «حتى 0».
 *
 * THE CONTRACT (mirrors Smart-Menu's r92 render pins): the sold numbers
 * (Free 15 منتجاً · حتى 100 طلباً شهرياً) must be present in the SERVER
 * document itself, and the first frame the directive protects — the
 * no-JavaScript frame — must show the settled values with ZERO occurrences
 * of «حتى 0». The pre-P42 bug: CountUp's post-hydration ramp rendered
 * «0»/«حتى 0» for one frame and false intermediates for ~1.1s; the SSR
 * HTML was always correct, so these pins freeze BOTH halves: the server
 * document (SSR pin) and the deterministic no-JS first frame (flash pin).
 */

test.describe("P42 — حدود الباقات على /pricing تُرسم حرفياً", () => {
  test("وثيقة الخادم تحمل الأرقام المباعة نفسها (SSR pin)", async ({ request }) => {
    const res = await request.get("/pricing");
    expect(res.status()).toBe(200);
    const html = await res.text();
    // The two limit labels and the sold numbers are in the server document.
    expect(html).toContain("المنتجات");
    expect(html).toContain("الطلبات الشهرية");
    expect(html).toContain("15");
    expect(html).toContain("100");
  });

  test("الإطار الأول (بلا جافاسكربت) يعرض القيم النهائية — صفر «حتى 0»", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });

    // Free plan card rows render the settled values deterministically.
    await expect(page.getByText("المنتجات", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("الطلبات الشهرية", { exact: true }).first()).toBeVisible();

    // The flash pin: «حتى 0» appears NOWHERE in the delivered/first frame.
    const body = await page.textContent("body");
    expect(body, "الوثيقة الأولى لا تحتوي «حتى 0» إطلاقاً").not.toContain("حتى 0");

    await context.close();
  });
});
