"use client";

import { SectionContainer } from "@/components/ui/section-container";
import { SectionHeader } from "@/components/ui/section-header";
import { Reveal } from "@/components/ui/scroll-reveal";

const steps = [
  { n: "١", title: "أنشئ متجرك", desc: "اسم العمل، المدينة، رقم واتساب — رابط متجرك يجهز فوراً." },
  { n: "٢", title: "أضف منتجاتك", desc: "أقسام، صور، أسعار، أحجام وإضافات — من هاتفك مباشرة." },
  { n: "٣", title: "انشر واستقبل", desc: "شارك الرابط على واتساب وفيسبوك وإنستغرام — الطلبات تصلك للوحة التحكم." },
];

export function HowItWorks() {
  return (
    <SectionContainer id="how">
      <SectionHeader eyebrow="كيف يعمل" title="من التسجيل إلى أول طلب في ثلاث خطوات" />
      <div className="grid gap-6 sm:gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <Reveal key={s.n} y={24} delay={i * 90}>
            <div className="card-premium group relative rounded-2xl p-6 pt-8">
              {/* Step number — flame gradient chip, family step-node pattern */}
              <span className="absolute -top-4 start-6 flex size-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--c-ember),var(--c-saffron)_50%,var(--c-ember))] text-sm font-extrabold text-espresso shadow-lg shadow-orange/30">
                {s.n}
              </span>
              <h3 className="font-heading text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </SectionContainer>
  );
}
