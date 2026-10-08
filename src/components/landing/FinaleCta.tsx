import Link from "next/link";
import { Sparkles } from "lucide-react";
import { RevealCssClass } from "@/hooks/useReveal";
import { MagneticGoldLink } from "@/components/landing/MagneticGoldLink";

/* r128 Stage B (F4b) — Chapter 06 «الوصول»: the starting point
 * (canonical anatomy, smart-link FinaleCta form). Converging orbit
 * rings, magnetic gold CTA (useMagnetic(7)) + ghost. Copy folds the
 * home's shipped final-CTA section (مستعد لاستقبال طلبك الأول
 * الليلة؟ / ابدأ مجاناً بدون بطاقة ائتمان / شاهد متجراً تجريبياً). */

export function FinaleCta() {
  const year = new Date().getFullYear();

  return (
    <section className="ln-cta" aria-label="ابدأ رحلتك">
      {/* converging orbits */}
      <div className="ln-cta-orbits" aria-hidden="true">
        <span className="ln-cta-orbit o0" />
        <span className="ln-cta-orbit o1" />
        <span className="ln-cta-orbit o2" />
      </div>
      <div className="ln-cta-inner">
        <span className="ln-label">{"06 — الوصول · ACCESS"}</span>
        <RevealCssClass as="h2" className="ln-cta-title" delay={1}>
          مستعد لاستقبال <em>طلبك الأول</em> الليلة؟
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-cta-lede" delay={2}>
          ابدأ مجاناً بدون بطاقة ائتمان — متجرك يجهز في نفس الجلسة،
          والطلبات تصلك منظمة من اللحظة الأولى.
        </RevealCssClass>
        <RevealCssClass as="div" className="ln-cta-actions" delay={3}>
          <MagneticGoldLink href="/register" xl withArrow ariaLabel="أنشئ متجرك مجاناً — التسجيل">
            أنشئ متجرك مجاناً
          </MagneticGoldLink>
          <Link href="/store/demo-store" className="ln-btn-ghost xl">شاهد متجراً تجريبياً</Link>
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-cta-meta" delay={4}>
          <Sparkles size={13} aria-hidden="true" />
          Smart Order · {year}
        </RevealCssClass>
      </div>
    </section>
  );
}
