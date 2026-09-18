"use client";

import { ChevronDown } from "lucide-react";
import { SectionContainer } from "@/components/ui/section-container";
import { SectionHeader } from "@/components/ui/section-header";
import { Reveal } from "@/components/ui/scroll-reveal";

/** Family FAQ pattern — native details/summary with grid-rows expansion. */
const faqs = [
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

export function FaqSection() {
  return (
    <SectionContainer id="faq">
      <SectionHeader eyebrow="أسئلة شائعة" title="إجابات سريعة قبل أن تبدأ" />
      <Reveal y={20}>
        <div className="mx-auto max-w-3xl space-y-3 sm:space-y-4">
          {faqs.map((faq, i) => (
            <details
              key={i}
              className="group overflow-hidden rounded-xl border border-border/50 bg-card transition-[border-color,box-shadow] duration-500 open:border-accent-foreground/25 open:shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-sm px-4 py-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/60 sm:px-5 sm:text-base sm:py-4">
                {faq.q}
                <span className="text-muted-foreground transition-transform duration-300 group-open:rotate-180">
                  <ChevronDown className="size-4" aria-hidden="true" />
                </span>
              </summary>
              <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 group-open:grid-rows-[1fr]">
                <div className="overflow-hidden">
                  <p className="px-4 pb-4 text-xs leading-relaxed text-muted-foreground sm:px-5 sm:text-sm">
                    {faq.a}
                  </p>
                </div>
              </div>
            </details>
          ))}
        </div>
      </Reveal>
    </SectionContainer>
  );
}
