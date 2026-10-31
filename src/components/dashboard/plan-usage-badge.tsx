"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanInfo {
  name: string;
  nameAr: string;
  price: number;
  maxProducts: number;
  maxOrders: number;
}

/**
 * PlanUsageBadge — family twin (Smart Menu owner/PlanUsageBadge):
 * the merchant's current plan chip + honest usage progress against the
 * plan limits, linking to pricing for upgrades.
 */
export function PlanUsageBadge({
  plan,
  productCount,
  monthOrders,
  className,
}: {
  plan: PlanInfo | null;
  productCount: number;
  monthOrders: number;
  className?: string;
}) {
  /* P38 (B5): DERIVED, not stored — usage is pure math on the props.
     The old effect-bounced copy lagged one render behind every
     dashboard poll; derivation lands in the same commit as the numbers. */
  const usage = !plan
    ? null
    : {
        products: plan.maxProducts >= 9999 ? 0 : Math.min(100, Math.round((productCount / plan.maxProducts) * 100)),
        orders: plan.maxOrders >= 99999 ? 0 : Math.min(100, Math.round((monthOrders / plan.maxOrders) * 100)),
      };

  if (!plan) {
    // No plan yet — the family "بدون باقة" state with an upgrade nudge
    // (solid pastel copper chip — the canonical badge grammar). W7-G
    // (fix 6): squared stamp corner + the 1px family-ink border.
    return (
      <a
        href="/pricing"
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-sm border border-(--c-copper-ink)/35 bg-(--c-copper-bg) px-3 py-1 text-xs font-semibold text-(--c-copper-deep) transition-[color,background-color,transform] duration-(--t-fast) hover:-translate-y-px",
          className
        )}
      >
        <Sparkles className="size-3.5" aria-hidden="true" />
        اختر باقة لمتجرك
      </a>
    );
  }

  const isFree = plan.price === 0;
  /* W3-F (P21-W3-F truth): the limit FAQ promises «يمكنك الترقية من لوحة
   * التحكم في أي وقت» — the ترقية link used to render only on the Free
   * chip, so a PAID business at 80%+ of its cap (the warn bars) had no
   * dashboard path to /pricing. The link now rides every warn state too;
   * Free keeps it always. */
  const nearLimit =
    !!usage && (usage.products >= 80 || usage.orders >= 80);

  return (
    <div className={cn("flex flex-wrap items-center gap-2.5", className)}>
      <span
        className={cn(
          /* W7-G (fix 6): the plan chip rides the squared stamp grammar —
             rounded-sm + 1px family-ink border (copper or grey by plan). */
          "inline-flex items-center gap-1.5 rounded-sm border px-3 py-1 text-xs font-semibold",
          isFree
            ? "border-(--c-grey-ink)/35 bg-(--c-grey-bg) text-(--c-grey-deep)"
            : "border-(--c-copper-ink)/35 bg-(--c-copper-bg) text-(--c-copper-deep)"
        )}
      >
        <Sparkles className="size-3.5" aria-hidden="true" />
        باقة {plan.nameAr}
        {isFree && " — مجانية"}
      </span>
      {usage && usage.products > 0 && <UsageBar label="المنتجات" pct={usage.products} />}
      {usage && usage.orders > 0 && <UsageBar label="طلبات الشهر" pct={usage.orders} />}
      {(isFree || nearLimit) && (
        <a
          href="/pricing"
          className="text-xs font-medium text-accent-foreground underline-offset-4 transition-colors hover:underline"
        >
          ترقية
        </a>
      )}
    </div>
  );
}

function UsageBar({ label, pct }: { label: string; pct: number }) {
  const warn = pct >= 80;
  return (
    <span className="flex items-center gap-1.5" title={`${label}: ${pct}%`}>
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <span
          className={cn(
            "absolute inset-y-0 start-0 rounded-full transition-[width] duration-(--t-slower) ease-smooth",
            warn ? "bg-warning" : "bg-primary"
          )}
          style={{ width: `${pct}%` }}
        />
      </span>
    </span>
  );
}
