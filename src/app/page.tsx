import "./landing.css";
import { Fragment } from "react";
import { SkipLink } from "@/components/shared/skip-link";
import { db } from "@/lib/db";
import { SITE_URL } from "@/app/layout";
import { CountUp } from "@/components/ui/CountUp";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/hero-section";
import { LandingMarquee } from "@/components/landing/LandingMarquee";
import { SectorsSection } from "@/components/landing/SectorsSection";
import { JourneySection } from "@/components/landing/JourneySection";
import { ProgressSection } from "@/components/landing/ProgressSection";
import { VenuesSection } from "@/components/landing/VenuesSection";
import { RolesSection } from "@/components/landing/RolesSection";
import { FinaleCta } from "@/components/landing/FinaleCta";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const dynamic = "force-dynamic";

/** Structured data — Organization + WebSite (the storefront pages add
 * Store + Product/Offer graphs of their own; LandingFaq adds FAQPage). */
const landingJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "سمارت أوردر",
      alternateName: "Smart Order",
      url: SITE_URL,
      logo: `${SITE_URL}/brand-icon.png`,
      description:
        "منصة الطلبات الرقمية للأعمال في ليبيا — متجر رقمي، طلبات عبر الويب وواتساب، لوحة تحكم كاملة.",
      sameAs: ["https://smart-link.ly", "https://menu.smart-link.ly", "https://bot.smart-link.ly"],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "سمارت أوردر",
      inLanguage: "ar-LY",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

/** Live, honest counts (family honesty policy: no invented numbers). */
async function getLandingStats(): Promise<{ totalStores: number; totalOrders: number }> {
  try {
    const [totalStores, totalOrders] = await Promise.all([
      db.business.count({ where: { isActive: true, isPublished: true } }),
      db.order.count(),
    ]);
    return { totalStores, totalOrders };
  } catch {
    return { totalStores: 0, totalOrders: 0 };
  }
}

/* Marquee vocabulary — the REAL partner/sector names from the shipped
   Local/Clients domain data (8 partners + 5 sectors), ×2 by the marquee
   kit for the seamless 42s RTL loop. */
const MARQUEE_ITEMS = [
  "متجر الواحة",
  "مطعم الأصيل",
  "بيتزا روما",
  "SOHO",
  "Telepizza",
  "The Cheese",
  "Empire",
  "Kubaba",
  "مطاعم",
  "مقاهي",
  "بيتزيريا",
  "برغر",
  "متاجر تجزئة",
];

export default async function LandingPage() {
  const stats = await getLandingStats();

  /* Trust band — the live DB figures the home has always published,
     plus the three cities the shipped testimonials name (SSR'd final +
     CountUp on view). The "+" rides only non-zero counts (honesty). */
  const trustStats = [
    {
      value: stats.totalStores > 0 ? `+${stats.totalStores}` : `${stats.totalStores}`,
      label: "متجر مسجل",
    },
    {
      value: stats.totalOrders > 0 ? `+${stats.totalOrders}` : `${stats.totalOrders}`,
      label: "طلب مستقبَل",
    },
    { value: "3", label: "مدن" },
  ];

  /* r128 Stage B (F4b) — the landing assembled as the Madarek journey
     (PORT-KIT §5, §6 Order column): المدار (kept split hero + the sky
     behind it) → شريط الشركاء (marquee) → الثقة → قطاعات المتاجر →
     رحلة الطلب (5 stations + light path --sp) → قصة التقدّم (--sp
     rings + live CountUp) → شركاؤنا على الأرض → الأدوار → نقطة
     البداية → الأسئلة الشائعة. The page stays a SERVER component —
     the h1 and hero sub render inline (instant-paint LCP doctrine,
     r8/r9); client islands are exactly: LandingHeader (chrome/spy/
     menus), HeroSection's sky (parallax + magnetic CTA), JourneySection
     (light path + --sp), ProgressSection (--sp + CountUp), CountUp, and
     the RevealCssClass observers. */
  return (
    <div className="landing relative flex min-h-dvh flex-col overflow-x-clip">
      <SkipLink />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(landingJsonLd) }}
      />

      <LandingHeader />

      <main id="main" className="flex-1">
        {/* ═══ الفصل ٠ — المدار: the kept split hero on the Orbit-Ink sky ═══ */}
        <HeroSection trustCount={stats.totalStores} />

        {/* ═══ شريط الشركاء — مدار واحد تنتظم فيه الأسماء (marquee) ═══ */}
        <LandingMarquee items={MARQUEE_ITEMS} />

        {/* ═══ الفصل ١ — الثقة (quiet mono DATA band, live figures) ═══ */}
        <section id="trust" className="ln-trust" aria-label="أرقام المنصّة">
          <div className="ln-trust-inner">
            {trustStats.map((s, i) => (
              <Fragment key={s.label}>
                {i > 0 && <span className="ln-trust-sep" aria-hidden="true" />}
                <span className="ln-mono">
                  <CountUp value={s.value} /> {s.label}
                </span>
              </Fragment>
            ))}
          </div>
        </section>

        {/* ═══ الفصل ٢ — قطاعات المتاجر (sectors constellation) ═══ */}
        <SectorsSection />

        {/* ═══ الفصل ٣ — رحلة الطلب (5 stations + light path) ═══ */}
        <JourneySection />

        {/* ═══ الفصل ٤ — قصّة التقدّم (--sp rings + real CountUp) ═══ */}
        <ProgressSection stores={stats.totalStores} orders={stats.totalOrders} />

        {/* ═══ الفصل ٥ — الأرض: شركاؤنا على الأرض (venues plate) ═══ */}
        <VenuesSection />

        {/* ═══ الفصل ٦ — الأدوار ═══ */}
        <RolesSection />

        {/* ═══ الفصل ٧ — نقطة البداية ═══ */}
        <FinaleCta />

        {/* ═══ الأسئلة الشائعة — compact, ln-styled, zero JS ═══ */}
        <LandingFaq />
      </main>

      <LandingFooter />

      {/* film-grain texture layer — last child, painted over the whole world
          (the ONE veil; the product grain-overlay retires with this commit) */}
      <div className="ln-grain" aria-hidden="true" />
    </div>
  );
}
