"use client";

import { useRef } from "react";
import Image from "next/image";
import { m, useScroll, useTransform } from "motion/react";
import { SectionContainer } from "@/components/ui/section-container";
import { SectionHeader } from "@/components/ui/section-header";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

/**
 * ShowcaseSection — family twin (Smart Menu ShowcaseSection):
 * centered header, framed product screenshot (ring + inset hairline),
 * scroll-linked scale/y drift on the image, bottom accent glow.
 * Uses a real product screenshot (the seeded demo storefront).
 */
export function ShowcaseSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const imageScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.12, 1, 0.92]);
  const imageY = useTransform(scrollYProgress, [0, 0.5, 1], [40, 0, -40]);

  return (
    <SectionContainer ref={ref}>
      <ScrollReveal y={20}>
        <SectionHeader
          title="متجر يشرح نفسه"
          subtitle="تجربة رقمية واضحة تعرض منتجاتك وتوصل الطلب إليك منظماً دون خطوات مربكة."
        />
      </ScrollReveal>

      <ScrollReveal y={30} delay={100}>
        <div className="relative rounded-2xl bg-foreground/[0.035] p-1.5 ring-1 ring-foreground/10 sm:p-2 dark:bg-white/[0.045] dark:ring-white/10">
          <div className="relative overflow-hidden rounded-[calc(1rem-0.375rem)] shadow-[inset_0_1px_1px_color-mix(in_oklab,var(--foreground)_15%,transparent)] sm:rounded-[calc(1rem-0.5rem)]">
            <m.div style={{ scale: imageScale, y: imageY }}>
              <Image
                src="/showcase-store.webp"
                alt="معاينة المتجر الرقمي من الربط الذكي"
                width={1280}
                height={800}
                className="h-[360px] w-full object-cover object-top sm:h-[460px] md:h-[560px]"
                sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 1280px) calc(100vw - 48px), 1172px"
              />
            </m.div>

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/25" />
          </div>
        </div>

        {/* Ground glow — accent token */}
        <div className="pointer-events-none absolute -bottom-10 left-1/2 size-48 -translate-x-1/2 rounded-full bg-accent-foreground/10 blur-[80px] sm:size-64" />
      </ScrollReveal>
    </SectionContainer>
  );
}
