import Image from 'next/image';
import { RevealCssClass } from '@/hooks/useReveal';

/* r141 (task 3-a) — LogisticsBand «على الأرض»: Smart-Order's editorial
 * logistics band — the package, the road, and the handoff as one
 * asymmetric composition (no repeated card grid).
 *
 *   · package-hero.webp — the floating kraft box, the section's hero
 *     object (warm gold rim light on the ink stage);
 *   · delivery.webp — the door handoff (the COD moment — الدفع عند
 *     التوصيل is a real payment method in lib/constants);
 *   · scooter.webp — the city leg (delivery zones are real: the owner
 *     defines areas + fees, the customer sees the fee before ordering).
 *
 * Honest captions only — every claim maps to a shipped capability.
 * Server component: zero JS. Images ride next/image with real sizes;
 * below-fold images stay lazy (next/image default).
 */
export function LogisticsBand() {
  return (
    <section id="logistics-band" className="ln-chapter ln-logistics">
      <div className="ln-chapter-head">
        <span className="ln-label">{'03+ — على الأرض'}</span>
        <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
          الطرود والطريق <em>والدفع المحلي</em>
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
          من رفّ المخزن إلى باب العميل — التوصيل يُدار بمناطق ورسوم واضحة،
          والدفع يُحصَّل محلياً بالطرق التي يعرفها عملاؤك.
        </RevealCssClass>
      </div>

      <RevealCssClass as="div" delay={2}>
        <div className="ln-logistics-grid">
          {/* the package — the tall hero object (right in RTL) */}
          <figure className="ln-logistics-package">
            <Image
              src="/images/shipping/package-hero.webp"
              alt="طرد كرتوني بإضاءة ذهبية دافئة يطفو فوق أرض داكنة"
              fill
              sizes="(max-width: 920px) 92vw, 380px"
              className="ln-logistics-img"
            />
            <figcaption className="ln-logistics-cap">
              <strong>طردك هو واجهتك</strong>
              <span>صور متجرك وأسعارك تصل مع الطلب — العميل يطلب من الشاشة وما ينتظرش حد يرد عليه.</span>
            </figcaption>
          </figure>

          {/* the city leg — wide */}
          <figure className="ln-logistics-wide">
            <Image
              src="/images/shipping/scooter.webp"
              alt="دراجة توصيل تعبر شارعاً ليبياً مساءً بإضاءة دافئة"
              fill
              sizes="(max-width: 920px) 92vw, 560px"
              className="ln-logistics-img"
            />
            <figcaption className="ln-logistics-cap">
              <strong>مناطق توصيل برسوم واضحة</strong>
              <span>عرّف مناطقك ورسوم كل منطقة مرة واحدة — العميل يرى قيمة التوصيل قبل أن يؤكد طلبه.</span>
            </figcaption>
          </figure>

          {/* the door handoff — the COD moment */}
          <figure className="ln-logistics-door">
            <Image
              src="/images/shipping/delivery.webp"
              alt="تسليم طرد بين ساعي وعميل عند باب المنزل بضوء المساء"
              fill
              sizes="(max-width: 920px) 92vw, 420px"
              className="ln-logistics-img"
            />
            <figcaption className="ln-logistics-cap">
              <strong>الدفع عند التوصيل</strong>
              <span>نقداً عند الاستلام أو بالتحويل — طرق الدفع المحلية تُدار من لوحتك وتظهر في صفحة الطلب.</span>
            </figcaption>
          </figure>
        </div>
      </RevealCssClass>
    </section>
  );
}
