"use client";

import { cn } from "@/lib/utils";
import { MotionCheck } from "@/components/ui/motion-icons";
import { MotionArrowLeft } from "@/components/ui/motion-icons";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/scroll-reveal";
import { Sparkles, Star, Crown, Building2, Flame, type LucideIcon } from "lucide-react";
import type { Plan } from "@/lib/plan-types";

/** Plan metadata by name (family PLAN_META pattern — survives reordering).
 *  r128-F8 (B20): icon chips flat — no gradient grounds (§7 discipline). */
const PLAN_META: Record<string, { icon: LucideIcon; chip: string; recommended?: boolean }> = {
  Free: { icon: Sparkles, chip: "bg-muted text-muted-foreground" },
  Basic: { icon: Star, chip: "bg-orange text-espresso", recommended: true },
  Premium: { icon: Crown, chip: "bg-saffron text-espresso" },
  Pro: { icon: Building2, chip: "bg-primary text-primary-foreground" },
};
const DEFAULT_META = PLAN_META.Free;

function itemsPhrase(plan: Plan): string {
  const products = plan.maxProducts >= 9999 ? "منتجات غير محدودة" : `${plan.maxProducts} منتجاً`;
  const orders = plan.maxOrders >= 99999 ? "طلبات غير محدودة" : `${plan.maxOrders} طلباً شهرياً`;
  return `${products} · ${orders}`;
}

/**
 * PlanSelector — family twin (Smart Menu subscribe/PlanSelector.tsx):
 * 2×2/4-col selection cards — border-2 selected ring + corner check,
 * flame "الأكثر شعبية" badge on Basic, feature checks in the bright flame.
 */
export function PlanSelector({
  plans,
  selectedPlan,
  onSelect,
  onContinue,
}: {
  plans: Plan[];
  selectedPlan: Plan | null;
  onSelect: (p: Plan) => void;
  onContinue: () => void;
}) {
  const selected = selectedPlan;

  return (
    <div className="animate-fade-in">
      <h2 className="mb-8 text-center font-heading text-2xl font-bold">اختر باقة تناسب متجرك</h2>
      <div className="mx-auto mb-8 grid max-w-4xl gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan, i) => {
          const meta = PLAN_META[plan.name] ?? DEFAULT_META;
          const Icon = meta.icon;
          const isSelected = selectedPlan?.id === plan.id;
          return (
            /* r128-F8 (B20): reveal primitive on the plan grid (shared
               SSR-visible family entrance, quiet stagger). */
            <Reveal key={plan.id} className="min-w-0 h-full" delay={i * 60}>
            <button
              type="button"
              onClick={() => onSelect(plan)}
              aria-pressed={isSelected}
              className={cn(
                /* r128-F8 (B20): flat hairline selection card — ladder
                   duration, no gradient wash, neutral hover lift. */
                "relative flex h-full w-full flex-col rounded-2xl border p-5 text-start transition-[border-color,background-color,box-shadow] duration-(--t-slower) hover:shadow-md hover:border-accent-foreground/30 outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                isSelected
                  ? "border-accent-foreground/40 bg-card shadow-sm ring-2 ring-primary/30"
                  : "border-border/50 bg-card"
              )}
            >
              {/* Selection check — shape + position carry the state (a11y) */}
              <span
                aria-hidden={!isSelected}
                className={cn(
                  "absolute -top-2 -end-2 flex size-6 items-center justify-center rounded-full shadow-sm transition-opacity duration-(--t-fast)",
                  isSelected ? "bg-primary opacity-100" : "pointer-events-none bg-border/60 opacity-0"
                )}
              >
                <MotionCheck className="size-3.5 text-orange-foreground" />
              </span>

              {meta.recommended && (
                /* Family popularity badge — flat flame ground, espresso ink */
                <span className="absolute top-3 end-3 inline-flex items-center gap-1 rounded-full bg-orange px-2.5 py-0.5 text-[10px] font-bold text-espresso shadow-sm">
                  <Flame className="size-3" aria-hidden="true" />
                  الأكثر شعبية
                </span>
              )}

              <span className={cn("mb-3 flex size-10 items-center justify-center rounded-xl shadow-sm", meta.chip)}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mb-1 font-heading text-lg font-bold">{plan.nameAr}</h3>
              <div className="mb-3 flex items-baseline gap-1">
                <span className="text-2xl font-bold tabular-nums">
                  {Number(plan.price) === 0 ? "مجاني" : plan.price}
                </span>
                {Number(plan.price) > 0 && <span className="text-xs text-muted-foreground">د.ل/شهر</span>}
              </div>
              <p className="mb-3 text-xs text-muted-foreground">{itemsPhrase(plan)}</p>
              <div className="mb-4 flex-1 space-y-1.5">
                {plan.features.slice(0, 4).map((f, j) => (
                  <div key={j} className="flex items-center gap-2 text-xs">
                    {/* Family feature marks — bright flame checks */}
                    <MotionCheck className="size-3 shrink-0 text-accent-foreground" />
                    <span>{f}</span>
                  </div>
                ))}
                {plan.features.length > 4 && (
                  <p className="text-xs font-medium text-accent-foreground">
                    +{plan.features.length - 4} ميزات أخرى
                  </p>
                )}
              </div>
            </button>
            </Reveal>
          );
        })}
      </div>
      <div className="text-center">
        <Button size="lg" variant={selected ? "flame" : "outline"} className="h-14 px-10 text-lg" disabled={!selectedPlan} onClick={onContinue}>
          {selected ? `متابعة مع باقة ${selected.nameAr}` : "اختر باقة أولاً"}
          <MotionArrowLeft className="ms-2 size-5" />
        </Button>
      </div>
    </div>
  );
}
