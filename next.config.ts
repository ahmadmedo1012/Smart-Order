import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-host (Render/Docker) sets NEXT_OUTPUT=standalone; Vercel uses default output
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" as const } : {}),
  // Strip the `x-powered-by: Next.js` response header (smart-link hardening)
  poweredByHeader: false,
  outputFileTracingRoot: process.cwd(),
  // Disable dev indicator for clean captures
  devIndicators: false,
  images: {
    // r132 (F1c, A9 SO-8): avif first — Next's default is webp-only; SM/SL
    // ship ['image/avif','image/webp']. Store logos/product images serve
    // ~20-30% smaller at equal quality.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [],
  },
  async headers() {
    /* W5-C4 (W5-A5 P2): كان هذا المتجر العضو الوحيد في العائلة بلا
     * HSTS/CSP. المرآة العائلية: smart-link (next.config.ts r8–r13)
     * للـCSP الساكنة + smart-menu (round89-B2) لحراسة HSTS. الفروق
     * المقصودة عن smart-link: لا preload (لا تقييد مالك النطاق قبل
     * قرار المالك)، ولا va.vercel-scripts.com (لا Analytics هنا —
     * grep: صفر مستهلكات)، ولا upgrade-insecure-requests (سطر يكسر
     * dev بـ HTTP صريح على WebKit). X-Frame-Options → DENY + COOP/
     * CORP: كلا الشقيقين يشحنها (round89-B2 / r8) — لا iframe في
     * الكود (QR يفتح الرابط مباشرة). */
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
      /* CSP ساكنة بلا nonce — لا middleware في هذا المستودع (نمط
       * smart-link r5 بالضبط). App Router يبثّ دفعات self.__next_f
       * inline لا يمكن نونتها على الصفحات المُسبَقة التصيير، فتحمل
       * script/style ‏'unsafe-inline' (حل العائلة الموثق). التطبيق
       * same-origin بالكامل: خطوط ذاتية الاستضافة، صور عبر
       * /api/media، صفر سكربتات خارجية. frame-ancestors 'none' +
       * object-src 'none' + base-uri + form-action يقتلون الافتراضيات
       * الخطرة. */
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          /* P23-D: dev-only 'unsafe-eval'. React 19's development build
           * needs eval() (owner-stack reconstruction); without it the
           * strict script-src above ABORTS hydration in `next dev` — the
           * landing served on 127.0.0.1 rendered as dead SSR HTML (no
           * globe canvas, no chip interactions). React never evals in
           * production, so the production policy is byte-identical to
           * the smart-link r5 mirror. */
          ...(process.env.NODE_ENV === "development"
            ? ["script-src 'self' 'unsafe-inline' 'unsafe-eval'"]
            : ["script-src 'self' 'unsafe-inline'"]),
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data:",
          "font-src 'self' data:",
          "connect-src 'self'",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "object-src 'none'",
        ].join("; "),
      },
    ];
    /* HSTS على إنتاج Vercel فقط (عين smart-menu round89-B2): على dev
     * أو خادم محلي بـ HTTP صريح، WebKit يرقّي كل مورد فرعي إلى
     * https://localhost فلا تُهيَّأ الصفحة أبداً — الحارس لا ينكسر
     * شيئاً كي لا يكسر التطبيق. self-host خلف HTTPS (Render/Docker)
     * خارج الحراسة — نفس مقايضة smart-menu، قرار المالك إذا صار
     * self-host واقعاً منشوراً. */
    const hsts =
      process.env.NODE_ENV === "production" && process.env.VERCEL
        ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
        : [];
    return [
      { source: "/(.*)", headers: [...hsts, ...security] },
      { source: "/api/(.*)", headers: [...hsts, ...security, { key: "Cache-Control", value: "no-store" }] },
      { source: "/api/media/:path", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      /* r131 (F1, A8 perf — NO fonts cache header): the self-hosted IBM
       * Plex woff2 subsets (the two preloaded first-paint arabic files
       * + fonts.css) were the only heavy assets revalidating on every
       * visit. Filenames are family-weight-script qualified, so a
       * file's bytes only ever change alongside a deploy that renames
       * or re-points them — safe for immutable (smart-link r126 /
       * smart-menu round85-B7 pattern, exact). */
      { source: "/fonts/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      /* r133 (A2 §2-11 / SO-N3): og-default.png (127KB, the store-OG
       * fallback art) had no cache rule — every store page OG render
       * revalidated it. Day + SWR (SM's og rule shape): the art only
       * changes on a deliberate re-upload. */
      { source: "/og-default.png", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] },
    ];
  },
};

export default nextConfig;
