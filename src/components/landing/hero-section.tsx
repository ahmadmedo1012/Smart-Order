"use client";

import Link from "next/link";
import { MagneticGoldLink } from "@/components/landing/MagneticGoldLink";
import { HeroDepthLayer } from "@/components/landing/HeroDepthLayer";
import { HeroOrbits } from "@/components/landing/HeroOrbits";
import { HeroPhone } from "@/components/landing/hero-phone";

/**
 * HeroSection — the split hero KEPT (r128 Stage B): start column = the
 * editorial text stack (eyebrow → h1 → sub → magnetic CTA pair → trust
 * pill), end column = the phone "order moment". What changed on the
 * Orbit-Ink stage (F4b):
 * · BEHIND it — the sky: HeroDepthLayer (parallax starfield) + a flat
 *   SVG sector orbit chart (1px cream/lime lines, nodes, violet core,
 *   horizon) — content sits at z1 over decor z0;
 * · the product warmth/glow layers retire (§7 no-glow discipline) —
 *   the sky is flat ink with no gradients;
 * · CTAs convert to the landing pill system — magnetic gold
 *   (useMagnetic(7) via MagneticGoldLink) + ghost.
 *
 * LCP doctrine (family r92) UNTOUCHED: the h1 entrance stays pure CSS,
 * starts VISIBLE (translate-only, opacity never 0) — the LCP text never
 * waits for JS, and stays server-rendered in the instant-paint HTML.
 */
export function HeroSection({ trustCount }: { trustCount?: number }) {
  const showTrustBadge = !!trustCount && trustCount > 0;

  return (
    <section className="ln-keep-hero relative isolate overflow-clip">
      {/* Family LCP-safe hero settle (r92) — hoisted keyframe, h1 starts VISIBLE */}
      <style href="r92-hero-entrance" precedence="high">
        {'@keyframes r92-hero-settle{from{transform:translateY(12px)}to{transform:translateY(0)}}.r92-hero-settle{animation:r92-hero-settle .6s var(--ease-out-quart,ease-out) both}'}
      </style>

      {/* r128 F4b — the sky behind everything: starfield depth plane +
          the sector orbit chart (flat SVG, decorative) */}
      <div className="ln-keep-sky" aria-hidden="true">
        <HeroDepthLayer />
        <HeroOrbits className="ln-keep-orbits" />
      </div>

      {/* Family container rhythm (§4) — kept verbatim */}
      <div className="mx-auto max-w-[1220px] px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32 lg:px-10 lg:pt-36 lg:pb-24">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-10">
          {/* Start column — editorial text stack */}
          <div className="text-center lg:text-start">
            {/* Eyebrow — above the fold, on the mono machine-voice */}
            <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <span className="ln-label">{"Smart Order · متجر رقمي · ليبيا"}</span>
            </div>

            {/* h1 — CSS settle (family r92), visible in SSR HTML on first paint.
                The ONE lime word rides flat color — no gradient-text. */}
            <h1 className="r92-hero-settle text-balance text-4xl font-bold leading-[1.15] tracking-tighter sm:text-5xl lg:text-6xl xl:text-[4.25rem]">
              <span className="block">متجر رقمي لمتجرك</span>
              <span className="block">
                <span className="ln-keep-word">الطلبات تصلك</span> في لوحة واحدة
              </span>
            </h1>

            <p
              className="ln-keep-sub animate-fade-in mx-auto mb-8 max-w-xl text-balance text-lg leading-relaxed lg:mx-0 md:text-xl"
              style={{ animationDelay: "0.27s" }}
            >
              أنشئ متجرك بصور وأسعار، استقبل الطلبات فوراً، نظّم التوصيل بمناطقك، وتابع أداء يومك من لوحة
              تحكم واحدة.
            </p>

            {/* CTA pair — magnetic gold + ghost (the landing pill system) */}
            <div
              className="animate-fade-in flex flex-wrap justify-center gap-3 sm:gap-4 lg:justify-start"
              style={{ animationDelay: "0.39s" }}
            >
              <MagneticGoldLink href="/register" withArrow ariaLabel="أنشئ متجرك مجاناً — التسجيل">
                ابدأ مجاناً
              </MagneticGoldLink>
              <Link href="/store/demo-store" className="ln-btn-ghost">
                شاهد متجراً تجريبياً
              </Link>
            </div>

            {/* Trust badge — real count only (family honesty policy) */}
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
                أكثر من {trustCount.toLocaleString("en-US").replace(/,/g, "")} متجر يثقون بنا
              </div>
            )}
          </div>

          {/* End column — the order moment (phone + floating proof), kept */}
          <div className="relative z-10 flex justify-center sm:px-4 md:px-0">
            <HeroPhone />
          </div>
        </div>
      </div>
    </section>
  );
}
