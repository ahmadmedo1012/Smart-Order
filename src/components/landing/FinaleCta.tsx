import Link from "next/link";
import { RevealCssClass } from "@/hooks/useReveal";
import { MagneticGoldLink } from "@/components/landing/MagneticGoldLink";

/* r142 «الخط» — FinaleCta «الوصول»: the road's terminus.
 * The converging orbit rings retire with the orbit identity; the line
 * (RouteSpine) ends HERE at the terminus node ([data-route-stop]), and
 * a crosswalk stripe band marks the arrival. Two verbs, one fork:
 * اطلب (the storefront) — أو اصنع متجرك (register). */

export function FinaleCta() {
  return (
    <section className="ln-cta" aria-label="ابدأ رحلتك">
      {/* the crosswalk — arrival stripes over the asphalt */}
      <div className="ln-cta-crossing" aria-hidden="true" />

      <div className="ln-cta-inner">
        {/* the terminus node — the line ends here */}
        <span className="ln-cta-terminus ln-route-stop" data-route-stop aria-hidden="true" />

        <span className="ln-label">{'05 — الوصول · ACCESS'}</span>
        <RevealCssClass as="h2" className="ln-cta-title" delay={1}>
          اطلب — <em>أو اصنع متجرك</em>
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-cta-lede" delay={2}>
          الطريق يسع الجميع: عميل يطلب من متجر على المنصّة، وتاجر يفتح
          متجره الليلة. ابدأ مجاناً بدون بطاقة ائتمان — والطلبات تصلك
          منظمة من اللحظة الأولى.
        </RevealCssClass>
        <RevealCssClass as="div" className="ln-cta-actions" delay={3}>
          <MagneticGoldLink href="/register" xl withArrow ariaLabel="أنشئ متجرك مجاناً — التسجيل">
            اصنع متجرك مجاناً
          </MagneticGoldLink>
          <Link href="/store/demo-store" className="ln-btn-ghost xl">اطلب من متجر تجريبي</Link>
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-cta-meta" delay={4}>
          <span className="ln-mono">{`SMART ORDER · THE LINE · ${new Date().getFullYear()}`}</span>
        </RevealCssClass>
      </div>
    </section>
  );
}
