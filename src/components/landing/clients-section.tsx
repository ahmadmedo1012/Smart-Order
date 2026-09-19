"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { m, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatedQuote, AnimatedStar } from "@/components/ui/animated-icons";
import { SectionContainer } from "@/components/ui/section-container";
import { SectionHeader } from "@/components/ui/section-header";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { springGentle } from "@/lib/motion";
import { cn } from "@/lib/utils";

/* ── Partner data (store-sector Libyana brands pattern) ── */
const PARTNERS = [
  { name: "متجر الواحة" },
  { name: "مطعم الأصيل" },
  { name: "بيتزا روما" },
  { name: "SOHO" },
  { name: "Telepizza" },
  { name: "The Cheese" },
  { name: "Empire" },
  { name: "Kubaba" },
];

/* ── Testimonials — store owners on the order platform ── */
const TESTIMONIALS = [
  { quote: "المنصة سهلت علينا عملية الطلب بشكل كبير. عملاؤنا صاروا يطلبون بضغطة زر والطلبات تصلنا منظمة بدون أخطاء.", name: "SOHO", designation: "مقهى، طرابلس" },
  { quote: "المتجر الرقمي والتوصيل بمناطق مخصصة خلى طلبات التيك أوي أسرع وأدق. صارت الأخطاء أقل بكثير.", name: "Telepizza", designation: "مطعم بيتزا، بنغازي" },
  { quote: "طرق الدفع المحلية والمحفظة وفرت علينا متابعة التحصيل. كل طلب واصل مدفوع وواضح.", name: "The Cheese", designation: "مطعم برغر، مصراتة" },
  { quote: "سهولة استخدام المتجر وربطه بواتساب وفر علينا وقت وجهد كبيرين. تجربة ممتازة.", name: "Empire", designation: "مقهى، طرابلس" },
  { quote: "الإحصائيات ساعدتنا نفهم سلوك الزبائن ونطور الخدمة بثقة.", name: "Kubaba", designation: "مطعم، بنغازي" },
  { quote: "الزبائن صاروا يطلبون مباشرة من المتجر دون الاتصال بنا. الطلبات تصل مرتبة وواضحة.", name: "أحمد المبروك", designation: "متجر الواحة، طرابلس" },
];

function AvatarInitials({ name }: { name: string }) {
  // Latin names take the first two letters; Arabic names take the first word's initial
  const isLatin = /^[A-Za-z]/.test(name);
  const initials = isLatin
    ? name.slice(0, 2).toUpperCase()
    : name.trim().charAt(0);
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-accent-foreground/20 bg-gradient-to-br from-accent-foreground/20 to-accent-foreground/5 text-sm font-bold text-accent-foreground">
      {initials}
    </div>
  );
}

/* ── Partner grid (family pattern) ── */
function PartnerGrid() {
  return (
    <ScrollReveal y={16}>
      <div className="mb-12 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/50 bg-border/50 sm:grid-cols-4 sm:mb-14">
        {PARTNERS.map((p) => (
          <div key={p.name} className="bg-card px-4 py-5 text-center text-sm font-semibold text-muted-foreground/80">
            {p.name}
          </div>
        ))}
      </div>
    </ScrollReveal>
  );
}

/* ── Testimonial card ── */
function TestimonialCard({ t }: { t: (typeof TESTIMONIALS)[number] }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className="text-center"
    >
      <AnimatedQuote className="mx-auto mb-3 size-6 text-accent-foreground/30 sm:mb-4 sm:size-7" />

      <div className="mb-4 flex justify-center gap-1">
        {[...Array(5)].map((_, j) => (
          <AnimatedStar key={j} className="size-[13px] fill-accent-foreground text-accent-foreground/80 sm:size-[14px]" />
        ))}
      </div>

      <blockquote className="mx-auto mb-5 max-w-lg text-[0.9rem] leading-[1.75] text-muted-foreground/85 font-[430] sm:mb-6 sm:text-[1rem]">
        &ldquo;{t.quote}&rdquo;
      </blockquote>

      <div className="flex items-center justify-center gap-3">
        <AvatarInitials name={t.name} />
        <div className="text-start">
          <p className="text-sm font-[500] text-foreground/90">{t.name}</p>
          <p className="mt-0.5 text-[0.75rem] text-muted-foreground/60">{t.designation}</p>
        </div>
      </div>
    </m.div>
  );
}

/* ── Navigation pills ── */
function NavPill({ i, active, onClick }: { i: number; active: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full transition-[width,height,background-color] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-foreground/60",
        i === active ? "h-[5px] w-6 bg-primary" : "h-[5px] w-[5px] bg-border/50 hover:bg-accent-foreground/40",
      )}
      aria-label={`التقييم ${i + 1}`}
    />
  );
}

/* ── Root ── */
export function ClientsSection() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const n = TESTIMONIALS.length;

  const goTo = useCallback((i: number) => setActive(((i % n) + n) % n), [n]);
  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1), [active, goTo]);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(next, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [next, paused]);

  const activeT = TESTIMONIALS[active];

  return (
    <SectionContainer className="bg-gradient-to-b from-background via-accent-foreground/[0.012] to-background">
      <ScrollReveal y={20}>
        <SectionHeader title="تجارب من المتاجر" subtitle="ما يقوله أصحاب المتاجر عن إدارة الطلبات والتوصيل يومياً." />
      </ScrollReveal>

      <PartnerGrid />

      <ScrollReveal y={16} delay={100}>
        <m.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ ...springGentle, delay: 0.1 }}
          className="mx-auto max-w-lg"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <div className="relative rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border/40 sm:p-8">
            <AnimatePresence mode="wait">
              <TestimonialCard key={active} t={activeT} />
            </AnimatePresence>
          </div>

          {/* Controls — family chevrons + pills */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={prev}
              aria-label="التقييم السابق"
              className="flex size-11 items-center justify-center rounded-xl border border-border/60 bg-card transition-[color,background-color,border-color,transform] duration-200 hover:border-accent-foreground/40 hover:bg-accent-foreground/10 active:scale-90 focus-visible:ring-2 focus-visible:ring-accent-foreground/60"
            >
              <ChevronRight className="size-4" />
            </button>

            <div className="flex items-center gap-2" role="tablist" aria-label="التقييمات">
              {TESTIMONIALS.map((_, i) => (
                <NavPill key={i} i={i} active={active} onClick={() => goTo(i)} />
              ))}
            </div>

            <button
              onClick={next}
              aria-label="التقييم التالي"
              className="flex size-11 items-center justify-center rounded-xl border border-border/60 bg-card transition-[color,background-color,border-color,transform] duration-200 hover:border-accent-foreground/40 hover:bg-accent-foreground/10 active:scale-90 focus-visible:ring-2 focus-visible:ring-accent-foreground/60"
            >
              <ChevronLeft className="size-4" />
            </button>
          </div>
        </m.div>
      </ScrollReveal>
    </SectionContainer>
  );
}
