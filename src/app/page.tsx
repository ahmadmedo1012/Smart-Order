import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesBento } from "@/components/landing/features-bento";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LocalSection } from "@/components/landing/local-section";
import { FaqSection } from "@/components/landing/faq-section";
import { FinalCta } from "@/components/landing/final-cta";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Live, honest count of published stores (family honesty policy: no invented numbers). */
async function getStoreCount(): Promise<number> {
  try {
    return await db.business.count({ where: { isActive: true, isPublished: true } });
  } catch {
    return 0;
  }
}

export default async function LandingPage() {
  const storeCount = await getStoreCount();

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-background">
      {/* Family atmosphere: film-grain overlay (pointer-safe, both themes) */}
      <div className="grain-overlay" aria-hidden="true" />

      <Header />

      <main className="flex-1">
        <HeroSection trustCount={storeCount} />
        <FeaturesBento />
        <HowItWorks />
        <LocalSection />
        <FaqSection />
        <FinalCta />
      </main>

      <Footer />
    </div>
  );
}
