"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { m, useReducedMotion } from "motion/react";
import { Star, Crown, Building2, Sparkles, ChevronDown, Zap, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { AnimatedSparkles } from "@/components/ui/animated-icons";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { cn } from "@/lib/utils";
import { springDefault } from "@/lib/motion";
import { type Plan, toArabicNumber } from "@/lib/plan-types";

/** Plan metadata by name (not index) — family PLAN_META pattern. */
const PLAN_META: Record<string, { icon: LucideIcon; badge: string; badgeColor: string }> = {
  Free: { icon: Sparkles, badge: "", badgeColor: "" },
  Basic: {
    icon: Star,
    badge: "الأكثر طلباً",
    badgeColor: "bg-orange text-orange-foreground",
  },
  Premium: {
    icon: Crown,
    badge: "الأفضل قيمة",
    badgeColor: "bg-gradient-to-r from-orange to-orange/80 text-orange-foreground",
  },
  Pro: {
    icon: Building2,
    badge: "",
    badgeColor: "",
  },
  Enterprise: {
    icon: Building2,
    badge: "للشركات الكبرى",
    badgeColor: "bg-gradient-to-r from-primary to-bloom text-primary-foreground",
  },
};
const DEFAULT_META = PLAN_META.Free;

function formatPrice(price: number): string {
  return toArabicNumber(price);
}

function PlanCard({ plan, index, yearly }: { plan: Plan; index: number; yearly: boolean }) {
  const reduceMotion = useReducedMotion();
  const meta = PLAN_META[plan.name] ?? DEFAULT_META;
  const Icon = meta.icon;
  const monthlyPrice = plan.price;
  const displayPrice = yearly ? monthlyPrice * 10 : monthlyPrice;
  const periodLabel = plan.periodDays === 0 ? "" : yearly ? "/السنة" : "/الشهر";
  const isPopular = index === 1;
  const isFree = plan.price === 0;

  return (
    <m.div
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ ...springDefault, delay: index * 0.08 }}
      className={cn(
        /* Family card §5.1 — edge glow instead of lift, 500ms motion */
        "group relative flex flex-col rounded-2xl border p-5 transition-[border-color,background-color,box-shadow] duration-500 hover:shadow-lg hover:shadow-accent-foreground/10 hover:border-accent-foreground/30 sm:p-6",
        isPopular
          ? /* Family popular card §5.2 — corner gradient + accent border */
            "border-accent-foreground/30 bg-gradient-to-br from-accent-foreground/[0.04] via-card to-card"
          : "border-border/50 bg-card"
      )}
    >
      {isPopular && (
        <>
          {/* Family corner back-glow §5.2 */}
          <div aria-hidden="true" className="pointer-events-none absolute -top-20 -end-20 size-48 rounded-full bg-accent-foreground/10 blur-3xl" />
          {/* Family zap badge — «الأكثر طلباً» */}
          <span className="absolute top-4 end-4 z-10 flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[0.625rem] font-bold text-primary-foreground">
            <Zap className="size-2.5 fill-current" aria-hidden="true" />
            الأكثر طلباً
          </span>
        </>
      )}
      {!isPopular && meta.badge && (
        /* Non-popular badges — same corner-chip geometry in their own colors */
        <span className={cn("absolute top-4 end-4 z-10 flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.625rem] font-bold", meta.badgeColor)}>
          {meta.badge}
        </span>
      )}

      <div className="relative flex flex-1 flex-col">
        <div className="mb-4 flex items-center gap-3">
          {/* Family icon chip §5.4 — borderless, bg-accent-foreground/10 */}
          <div
            className={cn(
              "flex size-11 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110",
              isFree ? "bg-muted text-muted-foreground" : "bg-accent-foreground/10 text-accent-foreground group-hover:bg-accent-foreground/15"
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold sm:text-lg">{plan.nameAr}</h2>
            <p className="text-xs text-muted-foreground">{plan.name}</p>
          </div>
        </div>

        <div className="mb-6">
          {isFree ? (
            <div className="text-[2.75rem] font-bold leading-none tabular-nums">مجاني</div>
          ) : (
            <div className="flex items-baseline gap-1">
              {/* Family price swap §5.7 — key re-triggers price-swap-in on toggle */}
              <span key={yearly ? "yearly" : "monthly"} className="animate-price-swap-in text-[2.75rem] font-bold leading-none tabular-nums">
                {formatPrice(displayPrice)}
              </span>
              <span className="text-sm font-medium text-muted-foreground sm:text-lg">د.ل</span>
              <span className="text-xs text-muted-foreground sm:text-sm">{periodLabel}</span>
            </div>
          )}
          {yearly && !isFree && (
            /* Family savings line — accent-foreground for AA on dark cards */
            <p className="mt-1 text-xs text-accent-foreground">وفر شهرين عند الاشتراك السنوي</p>
          )}
        </div>

        <div className="mb-6 space-y-2">
          {[
            ["المنتجات", plan.maxProducts === 9999 ? "غير محدود" : toArabicNumber(plan.maxProducts)],
            ["الطلبات الشهرية", plan.maxOrders === 99999 ? "غير محدود" : `حتى ${toArabicNumber(plan.maxOrders)}`],
          ].map(([label, val]) => (
            <div key={label as string} className="flex items-center justify-between rounded-lg bg-muted/45 px-3 py-2 text-sm">
              <span className="text-muted-foreground">{label as string}</span>
              <span className="font-semibold tabular nums">{val as string}</span>
            </div>
          ))}
        </div>

        <div className="mb-8 flex-1 space-y-3">
          {plan.features.map((feature: string, i: number) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              {/* Family feature bullets — dot marks instead of animated checks */}
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-foreground/60" />
              <span className="text-muted-foreground">{feature}</span>
            </div>
          ))}
        </div>

        <Link href={isFree ? "/register" : `/register?plan=${plan.id}`}>
          <Button
            className={cn("h-12 w-full", isPopular ? "bg-orange text-orange-foreground shadow-lg shadow-orange/25" : "")}
            variant={isPopular ? "default" : "outline"}
          >
            {isFree ? "ابدأ مجاناً" : "اشترك الآن"}
          </Button>
        </Link>
      </div>
    </m.div>
  );
}

