import "./landing.css";
import { SkipLink } from "@/components/shared/skip-link";
import { db } from "@/lib/db";
import { SITE_URL } from "@/app/layout";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/hero-section";
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
   P12-3d (evaluator P1): the page-wide road line + scroll parcel
   (RouteSpine) is RETIRED — the prohibited thin-line/package family.
   The route language now lives in the hero's dotted-globe arcs and the
   journey's route-map nodes. The narrative stays the logistics one:

     00 — الطريق مفتوح (hero: the P12 dotted-globe network scene +
          the live roadmark board)
     01 — المحطات الخمس (the journey STORY: five route-map stops that map
          the six REAL TRACKING_FLOW states — the panel kickers count the
          real six; مَن يتصرف: الزبون/التاجر/مندوب التوصيل)
     02 — المتجر (the storefront actually working: phone + QR + cart)
     03 — لوحة التاجر (the REAL state machine, interactive + payments)
     04 — محطات الدفع (the REAL PAYMENT_TYPES as toll plates + USSD)
     05 — الوصول (اطلب — أو اصنع متجرك) → FAQ

   The page stays a SERVER component — the h1 and hero copy render
   inline (instant-paint LCP doctrine, r8/r9). Client islands are
   exactly: LandingHeader (chrome/spy/menus), GlobeMount → GlobeScene
   (the dotted-globe canvas, dynamic ssr:false), OrderJourneySection (route-map tabs),
   StorefrontScene + DashboardSection (motion/machine islands), CountUp
   (hero roadmark) and the RevealCssClass observers.

   The Madarek-generic chapters of r128–r141 (sectors constellation,
   journey light path, progress story, venues, roles, logistics band,
   marquee, orbit canvas) retire with this redesign — and the r142
   dimensional road/package hero retired with P12 (the dotted globe +
   orange route arcs now own the frame). The logistics identity still
   owns the WHOLE page.
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
        {/* ═══ the landing root — chapters in narrative order
            (P12-3d: the page-wide spine retired; routes live in the
            globe + journey map). ═══ */}
        <div className="ln-route-root relative">

          {/* ═══ 00 — الطريق مفتوح: the dimensional road scene + h1 LCP ═══ */}
          <HeroSection trustCount={stats.totalStores} totalOrders={stats.totalOrders} />

          {/* ═══ 01 — المحطات الخمس: the journey story mapping the REAL
                six-state TRACKING_FLOW (P14 2-d/3-d — story and machine
                counted separately, never conflated) ═══ */}
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
