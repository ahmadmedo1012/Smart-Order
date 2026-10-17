import Link from "next/link";
import { HeroDepthLayer } from "@/components/landing/HeroDepthLayer";
import { GlobeMount } from "@/components/landing/GlobeMount";
import { CountUp } from "@/components/ui/CountUp";
import { PAYMENT_TYPES } from "@/lib/constants";

/* ═══════════════════════════════════════════════════════════════════════
   P12-2d — HeroSection «الطريق مفتوح» — the United-style split hero.
   ─────────────────────────────────────────────────────────────────────
   The r142 dimensional road scene (package/scooter/route images) retires
   with this wave — the signature scene is now the INTERACTIVE DOTTED
   GLOBE (GlobeScene, client-only canvas island): Libya/Med focus, orange
   route arcs between real cities, drag rotation with inertia, theme
   repaint via CSS vars. It bleeds off the TOP-RIGHT frame edge.

   The copy column keeps the family LCP doctrine (r92/r142): server-
   rendered h1, instant paint, never opacity 0 — the globe and the
   atmosphere layer are decorative (aria-hidden / role=img).

   Editorial pattern (spec S2): mono eyebrow → ALL-CAPS-scale Kufi
   headline with the grey-line-1 + white-punchline split → sub-copy →
   primary SOLID CTA (ground/ink inversion) + secondary outline CTA —
   the real links preserved (register / demo store). The honest live
   figures stay as the ROADMARK board (mono, real DB counts only).
   ═══════════════════════════════════════════════════════════════════════ */

export function HeroSection({
  trustCount,
  totalOrders,
}: {
  trustCount?: number;
  totalOrders?: number;
}) {
  const showTrustBadge = !!trustCount && trustCount > 0;

  /* the roadmark board — live DB figures, the "+" rides non-zero counts.
     (phase4) «3 مدن» سقطت: رقم ثابت بلا مصدر بين جارين أحيا من DB —
     حلّ محلها حقيقة المنتج القابلة للتحقق: الطرق الست الحقيقية
     (constants.ts PAYMENT_TYPES — نفس الستة في محطة الدفع أسفل الصفحة).
     (P19-D2) الرقم الآن مشتق من الثابت نفسه — نفس درس r140 «القالب
     يتبع الثابت»: «6» حرفية كانت ستكذب لو نما PAYMENT_TYPES يومًا
     بينما محطة الدفع أسفل الصفحة تعرض العدد الجديد. */
  const roadmarks = [
    {
      value: trustCount && trustCount > 0 ? `+${trustCount}` : `${trustCount ?? 0}`,
      label: "متجر على الطريق",
    },
    {
      value: totalOrders && totalOrders > 0 ? `+${totalOrders}` : `${totalOrders ?? 0}`,
      label: "طلب عبر المنصّة",
    },
    { value: String(PAYMENT_TYPES.length), label: "طرق دفع" },
  ];

  return (
    <section className="ln-keep-hero relative isolate overflow-clip">
      {/* Family LCP-safe hero settle (r92) — hoisted keyframe, h1 starts VISIBLE */}
      <style href="r92-hero-entrance" precedence="high">
        {'@keyframes r92-hero-settle{from{transform:translateY(12px)}to{transform:translateY(0)}}.r92-hero-settle{animation:r92-hero-settle .6s var(--ease-out-quart,ease-out) both}'}
      </style>

      {/* S3 — deep-atmosphere backdrop: layered radial glows + the faint
          dot grid (HeroDepthLayer waypoints, P9-3-d theme-aware). Both
          stages are owned in landing.css (.ln-keep-sky + twins). */}
      <div className="ln-keep-sky" aria-hidden="true">
        <HeroDepthLayer />
      </div>

      {/* S1 — the dotted globe, bleeding off the top-right frame edge.
          Client-only canvas island (GlobeMount → dynamic ssr:false);
          pure decoration for AT (role=img inside), drag for everyone. */}
      <div className="ln-globe-stage" aria-hidden="true">
        <GlobeMount />
      </div>

      {/* 60/40 split — copy LOWER-LEFT (globe owns the top-right) */}
      <div className="ln-hero-frame">
        <div className="ln-hero-copy">
          <div className="ln-keep-eyebrow animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <span className="ln-mono">{"SMART ORDER — شبكة الطلبات"}</span>
          </div>

          {/* h1 — the road claim, instant paint. Editorial pattern: line 1
              grey/recessed, the punchline lines white/ink. tracking-normal
              keeps the Arabic joined (r129 S-12). */}
          <h1 className="r92-hero-settle ln-keep-title ln-h1-editorial text-balance font-bold tracking-normal">
            <span className="ln-h1-line ln-h1-line-dim">الطريق مفتوح:</span>
            <span className="ln-h1-line">متجرك يستقبِل ويوصّل</span>
          </h1>

          <p
            className="ln-keep-sub animate-fade-in max-w-xl text-balance text-lg leading-relaxed md:text-xl"
            style={{ animationDelay: "0.27s" }}
          >
            أنشئ متجرك بصور وأسعار، استقبل الطلبات فوراً، نظّم التوصيل بمناطقك، وتابع الطلب خطوة بخطوة
            من لوحة تحكم واحدة — حتى باب العميل.
          </p>

          <div
            className="ln-keep-actions animate-fade-in flex flex-wrap gap-3 sm:gap-4"
            style={{ animationDelay: "0.39s" }}
          >
            <Link href="/register" className="ln-btn-solid">
              ابدأ مجاناً
            </Link>
            <Link href="/store/demo-store" className="ln-btn-ghost">
              اطلب من متجر تجريبي
            </Link>
          </div>

          {showTrustBadge && (
            <div
              className="ln-keep-pill animate-fade-in mt-6 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-medium"
              style={{ animationDelay: "0.51s" }}
            >
              <span
                className="size-1.5 animate-pulse-dot rounded-full"
                style={{ background: "var(--ln-lime)" }}
                aria-hidden="true"
              />
              {/* أرقام غربية حية (سياسة src/lib/money.ts — canon الأرقام
                  الغربية في هذا المنتج؛ لا وحدة format.ts هنا) — كانت عبر
                  toArabicNumber من وحدة client فانفجر الترطيب الخادمي على
                  Vercel فقط (محلياً trustCount=0 لم ينفّذ السطر). */}
              أكثر من {trustCount} متجر يثقون بنا
            </div>
          )}
        </div>
      </div>

      {/* the roadmark board — the live figures, monumental editorial scale
          (mono captions, huge Kufi figures; honesty policy: real counts) */}
      <div className="ln-roadmark" role="group" aria-label="أرقام المنصّة الحقيقية">
        <div className="ln-roadmark-inner">
          {roadmarks.map((m) => (
            <span key={m.label} className="ln-roadmark-item">
              <span className="ln-mono ln-roadmark-value">
                <CountUp value={m.value} />
              </span>
              <span className="ln-roadmark-label">{m.label}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
