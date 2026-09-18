"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/client";

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
  const [usage, setUsage] = React.useState<{ products: number; orders: number } | null>(null);

  React.useEffect(() => {
    if (!plan) return;
    setUsage({
      products: plan.maxProducts >= 9999 ? 0 : Math.min(100, Math.round((productCount / plan.maxProducts) * 100)),
      orders: plan.maxOrders >= 99999 ? 0 : Math.min(100, Math.round((monthOrders / plan.maxOrders) * 100)),
    });
  }, [plan, productCount, monthOrders]);

  if (!plan) {
    // No plan yet — the family "بدون خطة" state with an upgrade nudge
    return (
      <a
        href="/pricing"
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-accent-foreground/25 bg-accent-foreground/[0.06] px-3 py-1 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent-foreground/10",
          className
        )}
      >
        <Sparkles className="size-3.5" aria-hidden="true" />
        اختر خطة لمتجرك
      </a>
    );
  }

  const isFree = plan.price === 0;

  return (
    <div className={cn("flex flex-wrap items-center gap-2.5", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
          isFree
            ? "border border-border/50 bg-muted text-muted-foreground"
            : "border border-accent-foreground/25 bg-accent-foreground/[0.08] text-accent-foreground"
        )}
      >
        <Sparkles className="size-3.5" aria-hidden="true" />
        خطة {plan.nameAr}
        {isFree && " — مجانية"}
      </span>
      {usage && usage.products > 0 && <UsageBar label="المنتجات" pct={usage.products} />}
      {usage && usage.orders > 0 && <UsageBar label="طلبات الشهر" pct={usage.orders} />}
      {isFree && (
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
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <span
          className={cn(
            "absolute inset-y-0 start-0 rounded-full transition-[width] duration-500",
            warn ? "bg-warning" : "bg-primary"
          )}
          style={{ width: `${pct}%` }}
        />
      </span>
    </span>
  );
}
