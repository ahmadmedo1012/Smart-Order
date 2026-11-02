import { test, expect } from "@playwright/test";

/**
 * P42 — أرقام حدود الباقات على /pricing تُرسم حرفياً وبلا وميح «حتى 0».
 *
 * THE CONTRACT (mirrors Smart-Menu's r92 render pins): the sold numbers
 * (Free 15 منتجاً · حتى 100 طلباً شهرياً) must render as plain instant text —
 * never an animated ramp. The pre-P42 bug: CountUp's post-hydration ramp
 * rendered «0»/«حتى 0» for one frame and false intermediates for ~1.1s
 * (SSR HTML was always correct; the flash lived in the animation — the
 * same root cause Smart-Menu fixed in Wave 1).
 *
 * WHY THE DOUBLE-FETCH: /pricing is ISR (revalidate=60) and the browser
 * battery builds BEFORE the e2e seed runs — the build-time prerender
 * carries the empty-plans fallback. First request serves that stale shell
 * AND triggers background regeneration; a second request a moment later
 * serves the fresh seeded HTML. Polling until the plans render is the
 * environment-honest way to pin the FRESH document.
 */

test.describe("P42 — حدود الباقات على /pricing تُرسم حرفياً", () => {
  test("الوثيقة الطازجة تحمل الأرقام المباعة نفسها — وصفر «حتى 0» (SSR pin)", async ({ request }) => {
    // Stale-while-revalidate: first hit triggers the regen, poll for fresh.
    let html = "";
    for (let i = 0; i < 10; i++) {
      const res = await request.get("/pricing");
      expect(res.status()).toBe(200);
      html = await res.text();
      if (html.includes("المنتجات") && html.includes("الطلبات الشهرية")) break;
      await new Promise((r) => setTimeout(r, 1500));
    }
    // The fresh document carries the sold ladder, statically.
    expect(html, "الوثيقة يجب أن تحمل صفوف الحدود بعد إعادة التوليد").toContain("المنتجات");
    expect(html).toContain("الطلبات الشهرية");
    expect(html).toContain("15");
    expect(html).toContain("100");
    // The flash pin: «حتى 0» appears NOWHERE in the document.
    expect(html, "الوثيقة لا تحتوي «حتى 0» إطلاقاً").not.toContain("حتى 0");
  });

  test("الإطار الأول (بلا جافاسكربت) يعرض القيم النهائية — صفر «حتى 0»", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    // Warm the ISR cache first (fresh HTML for the demo tenants' plans),
    // then load the no-JS frame — which must equal the settled document.
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    let body = "";
    for (let i = 0; i < 10; i++) {
      body = (await page.textContent("body")) ?? "";
      if (body.includes("المنتجات") && body.includes("الطلبات الشهرية")) break;
      await page.waitForTimeout(1500);
      await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    }

    // Free plan card rows render the settled values deterministically.
    expect(body, "صفوف الحدود يجب أن تُرسم في الإطار الأول").toContain("المنتجات");
    expect(body).toContain("الطلبات الشهرية");
    // The flash pin: with the animation layer absent entirely (no JS),
    // the contractual numbers are exactly the sold ones — never «حتى 0».
    expect(body, "الإطار الأول لا يحتوي «حتى 0» إطلاقاً").not.toContain("حتى 0");

    await context.close();
  });
});
