import "./landing.css";
import { SkipLink } from "@/components/shared/skip-link";
import { db } from "@/lib/db";
import { SITE_URL } from "@/app/layout";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/hero-section";
import { RouteSpine } from "@/components/landing/RouteSpine";
import { OrderJourneySection } from "@/components/landing/OrderJourneySection";
import { StorefrontSection } from "@/components/landing/StorefrontSection";
import { DashboardSection } from "@/components/landing/DashboardSection";
import { PaymentsSection } from "@/components/landing/PaymentsSection";
import { FinaleCta } from "@/components/landing/FinaleCta";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { LandingFooter } from "@/components/landing/LandingFooter";

/* r131-F2 (SO-2, A8 perf): marketing landing left force-dynamic — ISR 60s
 * (smart-menu landing precedent; counts are 60s-stale DB numbers, the
 * family honesty profile). */
export const revalidate = 60;

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

/* ═══════════════════════════════════════════════════════════════════════
   r142 «الخط» — the page IS the road.
   ─────────────────────────────────────────────────────────────────────
   One continuous route line (RouteSpine) runs from under the hero
   package down through EVERY chapter — each chapter head plants a
   [data-route-stop] station node, the six order states thread the line
   through themselves, and the road terminates at the finale. The
   narrative is the logistics one, end to end:

     00 — الطريق مفتوح (hero: dimensional package/scooter scene + the
          live roadmark board)
     01 — المحطات الست (the REAL TRACKING_FLOW as interactive stations
          with مَن يتصرف: الزبون/التاجر/مندوب التوصيل)
     02 — المتجر (the storefront actually working: phone + QR + cart)
     03 — لوحة التاجر (the REAL state machine, interactive + payments)
     04 — محطات الدفع (the REAL PAYMENT_TYPES as toll plates + USSD)
     05 — الوصول (اطلب — أو اصنع متجرك) → FAQ

   The page stays a SERVER component — the h1 and hero scene render
   inline (instant-paint LCP doctrine, r8/r9). Client islands are
   exactly: LandingHeader (chrome/spy/menus), RouteSpine (the line +
   the scroll parcel), OrderJourneySection (stations tabs),
   StorefrontScene + DashboardSection (motion/machine islands), CountUp
   (hero roadmark) and the RevealCssClass observers.

   The Madarek-generic chapters of r128–r141 (sectors constellation,
   journey light path, progress story, venues, roles, logistics band,
   marquee, orbit canvas) retire with this redesign — the logistics
   identity now owns the WHOLE page.
   ═══════════════════════════════════════════════════════════════════════ */
export default async function LandingPage() {
  const stats = await getLandingStats();

  return (
    <div className="landing relative flex min-h-dvh flex-col overflow-x-clip">
      {/* r129 — returning-visitor calm (canonical LandingPage.tsx:102-120,
          adapted for a server page): a blocking inline script marks
          .landing[data-intro-seen] from sessionStorage
          'smartorder.intro.seen' BEFORE the first paint — later visits
          this session snap the hero scene in fast instead of replaying
          the full fade. Product-scoped key per the port spec §9.2 item 6. */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "(function(){try{var r=document.currentScript.parentElement;if(window.sessionStorage.getItem('smartorder.intro.seen')==='1'){r.setAttribute('data-intro-seen','true')}else{window.sessionStorage.setItem('smartorder.intro.seen','1')}}catch(e){}})()",
        }}
      />
      {/* r129 S-18 — the landing re-skins the skip link to the canonical
          lime pill (centered, z-2100 above the grain veil); see
          landing.css §r129-b. */}
      <SkipLink className="ln-skip-link" />
      {/* r140 (P3-9): تهريب «<» — نفس نمط store/[slug]/page.tsx (الدرس
          العائلي: قيمة يتحكم فيها المالك تحمل </script> كانت تكسر
          السكربت المضمّن وتنفذ (XSS مخزّن). المحتوى ثابت اليوم؛ هذا
          تحصين الاتساق ضد أي قيم ديناميكية مستقبلًا. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(landingJsonLd).replace(/</g, "\\u003c") }}
      />

      <LandingHeader />

      {/* r129 S-19 — tabIndex -1: the skip-link focus target (canonical
          LandingPage.tsx:340); without it the focus jump lands on main
          without an AT-announced landmark change */}
      <main id="main" tabIndex={-1} className="flex-1">
        {/* ═══ «الخط» — the route root: every chapter below is a station
            on ONE continuous road; RouteSpine draws the road and rides
            the parcel along it (fully static under reduced-motion). ═══ */}
        <div className="ln-route-root relative">
          <RouteSpine />

          {/* ═══ 00 — الطريق مفتوح: the dimensional road scene + h1 LCP ═══ */}
          <HeroSection trustCount={stats.totalStores} totalOrders={stats.totalOrders} />

          {/* ═══ 01 — المحطات الست: the REAL TRACKING_FLOW as stations ═══ */}
          <OrderJourneySection />

          {/* ═══ 02 — المتجر: the storefront working (phone + QR + cart) ═══ */}
          <StorefrontSection />

          {/* ═══ 03 — لوحة التاجر: the REAL machine, interactive ═══ */}
          <DashboardSection />

          {/* ═══ 04 — محطات الدفع: the REAL PAYMENT_TYPES as toll plates ═══ */}
          <PaymentsSection />

          {/* ═══ 05 — الوصول: اطلب — أو اصنع متجرك (the line ends here) ═══ */}
          <FinaleCta />

          {/* ═══ الأسئلة الشائعة — compact, ln-styled, zero JS ═══ */}
          <LandingFaq />
        </div>
      </main>

      <LandingFooter />

      {/* film-grain texture layer — last child, painted over the whole world
          (the ONE veil; the product grain-overlay retires with this commit) */}
      <div className="ln-grain" aria-hidden="true" />
    </div>
  );
}
