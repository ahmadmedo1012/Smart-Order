"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/components/ui/section-container";
import { Reveal } from "@/components/ui/scroll-reveal";
import { MotionArrowRight } from "@/components/ui/motion-icons";

/** Family final-CTA pattern — flame top line + card + button pair. */
export function FinalCta() {
  return (
    <SectionContainer className="pb-16 sm:pb-24">
      <Reveal y={20}>
        <div className="mx-auto max-w-2xl px-4 text-center">
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 shadow-sm sm:p-8 md:p-12">
            {/* Family signature: flame top line */}
            <div className="absolute inset-x-0 top-0 mx-auto h-1 w-20 bg-primary" />
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl md:text-4xl">
              مستعد لاستقبال طلبك الأول الليلة؟
            </h2>
            <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground sm:mb-8 sm:text-base">
              ابدأ مجاناً بدون بطاقة ائتمان — متجرك يجهز في نفس الجلسة
            </p>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              <Link href="/register">
                <Button variant="flame" size="lg">
                  ابدأ مجاناً <MotionArrowRight className="size-4 rtl:rotate-180" />
                </Button>
              </Link>
              <Link href="/store/demo-store">
                <Button variant="outline" size="lg">
                  شاهد متجراً تجريبياً
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </SectionContainer>
  );
}
