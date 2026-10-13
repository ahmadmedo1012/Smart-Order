"use client";

import { cn } from "@/lib/utils";

/**
 * UnderlineTabs — the list-filter strip (status filters), re-based on
 * the Route & Node stamp grammar (Phase 6):
 *   · container: hairline-bottom road (border-b) with the filter
 *     stamps sitting above it;
 *   · ACTIVE tab = the SHIPPING STAMP (badge.tsx / status-badges.tsx
 *     language): squared corner (rounded-sm) + 1px copper-family-ink
 *     border over the solid family ground + family deep ink — the
 *     generic scaling underline indicator is RETIRED (the r131
 *     underline served the Madarek tab idiom; the stamp is the r152+
 *     identity). Idle tabs stay transparent text with a quiet hover.
 *
 * r131 (F3) semantics live on: these drive LIST FILTERS with no
 * tabpanel, so role=group + aria-pressed buttons (a tablist promises a
 * controlled panel). The redundant per-tab focus ring stays dropped
 * (the ONE global :focus-visible outline contract, globals.css).
 */
export function UnderlineTabs({
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
      className={cn(
        "flex items-stretch gap-2 overflow-x-auto scrollbar-none border-b border-border",
        className,
      )}
    >
      {items.map((it) => {
        const on = it.value === value;
        return (
          <button
            key={it.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(it.value)}
            className={cn(
              "shrink-0 rounded-sm border px-4 py-3 text-[13px] font-semibold whitespace-nowrap transition-[color,background-color,border-color] duration-(--t-fast) ease-smooth",
              on
                ? "border-(--c-copper-ink)/35 bg-(--c-copper-bg) text-(--c-copper-deep)"
                : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
