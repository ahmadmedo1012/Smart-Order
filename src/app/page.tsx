import { Header } from "@/components/layout/header";
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

export const dynamic = "force-dynamic";

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
      {/* Family atmosphere: film-grain overlay (pointer-safe, both themes) */}
      <div className="grain-overlay" aria-hidden="true" />

      <Header />

      <main className="flex-1">
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
