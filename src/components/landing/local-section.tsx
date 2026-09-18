"use client";

import { Globe, ShieldCheck, Smartphone, MessageCircle } from "lucide-react";
import { SectionContainer } from "@/components/ui/section-container";
import { Reveal } from "@/components/ui/scroll-reveal";
import { Eyebrow } from "@/components/ui/eyebrow";

const points = [
  "واجهة عربية كاملة بمنطق RTL أصيل، خطوط عربية سريعة التحميل",
  "الأسعار بالدينار الليبي بدقة القرش، وأرقام هواتف ليبية معتمدة",
  "مدفوعات مدار وليبيانا والتحويل اليدوي مع تأكيد واقعي بدون وهم",
  "خفيف وسريع — يعمل جيداً حتى مع سرعات إنترنت متفاوتة",
  "واتساب قناة أساسية: رسالة طلب منسقة جاهزة للإرسال بضغطة",
];

/** Customer-side phone receipt — the "what your customer sees" proof card. */
function CustomerReceipt() {
  return (
    <div className="card-premium rounded-2xl p-6 shadow-xl sm:p-8">
      <div className="flex items-center gap-3 border-b border-border/60 pb-4">
        <Smartphone className="size-5 text-primary" aria-hidden="true" />
        <span className="font-semibold">تجربة العميل على الهاتف</span>
      </div>
      <div className="mt-5 space-y-3.5">
        {[
          { name: "بيتزا خضراء", price: "45.000 د.ل", qty: "١×" },
          { name: "برجر دجاج [كبير]", price: "23.500 د.ل", qty: "٢×" },
          { name: "بطاطس + جبنة (إضافة)", price: "9.000 د.ل", qty: "١×" },
        ].map((i) => (
          <div key={i.name} className="flex items-center justify-between text-sm">
            <span className="text-foreground/90">
              {i.qty} {i.name}
            </span>
            <span className="tabular font-medium">{i.price}</span>
          </div>
        ))}
        <div className="space-y-2 border-t border-border/60 pt-3.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>التوصيل — تاجوراء</span>
            <span className="tabular">8.000 د.ل</span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span>الإجمالي</span>
            <span className="tabular text-primary">109.000 د.ل</span>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <span className="whatsapp-btn inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors">
            <MessageCircle className="size-4" aria-hidden="true" />
            إرسال الطلب عبر واتساب
          </span>
        </div>
      </div>
    </div>
  );
}

export function LocalSection() {
  return (
    <SectionContainer id="local" className="border-y border-border/40 bg-primary/[0.04]">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <Reveal y={20} duration={0.55}>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent-foreground/20 bg-accent-foreground/[0.06] px-4 py-1.5 text-sm text-accent-foreground">
            <Globe className="size-4" aria-hidden="true" />
            عربي أولاً · مصمم لليبيا
          </div>
          <h2 className="font-heading text-3xl font-bold leading-snug sm:text-4xl">
            ليس ترجمة لمنتج أجنبي — بل نظام بُني لطريقة عملنا هنا
          </h2>
          <ul className="mt-6 space-y-4">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <span className="leading-relaxed text-foreground/90">{point}</span>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal y={20} duration={0.55} delay={120}>
          <CustomerReceipt />
        </Reveal>
      </div>
    </SectionContainer>
  );
}
