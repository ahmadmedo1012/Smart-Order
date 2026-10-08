import { Header } from "@/components/layout/header";
import { SkipLink } from "@/components/shared/skip-link";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesBento } from "@/components/landing/features-bento";
import { ShowcaseSection } from "@/components/landing/showcase-section";
import { StatsSection } from "@/components/landing/stats-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LocalSection } from "@/components/landing/local-section";
import { ClientsSection } from "@/components/landing/clients-section";
import { FaqSection } from "@/components/landing/faq-section";
import { FinalCta } from "@/components/landing/final-cta";
import { db } from "@/lib/db";
import { SITE_URL } from "@/app/layout";

export const dynamic = "force-dynamic";

/** Structured data — Organization + WebSite (the storefront pages add
 * Store + Product/Offer graphs of their own). */
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

export default async function LandingPage() {
  const stats = await getLandingStats();

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-background">
      <SkipLink />
      {/* Family atmosphere: film-grain overlay (pointer-safe, both themes) */}
      <div className="grain-overlay" aria-hidden="true" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(landingJsonLd) }}
      />

      <Header />

      <main id="main" className="flex-1">
        <HeroSection trustCount={stats.totalStores} />
        <FeaturesBento />
        <ShowcaseSection />
        <StatsSection stats={stats} />
        <HowItWorks />
        <LocalSection />
        <ClientsSection />
        <FaqSection />
        <FinalCta />
      </main>

      <Footer />
    </div>
  );
}
