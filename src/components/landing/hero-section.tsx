import Image from "next/image";
import Link from "next/link";
import { toArabicNumber } from "@/lib/plan-types";
import { MagneticGoldLink } from "@/components/landing/MagneticGoldLink";
import { HeroDepthLayer } from "@/components/landing/HeroDepthLayer";
import { CountUp } from "@/components/ui/CountUp";

/* r142 «الخط» — HeroSection «الطريق مفتوح»: the logistics hero.
 * The old orbit sky retires — the hero is now a DIMENSIONAL ROAD SCENE:
 * package-hero.webp floats over scooter.webp (layered depth on the ink
 * stage, route.webp as a whisper-deep backdrop) and the page's route
 * line (RouteSpine) ORIGINS under the package. The h1 stays the instant
 * LCP (family r92 doctrine: server-rendered, CSS settle, never opacity
 * 0); the scene is CSS-only (no JS island) — float dies under RM.
 *
 * The hero keeps its honest live figures as a ROADMARK board (mono, the
 * trust band folded into the hero chapter): متجر على الطريق / طلب عبر
 * المنصّة / مدن — SSR'd finals + CountUp on view (honesty policy). */

export function HeroSection({
  trustCount,
  totalOrders,
}: {
  trustCount?: number;
  totalOrders?: number;
}) {
  const showTrustBadge = !!trustCount && trustCount > 0;

  /* the roadmark board — live DB figures, the "+" rides non-zero counts */
  const roadmarks = [
    {
      value: trustCount && trustCount > 0 ? `+${trustCount}` : `${trustCount ?? 0}`,
      label: "متجر على الطريق",
    },
    {
      value: totalOrders && totalOrders > 0 ? `+${totalOrders}` : `${totalOrders ?? 0}`,
      label: "طلب عبر المنصّة",
    },
    { value: "3", label: "مدن" },
  ];

  return (
    <section className="ln-keep-hero relative isolate overflow-clip">
      {/* Family LCP-safe hero settle (r92) — hoisted keyframe, h1 starts VISIBLE */}
      <style href="r92-hero-entrance" precedence="high">
        {'@keyframes r92-hero-settle{from{transform:translateY(12px)}to{transform:translateY(0)}}.r92-hero-settle{animation:r92-hero-settle .6s var(--ease-out-quart,ease-out) both}'}
      </style>

      {/* the night-asphalt sky: starfield depth plane stays (the road at
          night); the orbit canvas retires with the orbit identity */}
      <div className="ln-keep-sky" aria-hidden="true">
        <HeroDepthLayer />
      </div>

      {/* Family container rhythm (§4) — frame canon 1280px (r131 ruling) */}
      <div className="mx-auto max-w-[1280px] px-4 pb-10 pt-28 sm:px-6 sm:pb-14 sm:pt-32 lg:px-10 lg:pt-36">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8">
          {/* Start column — editorial text stack (server-rendered LCP) */}
          <div className="text-center lg:text-start">
            <div className="ln-keep-eyebrow animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <span className="ln-mono">{"Smart Order · الطريق مفتوح · ليبيا"}</span>
            </div>

            {/* h1 — the road claim, instant paint. ONE lime word (flat
                color); tracking-normal keeps the Arabic joined (r129 S-12). */}
            <h1 className="r92-hero-settle ln-keep-title text-balance font-bold tracking-normal">
              <span className="block">الطريق مفتوح:</span>
              <span className="block">
                متجرك يستقبل <span className="ln-keep-word">ويوصّل</span>
              </span>
            </h1>

            <p
              className="ln-keep-sub animate-fade-in mx-auto mb-8 max-w-xl text-balance text-lg leading-relaxed lg:mx-0 md:text-xl"
              style={{ animationDelay: "0.27s" }}
            >
              أنشئ متجرك بصور وأسعار، استقبل الطلبات فوراً، نظّم التوصيل بمناطقك، وتابع الطلب خطوة بخطوة
              من لوحة تحكم واحدة — حتى باب العميل.
            </p>

            <div
              className="ln-keep-actions animate-fade-in flex flex-wrap justify-center gap-3 sm:gap-4 lg:justify-start"
              style={{ animationDelay: "0.39s" }}
            >
              <MagneticGoldLink href="/register" withArrow ariaLabel="أنشئ متجرك مجاناً — التسجيل">
                ابدأ مجاناً
              </MagneticGoldLink>
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
                أكثر من {toArabicNumber(trustCount)} متجر يثقون بنا
              </div>
            )}
          </div>

          {/* End column — the dimensional road scene (CSS-only depth:
              scooter on the asphalt, the kraft package floating above,
              the route whisper behind, the LINE origin under the box) */}
          <div className="ln-hero-scene relative z-10 mx-auto w-full max-w-[520px]">
            <div className="ln-hero-scene-backdrop" aria-hidden="true">
              <Image
                src="/images/shipping/route.webp"
                alt=""
                fill
                sizes="(max-width: 1024px) 88vw, 480px"
                className="ln-hero-scene-backdrop-img"
              />
            </div>

            <div className="ln-hero-scene-scooter" aria-hidden="true">
              <Image
                src="/images/shipping/scooter.webp"
                alt=""
                fill
                sizes="(max-width: 1024px) 88vw, 480px"
                className="ln-hero-scene-scooter-img"
              />
            </div>

            <div className="ln-hero-scene-package">
              <Image
                src="/images/shipping/package-hero.webp"
                alt="طرد كرتوني بإضاءة كهرمانية دافئة يطفو فوق دراجة توصيل على أرض داكنة"
                width={480}
                height={480}
                priority
                sizes="(max-width: 1024px) 62vw, 340px"
                className="ln-hero-scene-package-img"
              />
            </div>

            {/* the LINE origin — the road starts under the package */}
            <span className="ln-hero-scene-origin ln-route-stop" data-route-stop aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* the roadmark board — the live figures as road signage (mono) */}
      <div className="ln-roadmark" role="group" aria-label="أرقام المنصّة الحقيقية">
        <div className="ln-roadmark-inner">
          {roadmarks.map((m) => (
            <span key={m.label} className="ln-roadmark-item">
              <span className="ln-mono">
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
