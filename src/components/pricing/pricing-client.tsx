"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Star, Crown, Building2, Sparkles, ChevronDown, Zap, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { AnimatedSparkles } from "@/components/ui/animated-icons";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/scroll-reveal";
import { CountUp } from "@/components/ui/CountUp";
import { useMagnetic } from "@/hooks/useMagnetic";
import { PageScrollProgress } from "@/components/shared/page-scroll-progress";
import { api } from "@/lib/client";
import { type Plan, toArabicNumber } from "@/lib/plan-types";

/** Plan metadata by name (not index) — family PLAN_META pattern.
 *  r128-F8 (B18): badges flat — no gradient grounds (§7 discipline). */
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
    badgeColor: "bg-orange text-orange-foreground",
  },
  Pro: {
    icon: Building2,
    badge: "",
    badgeColor: "",
  },
  Enterprise: {
    icon: Building2,
    badge: "للشركات الكبرى",
    badgeColor: "bg-primary text-primary-foreground",
  },
};
const DEFAULT_META = PLAN_META.Free;

function formatPrice(price: number): string {
  return toArabicNumber(price);
}

function PlanCard({ plan, index, yearly }: { plan: Plan; index: number; yearly: boolean }) {
  const meta = PLAN_META[plan.name] ?? DEFAULT_META;
  const Icon = meta.icon;
  /* r128-F8 (B15/B18): magnetic pull (max 7px) on the popular plan's CTA —
     useMagnetic writes --mag-x/--mag-y (hover-capable devices only, RM-safe);
     the wrapper consumes them with a token-only transform transition. */
  const magRef = useMagnetic<HTMLDivElement>(7);
  const monthlyPrice = plan.price;
  const displayPrice = yearly ? monthlyPrice * 10 : monthlyPrice;
  const periodLabel = plan.periodDays === 0 ? "" : yearly ? "/السنة" : "/الشهر";
  const isPopular = index === 1;
  const isFree = plan.price === 0;

  return (
    <div
      className={cn(
        /* r128-F8 (B18): flat hairline card — solid ground, neutral lift on
           hover (no gradient wash, no corner glow); ladder durations. */
        "group relative flex flex-col rounded-2xl border p-5 transition-[border-color,background-color,box-shadow] duration-(--t-slower) hover:shadow-md hover:border-accent-foreground/30 sm:p-6",
        isPopular ? "border-accent-foreground/30 bg-card" : "border-border/50 bg-card"
      )}
    >
      {isPopular && (
        /* Family zap badge — «الأكثر طلباً» (flat primary chip) */
        <span className="absolute top-4 end-4 z-10 flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[0.625rem] font-bold text-primary-foreground">
          <Zap className="size-2.5 fill-current" aria-hidden="true" />
          الأكثر طلباً
        </span>
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
              "flex size-11 items-center justify-center rounded-xl transition-transform duration-(--t-base) group-hover:scale-110",
              isFree ? "bg-muted text-muted-foreground" : "bg-accent-foreground/10 text-accent-foreground"
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
            /* r128-F8 (B18): mono price — Latin/digits in the mixed-script mono stack */
            <div className="font-mono text-[2.75rem] font-bold leading-none tabular-nums">مجاني</div>
          ) : (
            <div className="flex items-baseline gap-1">
              {/* Family price swap §5.7 — key re-triggers price-swap-in on toggle */}
              <span key={yearly ? "yearly" : "monthly"} className="animate-price-swap-in font-mono text-[2.75rem] font-bold leading-none tabular-nums">
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
          {/* r128-F8 (B18): CountUp on the REAL plan limits (B9 port) —
              unlimited plans keep their plain word; numerals ride the
              mono stack (tabular, Latin digits settle). */}
          {[
            ["المنتجات", plan.maxProducts === 9999 ? null : "", plan.maxProducts],
            ["الطلبات الشهرية", plan.maxOrders === 99999 ? null : "حتى ", plan.maxOrders],
          ].map(([label, prefix, num]) => (
            <div key={label as string} className="flex items-center justify-between rounded-lg bg-muted/45 px-3 py-2 text-sm">
              <span className="text-muted-foreground">{label as string}</span>
              <span className="font-mono font-semibold tabular-nums">
                {prefix === null ? (
                  "غير محدود"
                ) : (
                  <CountUp value={`${prefix as string}${toArabicNumber(num as number)}`} />
                )}
              </span>
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

        {/* r128-F8 (B15/B18): the popular plan's CTA rides the magnetic pull;
            every other plan keeps the plain link. */}
        {isPopular ? (
          <div
            ref={magRef}
            className="mt-auto"
            style={{
              transform: "translate(var(--mag-x, 0px), var(--mag-y, 0px))",
              transition: "transform var(--t-fast) var(--ease)",
            }}
          >
            <Link href={`/register?plan=${plan.id}`} className="block">
              <Button className="h-12 w-full" variant="default">
                اشترك الآن
              </Button>
            </Link>
          </div>
        ) : (
          <Link href={isFree ? "/register" : `/register?plan=${plan.id}`}>
            <Button className="h-12 w-full" variant="outline">
              {isFree ? "ابدأ مجاناً" : "اشترك الآن"}
            </Button>
          </Link>
        )}
      </div>
    </div>
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
      /* r133 (A2 §2-3): lib/client.ts api.get — envelope unwrap + res.ok
         gate + Arabic network errors. The raw fetch answered a 500
         {success:false} with plans=[] and error=null, rendering the
         empty catalog as if it were the catalog (A2's sharper case). */
      const r = await api.get<Plan[]>("/api/plans");
      setPlans(r.data ?? []);
    } catch {
      setError("تعذّر تحميل الباقات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (plans.length === 0) loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    /* r133 (A11 S3): the pricing page had no <main> landmark — axe
       region rule fails and SR landmark nav finds nothing. */
    <main className="min-h-dvh overflow-x-clip bg-background">
      {/* r128-F8 (B18): page-level scroll progress — quiet 2px flat ribbon */}
      <PageScrollProgress />
      <Header />

      <section className="relative border-b border-border/50 pb-16 pt-24 text-center sm:pb-20 sm:pt-28">
        <div className="relative z-10 mx-auto max-w-3xl px-4">
          {/* r128-F8 (B13/B18): chapter label — quiet mono eyebrow (ln-label
              pattern: mono 12px + 0.08em tracking, on product tokens) */}
          <p className="mb-4 font-mono text-xs font-medium tracking-[0.08em] text-accent-foreground">
            01 — الباقات
          </p>
          {/* Family top pill — flame accent */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent-foreground/20 bg-accent-foreground/[0.06] px-4 py-1.5 text-sm text-accent-foreground">
            <AnimatedSparkles className="size-4" />
            باقات تناسب جميع الأحجام
          </div>
          {/* Family typography §3 — font-heading + tracking-tight + text-balance */}
          <h1 className="mb-4 font-heading text-3xl font-bold leading-[1.15] tracking-tight text-balance sm:text-4xl md:text-5xl lg:text-6xl">
            اختر باقتك
          </h1>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground sm:text-base">
            ابدأ برفع متجرك رقمياً واختر الباقة التي تناسب احتياجاتك — الترقية في أي وقت والفرق يُحسب تناسبياً
          </p>

          {/* Family monthly/yearly switch §5.7 — capsule (r128-F8: solid
              ground, no glass blur) */}
          <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-border/60 bg-card p-1 sm:mt-8">
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
              <p className="text-sm">لا توجد باقات متاحة حالياً</p>
              <Button variant="outline" onClick={loadPlans}>
                إعادة المحاولة
              </Button>
            </div>
          ) : (
            <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:grid sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
              {plans.map((plan, i) => (
                /* r128-F8 (B18): shared Reveal primitive (SSR-visible family
                   entrance) with the family stagger — replaces the off-ladder
                   springDefault whileInView. */
                <Reveal key={plan.id} className="min-w-0" delay={i * 60}>
                  <PlanCard plan={plan} index={i} yearly={yearly} />
                </Reveal>
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
                a: "نعم، الباقة المجانية متاحة للأبد مع ميزات محدودة. يمكنك الترقية في أي وقت.",
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
                className="group overflow-hidden rounded-xl border border-border/50 bg-card transition-[border-color,box-shadow] duration-(--t-slower) open:border-accent-foreground/25 open:shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between rounded-sm px-4 py-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/60 sm:px-5 sm:text-base sm:py-4">
                  {faq.q}
                  <span className="text-muted-foreground transition-transform duration-(--t-base) group-open:rotate-180">
                    <ChevronDown className="size-4" aria-hidden="true" />
                  </span>
                </summary>
                <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-(--t-base) group-open:grid-rows-[1fr]">
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
    </main>
  );
}