/** Yearly billing = 10× monthly (two months free) — family math. */
const YEARLY_SAVINGS_PCT = Math.round((1 - 10 / 12) * 100);

export function PricingClient({ initialPlans }: { initialPlans: Plan[] | null }) {
  const [plans, setPlans] = useState<Plan[]>(initialPlans ?? []);
  const [loading, setLoading] = useState(initialPlans === null);
  const [yearly, setYearly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plans");
      const data = await res.json();
      setPlans(data.data ?? []);
      setError(null);
    } catch {
      setError("فشل تحميل الخطط");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (plans.length === 0) loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-dvh overflow-x-clip bg-background">
      <Header />

      <section className="relative border-b border-border/50 pb-16 pt-24 text-center sm:pb-20 sm:pt-28">
        <div className="relative z-10 mx-auto max-w-3xl px-4">
          {/* Family top pill — flame accent */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent-foreground/20 bg-accent-foreground/[0.06] px-4 py-1.5 text-sm text-accent-foreground">
            <AnimatedSparkles className="size-4" />
            خطط تناسب جميع الأحجام
          </div>
          {/* Family typography §3 — font-heading + tracking-tight + text-balance */}
          <h1 className="mb-4 font-heading text-3xl font-bold leading-[1.15] tracking-tight text-balance sm:text-4xl md:text-5xl lg:text-6xl">
            اختر خطتك
          </h1>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground sm:text-base">
            ابدأ برفع متجرك رقمياً واختر الخطة التي تناسب احتياجاتك — الترقية في أي وقت والفرق يُحسب تناسبياً
          </p>

          {/* Family monthly/yearly switch §5.7 — glass capsule */}
          <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 p-1 backdrop-blur sm:mt-8">
            <button
              type="button"
              onClick={() => setYearly(false)}
              aria-pressed={!yearly}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60 sm:text-sm",
                yearly ? "text-muted-foreground" : "bg-primary text-primary-foreground"
              )}
            >
              شهري
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              aria-pressed={yearly}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60 sm:text-sm",
                yearly ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
            >
              سنوي ·
              <span className={cn("ms-1 text-xs font-bold", yearly ? "text-primary-foreground" : "text-accent-foreground")}>
                وفّر {toArabicNumber(YEARLY_SAVINGS_PCT)}%
              </span>
            </button>
          </div>
        </div>
      </section>

      <section className="pb-16 sm:pb-24">
        <div className="mx-auto max-w-6xl px-4">
          {loading ? (
            <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:grid sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                /* Family loading skeletons — same card geometry */
                <div key={i} className="rounded-2xl border border-border/50 p-5 sm:p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="skeleton size-11 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 w-3/4 rounded-sm" />
                      <div className="skeleton h-3 w-1/2 rounded-sm" />
                    </div>
                  </div>
                  <div className="skeleton mb-6 h-8 w-1/2 rounded-sm" />
                  <div className="mb-6 space-y-2">
                    {[...Array(2)].map((_, j) => (
                      <div key={j} className="skeleton h-7 rounded-sm" />
                    ))}
                  </div>
                  <div className="mb-8 space-y-2">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="skeleton h-4 w-4/5 rounded-sm" />
                    ))}
                  </div>
                  <div className="skeleton h-12 rounded-sm" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
              <span>{error}</span>
              <Button variant="outline" onClick={loadPlans}>
                إعادة المحاولة
              </Button>
            </div>
          ) : plans.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
              <UtensilsCrossed className="size-10 opacity-40" aria-hidden="true" />
              <p className="text-sm">لا توجد خطط متاحة حالياً</p>
              <Button variant="outline" onClick={loadPlans}>
                إعادة المحاولة
              </Button>
            </div>
          ) : (
            <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:grid sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
              {plans.map((plan, i) => (
                <PlanCard key={plan.id} plan={plan} index={i} yearly={yearly} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="pb-16 sm:pb-24">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="mb-8 text-center text-xl font-bold sm:mb-10 sm:text-2xl">أسئلة شائعة</h2>
          <div className="space-y-3 sm:space-y-4">
            {[
              {
                q: "هل يمكنني الترقية لاحقاً؟",
                a: "نعم، يمكنك الترقية في أي وقت. سيتم احتساب الفرق بشكل تناسبي.",
              },
              {
                q: "هل يوجد فترة تجريبية؟",
                a: "نعم، الخطة المجانية متاحة للأبد مع ميزات محدودة. يمكنك الترقية في أي وقت.",
              },
              {
                q: "هل يمكنني إلغاء الاشتراك؟",
                a: "نعم، يمكنك إلغاء الاشتراك في أي وقت. يظل متجرك نشطاً حتى نهاية الفترة المدفوعة.",
              },
              {
                q: "ماذا يحدث عند بلوغ حد الطلبات؟",
                a: "لن يتوقف متجرك — ننبّهك عند الاقتراب من الحد، ويمكنك الترقية فوراً من لوحة التحكم.",
              },
            ].map((faq, i) => (
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
                    <p className="px-4 pb-3 text-xs leading-relaxed text-muted-foreground sm:px-5 sm:pb-4 sm:text-sm">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-16 sm:pb-24">
        <div className="mx-auto max-w-2xl px-4 text-center">
          {/* Family final CTA — card + flame top line */}
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 shadow-sm sm:p-8 md:p-12">
            <div className="absolute inset-x-0 top-0 mx-auto h-1 w-20 bg-primary" />
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl md:text-4xl">مستعد لانطلاق متجرك الرقمي؟</h2>
            <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground sm:mb-8 sm:text-base">
              ابدأ مجاناً بدون بطاقة ائتمان
            </p>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              <Link href="/register">
                <Button variant="flame" size="lg">
                  ابدأ مجاناً
                </Button>
              </Link>
              <Link href="/store/demo-store">
                <Button size="lg" variant="outline">
                  شاهد متجراً تجريبياً
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
