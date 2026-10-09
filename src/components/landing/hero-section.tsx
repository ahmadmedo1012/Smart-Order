"use client";

import Link from "next/link";
import { MagneticGoldLink } from "@/components/landing/MagneticGoldLink";
import { HeroDepthLayer } from "@/components/landing/HeroDepthLayer";
import { OrbitScene } from "@/components/landing/OrbitScene";
import { HeroPhone } from "@/components/landing/hero-phone";

/**
 * HeroSection — the split hero KEPT (r128 Stage B): start column = the
 * editorial text stack (eyebrow → h1 → sub → magnetic CTA pair → trust
 * pill), end column = the phone "order moment". What changed on the
 * Orbit-Ink stage (F4b):
 * · BEHIND it — the sky: HeroDepthLayer (parallax starfield, resting
 *   opacity .5 + the ONE sanctioned violet depth radial) + the r129
 *   OrbitScene canvas (the living orbital system — Madarek port,
 *   mounted exactly like canonical LandingPage.tsx: above the depth
 *   plane, below the content, pointer-events none) — content sits at
 *   z1 over decor z0;
 * · the product warmth/glow layers retire (§7 no-glow discipline) —
 *   the flat HeroOrbits chart retires with the canvas port (r129);
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

      {/* r129 — the sky behind everything: starfield depth plane (z −1,
          resting opacity .5) + the living OrbitScene canvas (the Madarek
          engine: DPR-capped, IO+visibility paused, RM composed still).
          Same mount order as canonical LandingPage.tsx: depth layer
          first, canvas after (paints above it), content at z1 above both. */}
      <div className="ln-keep-sky" aria-hidden="true">
        <HeroDepthLayer />
        <OrbitScene className="ln-hero-canvas" biasX={-0.35} />
      </div>

      {/* Family container rhythm (§4) — r132 (A1 finding 4): the frame canon
          is 1280px (r131 ruling) — dashboard shell.tsx + landing.css chapters
          landed it; the marketing frame (hero/header/footer) follows. */}
      <div className="mx-auto max-w-[1280px] px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32 lg:px-10 lg:pt-36 lg:pb-24">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-10">
          {/* Start column — editorial text stack */}
          <div className="text-center lg:text-start">
            {/* Eyebrow — above the fold, on the mono machine-voice.
                r129 S-11: ln-mono dim (canonical LandingPage.tsx:352 —
                "the lime word below is the only pop"); the former lime
                .ln-label was a 2nd lime pop above the h1 (roster
                violation) */}
            <div className="ln-keep-eyebrow animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <span className="ln-mono">{"Smart Order · متجر رقمي · ليبيا"}</span>
            </div>

            {/* h1 — CSS settle (family r92), visible in SSR HTML on first paint.
                r131-F2: the fixed 36→68px Tailwind ladder retires — the
                title now rides the canonical --ln-h1 scale
                (clamp 44px→108px, SL/SB/SM pattern; landing.css .ln-keep-title).
                The ONE lime word rides flat color — no gradient-text.
                r129 S-12: tracking-normal (letter-spacing 0) — Arabic
                joins; negative tracking breaks cursive connection
                (canonical landing.css:591 hard rule). */}
            <h1 className="r92-hero-settle ln-keep-title text-balance font-bold tracking-normal">
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

            {/* CTA pair — magnetic gold + ghost (the landing pill system).
                r131-F2: ln-keep-actions — the 560px full-width hook
                (canonical .ln-hero-actions rule, landing.css §13). */}
            <div
              className="ln-keep-actions animate-fade-in flex flex-wrap justify-center gap-3 sm:gap-4 lg:justify-start"
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

          {/* End column — the order moment (phone + floating proof), kept.
              r131-F2: ln-keep-phone — the landscape-phone guard hides the
              proof column so the whole value story fits the 390px fold. */}
          <div className="ln-keep-phone relative z-10 flex justify-center sm:px-4 md:px-0">
            <HeroPhone />
          </div>
        </div>
      </div>
    </section>
  );
}
