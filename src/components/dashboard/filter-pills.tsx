"use client";

import { cn } from "@/lib/utils";

/**
 * FilterPills — the canonical filter pill family, re-based on the
 * Route & Node stamp grammar (Phase 6): idle pills stay ROUND (the
 * unfranked coin), the `.on` pill is FRANKED — it squares its corners
 * (rounded-sm) and carries the 1px copper-family-ink border over the
 * solid family ground + family deep ink (badge.tsx / status-badges.tsx
 * shipping-stamp language) + the 4px accent/16% halo. One spelling for
 * every filter/selector chip.
 */

export function pillClasses(on: boolean, className?: string) {
  return cn(
    /* r131 (F3): dropped the explicit ring — the ONE global
 :focus-visible outline contract (globals.css) already covers
 these; the ring was a double focus indicator. */
    "inline-flex items-center justify-center rounded-full border text-xs font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] duration-(--t-fast) ease-smooth active:scale-[0.97] active:duration-(--t-micro)",
    on
      ? "rounded-sm border-(--c-copper-ink)/35 bg-(--c-copper-bg) text-(--c-copper-deep) shadow-[0_0_0_4px_color-mix(in_srgb,var(--orange)_16%,transparent)]"
      : "border-border bg-card text-muted-foreground hover:-translate-y-px hover:border-foreground/25 hover:bg-muted hover:text-foreground",
    className,
  );
}

export function FilterPills({
  value,
  onChange,
  items,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  items: Array<{ value: string; label: string }>;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          aria-pressed={it.value === value}
          onClick={() => onChange(it.value)}
          className={cn(pillClasses(it.value === value), "h-8 px-3.5")}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
