"use client";

import { cn } from "@/lib/utils";
import { MotionCheck } from "@/components/ui/motion-icons";
import { MotionArrowLeft } from "@/components/ui/motion-icons";
import { Button } from "@/components/ui/button";
import { Sparkles, Star, Crown, Building2, Flame, type LucideIcon } from "lucide-react";
import type { Plan } from "@/lib/plan-types";

/** Plan metadata by name (family PLAN_META pattern — survives reordering). */
const PLAN_META: Record<string, { icon: LucideIcon; chip: string; recommended?: boolean }> = {
  Free: { icon: Sparkles, chip: "bg-muted text-muted-foreground" },
  Basic: { icon: Star, chip: "bg-gradient-to-br from-orange to-orange/80 text-white", recommended: true },
  Premium: { icon: Crown, chip: "bg-gradient-to-br from-saffron to-primary text-white" },
  Pro: { icon: Building2, chip: "bg-gradient-to-br from-primary to-bloom text-white" },
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
      <h2 className="mb-8 text-center font-heading text-2xl font-bold">اختر خطة تناسب متجرك</h2>
      <div className="mx-auto mb-8 grid max-w-4xl gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const meta = PLAN_META[plan.name] ?? DEFAULT_META;
          const Icon = meta.icon;
          const isSelected = selectedPlan?.id === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => onSelect(plan)}
              aria-pressed={isSelected}
              className={cn(
                /* Family selection card §5.1/§5.2 — edge glow + rounded-2xl geometry */
                "relative flex flex-col rounded-2xl border p-5 text-start transition-[border-color,background-color,box-shadow] duration-500 hover:shadow-lg hover:shadow-accent-foreground/10 outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                isSelected
                  ? "border-accent-foreground/40 bg-gradient-to-br from-accent-foreground/[0.04] via-card to-card shadow-lg shadow-accent-foreground/10 ring-2 ring-primary/30"
                  : "border-border/50 bg-card hover:border-accent-foreground/30"
              )}
            >
              {/* Selection check — shape + position carry the state (a11y) */}
              <span
                aria-hidden={!isSelected}
                className={cn(
                  "absolute -top-2 -end-2 flex size-6 items-center justify-center rounded-full shadow-lg transition-opacity duration-200",
                  isSelected ? "bg-primary opacity-100" : "pointer-events-none bg-border/60 opacity-0"
                )}
              >
                <MotionCheck className="size-3.5 text-white" />
              </span>

              {meta.recommended && (
                /* Family popularity badge — flame gradient with espresso text */
                <span className="absolute top-3 end-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[var(--c-ember)] via-[var(--c-saffron)] to-[var(--c-ember)] px-2.5 py-0.5 text-[10px] font-bold text-espresso shadow-sm">
                  <Flame className="size-3" aria-hidden="true" />
                  الأكثر شعبية
                </span>
              )}

              <span className={cn("mb-3 flex size-10 items-center justify-center rounded-xl shadow-lg", meta.chip)}>
                <Icon className="size-5 text-white" aria-hidden="true" />
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
          );
        })}
      </div>
      <div className="text-center">
        <Button size="lg" variant={selected ? "flame" : "outline"} className="h-14 px-10 text-lg" disabled={!selectedPlan} onClick={onContinue}>
          {selected ? `متابعة مع خطة ${selected.nameAr}` : "اختر خطة أولاً"}
          <MotionArrowLeft className="ms-2 size-5" />
        </Button>
      </div>
    </div>
  );
}
