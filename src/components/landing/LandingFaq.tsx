import { RevealCssClass } from "@/hooks/useReveal";

/* r128 Stage B (F4b) — the compact ln-styled FAQ: the six REAL Q&As
 * from the shipped faq-section, verbatim, now on native <details>
 * rows (zero JS) over the Orbit-Ink ground — plus the FAQPage JSON-LD
 * so the rich results carry the same honest answers. */

const FAQS = [
  {
    q: "هل أحتاج خبرة تقنية لإنشاء متجري؟",
    a: "لا. التسجيل يستغرق أقل من دقيقتين، وإضافة المنتجات تتم من الهاتف بنفس سهولة نشر صورة على واتساب. لا تثبيت ولا برمجة.",
  },
  {
    q: "كيف يستلم متجري الطلبات؟",
    a: "كل طلب يصل فوراً إلى لوحة التحكم مع تنبيه، ويمكنك إرسال رسالة واتساب منسقة للعميل بضغطة واحدة، ومشاركة رابط التتبع المباشر معه.",
  },
  {
    q: "ما طرق الدفع المتاحة لعملائي؟",
    a: "الدفع نقداً عند الاستلام، أو تحويل عبر مدار وليبيانا — يعرض المتجر رقم التحويل ورمز التحويل السريع للعميل، ويؤكد المتجر الاستلام يدوياً من اللوحة.",
  },
  {
    q: "هل يمكنني تجربة المنصة مجاناً؟",
    a: "نعم. الخطة المجانية متاحة للأبد مع حدود واضحة، ويمكنك الترقية في أي وقت — يُحسب الفرق تناسبياً.",
  },
  {
    q: "هل يدعم التوصيل بمناطق ورسوم مختلفة؟",
    a: "نعم — حدد مناطق التوصيل ورسوم كل منطقة والحد الأدنى للطلب، وتُحسب الرسوم تلقائياً في صفحة الدفع حسب منطقة العميل.",
  },
  {
    q: "ماذا لو نفدت حدود خطتي؟",
    a: "لن يتوقف متجرك — سننبّهك عند الاقتراب من الحد الأقصى للمنتجات أو الطلبات الشهرية، ويمكنك الترقية من لوحة التحكم في أي وقت.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export function LandingFaq() {
  return (
    <section className="ln-faq" aria-label="الأسئلة الشائعة">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="ln-faq-head">
        <span className="ln-label">{"الأسئلة الشائعة · FAQ"}</span>
        <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
          أسئلة يسألها <em>أصحاب المتاجر</em>
        </RevealCssClass>
      </div>
      <div className="ln-faq-list">
        {FAQS.map((f) => (
          <details key={f.q} className="ln-faq-item">
            <summary className="ln-faq-q">{f.q}</summary>
            <p className="ln-faq-a">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
