import { Utensils, Coffee, Pizza, Sandwich, ShoppingBag } from "lucide-react";
import { RevealCssClass } from "@/hooks/useReveal";

/* r128 Stage B (F4b) — Chapter 04 «الأرض»: the ground plate
 * (campus→platforms→PARTNER VENUES per PORT-KIT §6). Smart-Order's
 * ground is the partner-venue world: the eight real stores from the
 * shipped clients section, each with its sector and city (cities from
 * the real testimonial designations; where none is published the tag
 * stays «ليبيا» — no invented geography). Flat ink-2 band, hairline
 * cells, tone-coded wells. */

const VENUES = [
  { icon: ShoppingBag, tone: "gold", name: "متجر الواحة", desc: "متجر تجزئة — الطلبات تصل مرتبة وواضحة", tag: "طرابلس" },
  { icon: Utensils, tone: "azure", name: "مطعم الأصيل", desc: "مطعم — طلبات منظمة عبر المتجر الرقمي", tag: "ليبيا" },
  { icon: Pizza, tone: "mist", name: "بيتزا روما", desc: "بيتزيريا — طلبات التيك أوي أسرع وأدق", tag: "ليبيا" },
  { icon: Coffee, tone: "gold", name: "SOHO", desc: "مقهى — العملاء يطلبون بضغطة زر", tag: "طرابلس" },
  { icon: Pizza, tone: "azure", name: "Telepizza", desc: "مطعم بيتزا — أخطاء أقل بكثير", tag: "بنغازي" },
  { icon: Sandwich, tone: "mist", name: "The Cheese", desc: "مطعم برغر — كل طلب واصل مدفوع وواضح", tag: "مصراتة" },
  { icon: Coffee, tone: "gold", name: "Empire", desc: "مقهى — ربطٌ بواتساب وفر وقتاً وجهداً", tag: "طرابلس" },
  { icon: Utensils, tone: "azure", name: "Kubaba", desc: "مطعم — إحصائيات تساعد على تطوير الخدمة", tag: "بنغازي" },
];

export function VenuesSection() {
  return (
    <section id="venues" className="ln-chapter ln-venues">
      <div className="ln-chapter-head">
        <span className="ln-label">{"04 — الأرض"}</span>
        <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
          شركاؤنا على <em>الأرض</em>
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
          متاجر حقيقية تدير طلباتها اليومية على المنصّة — من طرابلس إلى
          بنغازي إلى مصراتة، كل جهة تدير يومها من لوحة واحدة.
        </RevealCssClass>
      </div>

      <RevealCssClass as="div" delay={2}>
        <div className="ln-venues-grid">
          {VENUES.map((v) => (
            <article key={v.name} className="ln-venue-cell">
              <span className={`ln-venue-ico ${v.tone}`} aria-hidden="true">
                <v.icon size={26} strokeWidth={1.7} />
              </span>
              <h3 className="ln-venue-name">{v.name}</h3>
              <p className="ln-venue-desc">{v.desc}</p>
              <span className="ln-venue-tag ln-mono">{v.tag}</span>
            </article>
          ))}
        </div>
      </RevealCssClass>
    </section>
  );
}
