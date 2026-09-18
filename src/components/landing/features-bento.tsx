"use client";

import { Smartphone, ClipboardList, Truck, CreditCard, MessageCircle, BarChart3, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionContainer } from "@/components/ui/section-container";
import { SectionHeader } from "@/components/ui/section-header";
import { Reveal } from "@/components/ui/scroll-reveal";

const features = [
  { title: "متجر يبيع فعلاً", icon: Smartphone, desc: "صفحة متجر سريعة بصور وأسعار وأقسام — تعمل من أي رابط على واتساب وفيسبوك وإنستغرام" },
  { title: "طلبات منظمة", icon: ClipboardList, desc: "حالات موحدة من الاستلام حتى التسليم مع سجل زمني وتنبيهات لما يحتاج انتباهك الآن" },
  { title: "توصيل بمناطقك", icon: Truck, desc: "مناطق ورسوم وحد أدنى لكل منطقة — تُحسب تلقائياً في الدفع دون أخطاء" },
  { title: "دفع محلي واقعي", icon: CreditCard, desc: "نقداً عند التوصيل أو تحويل مدار/ليبيانا مع تأكيد يدوي صادق — بلا وعود زائفة" },
  { title: "واتساب أولاً", icon: MessageCircle, desc: "رسالة طلب منسقة بضغطة واحدة وتتبع مباشر للعميل عبر رابط خاص" },
  { title: "أرقام تفهمها", icon: BarChart3, desc: "إيراد اليوم ومتوسط الطلب وعملاء جدد وأداء الأسبوع على شاشة واحدة" },
];

/* Family bento §5.2: mini stats for the hero card, derived from the feature
 * itself — no invented marketing metrics. */
const HERO_FEATURE_STATS = [
  { value: "فوري", label: "جهز متجرك" },
  { value: "بدون تثبيت", label: "يعمل من المتصفح" },
  { value: "متعدد", label: "طرق الدفع" },
];

export function FeaturesBento() {
  return (
    <SectionContainer id="features" tone="alt">
      <Reveal y={20}>
        <SectionHeader
          eyebrow="المزايا"
          title="كل ما يحتاجه متجرك للبيع، في مكان واحد"
          subtitle="سمارت أوردر ليس نموذج طلب — إنه نظام إدارة طلبات متكامل صُمم لطريقة عمل المتاجر في ليبيا."
        />
      </Reveal>

      {/* Family bento §5.3 — 4-col grid with minmax rows */}
      <div className="grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {features.map((feat, i) => {
          const isHero = i === 0;
          const isWide = i === features.length - 1;
          return (
            <Reveal
              key={i}
              y={24}
              delay={i * 60}
              className={cn(
                isHero && "lg:col-span-2 lg:row-span-2",
                isWide && "sm:col-span-2 lg:col-span-4",
              )}
            >
              <div
                className={cn(
                  "group relative h-full p-5 transition-[border-color,background-color,box-shadow] duration-500 hover:shadow-lg hover:shadow-accent-foreground/10 sm:p-6",
                  isHero
                    ? /* Family bento hero §5.2 — accent border + corner gradient */
                      "rounded-2xl border border-accent-foreground/30 bg-gradient-to-br from-accent-foreground/[0.04] via-card to-card"
                    : "rounded-2xl border border-border/50 bg-card hover:border-accent-foreground/30",
                )}
              >
                {isHero && (
                  <>
                    {/* Family corner glow §5.2 */}
                    <div aria-hidden="true" className="absolute -top-20 -end-20 size-48 rounded-full bg-accent-foreground/10 blur-3xl" />
                    {/* Family zap badge §5.2 */}
                    <div className="absolute top-4 end-4 flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[0.625rem] font-bold text-primary-foreground">
                      <Zap className="size-2.5 fill-current" aria-hidden="true" />
                      الأكثر طلباً
                    </div>
                  </>
                )}
                <div
                  className={cn(
                    "relative z-10 flex h-full flex-col",
                    isWide && "sm:flex-row sm:items-center sm:gap-5",
                  )}
                >
                  {/* Family icon chip §5.4 — borderless, bg-accent-foreground/10 */}
                  <div
                    className={cn(
                      "flex shrink-0 items-center justify-center rounded-xl bg-accent-foreground/10 transition-all duration-300 group-hover:scale-110 group-hover:bg-accent-foreground/15",
                      isHero ? "mb-5 size-11" : "mb-4 size-10 sm:size-11",
                      isWide && "sm:mb-0",
                    )}
                  >
                    <feat.icon className="size-5 text-accent-foreground" aria-hidden="true" />
                  </div>
                  <div className={cn("flex flex-1 flex-col", isWide && "sm:flex-initial")}>
                    <h3
                      className={cn(
                        "mb-2 font-bold",
                        isHero ? "text-xl sm:text-2xl" : "text-base sm:text-lg",
                        isWide && "sm:mb-1",
                      )}
                    >
                      {feat.title}
                    </h3>
                    <p
                      className={cn(
                        "text-sm leading-relaxed text-muted-foreground sm:text-base",
                        isHero && "mb-5",
                        isWide && "sm:mb-0",
                      )}
                    >
                      {feat.desc}
                    </p>

                    {isHero && (
                      /* Family mini-stats row §5.2 — pinned to card bottom via mt-auto */
                      <div className="mt-auto grid grid-cols-3 gap-2 border-t border-accent-foreground/10 pt-4">
                        {HERO_FEATURE_STATS.map((stat) => (
                          <div key={stat.label}>
                            <div className="text-sm font-bold leading-tight text-accent-foreground">{stat.value}</div>
                            <div className="mt-0.5 text-[0.625rem] text-muted-foreground">{stat.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </SectionContainer>
  );
}
