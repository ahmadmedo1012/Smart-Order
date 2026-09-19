"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { MotionArrowRight } from "@/components/ui/motion-icons";
import { ScrollParallax } from "@/components/ui/scroll-parallax";
import { HeroPhone } from "@/components/landing/hero-phone";
import { springDefault } from "@/lib/motion";

/**
 * HeroSection — family twin (Smart Menu HeroSection + SmartBot split):
 * start column = editorial text stack (Eyebrow → h1 with flame gradient
 * span → sub → flame/outline CTA pair → trust pill), end column = the
 * phone "order moment" with floating glass proof cards.
 *
 * LCP doctrine (family r92): the h1 entrance is pure CSS, starts VISIBLE
 * (translate-only, opacity never 0) so the LCP text never waits for JS.
 */
export function HeroSection({ trustCount }: { trustCount?: number }) {
  const showTrustBadge = !!trustCount && trustCount > 0;

  return (
    <section className="relative overflow-clip">
      {/* Family LCP-safe hero settle (r92) — hoisted keyframe, h1 starts VISIBLE */}
      <style href="r92-hero-entrance" precedence="high">
        {'@keyframes r92-hero-settle{from{transform:translateY(12px)}to{transform:translateY(0)}}.r92-hero-settle{animation:r92-hero-settle .6s var(--ease-out-quart,ease-out) both}'}
      </style>
      {/* Family warmth layer — one restrained flame glow stack with parallax */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-clip" aria-hidden="true">
        <ScrollParallax rate={-0.15} maxTravel={30} className="absolute inset-0">
          {/* Kitchen glow — pulses with ambient breath */}
          <div
            className="absolute top-[12%] left-1/2 -translate-x-1/2 size-[min(72vmin,680px)] animate-hero-glow-pulse rounded-full"
            style={{
              background:
                "radial-gradient(ellipse at center, color-mix(in srgb, var(--c-flame) 14%, transparent) 0%, color-mix(in srgb, var(--c-flame) 4%, transparent) 48%, transparent 72%)",
              filter: "blur(54px)",
            }}
          />
          {/* Saffron mist — upper atmosphere warmth */}
          <div
            className="absolute top-0 end-0 size-[50vmin] rounded-full"
            style={{
              background:
                "radial-gradient(ellipse at center, color-mix(in srgb, var(--c-saffron) 8%, transparent) 0%, transparent 70%)",
              filter: "blur(110px)",
            }}
          />
          {/* Ember floor wash — ground warmth */}
          <div
            className="absolute bottom-0 start-1/4 size-[56vmin] rounded-full"
            style={{
              background:
                "radial-gradient(ellipse at center, color-mix(in srgb, var(--c-ember) 8%, transparent) 0%, transparent 70%)",
              filter: "blur(100px)",
            }}
          />
          {/* Ambient micro-orb — subtle depth particle */}
          <div
            className="absolute top-[30%] start-[15%] size-32 animate-orb-float rounded-full opacity-30"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--c-saffron) 40%, transparent) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
        </ScrollParallax>
      </div>

      {/* Family container rhythm (§4) */}
      <div className="mx-auto max-w-[1220px] px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32 lg:px-10 lg:pt-36 lg:pb-24">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-10">
          {/* Start column — editorial text stack */}
          <div className="text-center lg:text-start">
            {/* Eyebrow — above the fold */}
            <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <Eyebrow>متجر رقمي، طلب مباشر على هاتفك</Eyebrow>
            </div>

            {/* h1 — CSS settle (family r92), visible in SSR HTML on first paint */}
            <h1 className="r92-hero-settle text-balance text-4xl font-extrabold leading-[1.15] tracking-tighter sm:text-5xl lg:text-6xl xl:text-[4.25rem]">
              <span className="block">متجر رقمي لمتجرك</span>
              <span className="block">
                <span className="text-gradient-orange">الطلبات تصلك</span> في لوحة واحدة
              </span>
            </h1>

            <p
              className="animate-fade-in mx-auto mb-8 max-w-xl text-balance text-lg leading-relaxed text-muted-foreground lg:mx-0 md:text-xl"
              style={{ animationDelay: "0.27s" }}
            >
              أنشئ متجرك بصور وأسعار، استقبل الطلبات فوراً، نظّم التوصيل بمناطقك، وتابع أداء يومك من لوحة
              تحكم واحدة.
            </p>

            {/* CTA pair — flame primary + outline secondary */}
            <div
              className="animate-fade-in flex flex-wrap justify-center gap-3 sm:gap-4 lg:justify-start"
              style={{ animationDelay: "0.39s" }}
            >
              <Link href="/register">
                <Button variant="flame" size="lg" className="text-sm sm:text-base">
                  ابدأ مجاناً <MotionArrowRight className="size-4 rtl:rotate-180 sm:size-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="text-sm sm:text-base">
                  تسجيل الدخول
                </Button>
              </Link>
            </div>

            {/* Trust badge — real count only (family honesty policy) */}
            {showTrustBadge && (
              <div
                className="animate-fade-in mt-6 inline-flex items-center gap-1.5 rounded-full border border-accent-foreground/25 bg-accent-foreground/8 px-3.5 py-1.5 text-[11px] font-medium text-ember shadow-sm dark:text-saffron"
                style={{ animationDelay: "0.51s" }}
              >
                <span className="size-1.5 animate-pulse-dot rounded-full bg-primary" />
                أكثر من {trustCount.toLocaleString("en-US").replace(/,/g, "")} متجر يثقون بنا
              </div>
            )}
          </div>

          {/* End column — the order moment (phone + floating proof) */}
          <div className="relative flex justify-center sm:px-4 md:px-0">
            <HeroPhone />
          </div>
        </div>
      </div>
    </section>
  );
}
