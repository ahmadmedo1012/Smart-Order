"use client";

import { cn } from "@/lib/utils";

/**
 * FilterPills — canonical Madarek `.pill` filter family
 * (components.css:530-555, polish v15): surface + hairline pills,
 * 12px/600, hover = border-strong + surface-2 + −1px lift, `.on` =
 * ink slab (light: #191918 + cream) / gold (dark: metal + void ink)
 * + 4px accent/16% halo. One spelling for every filter/selector chip.
 */

export function pillClasses(on: boolean, className?: string) {
  return cn(
    /* r131 (F3): dropped the explicit ring — the ONE global
 :focus-visible outline contract (globals.css) already covers
 these; the ring was a double focus indicator. */
    "inline-flex items-center justify-center rounded-full border text-xs font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] duration-(--t-fast) ease-smooth active:scale-[0.97] active:duration-(--t-micro)",
    on
      ? "border-transparent bg-foreground text-background shadow-[0_0_0_4px_color-mix(in_srgb,var(--orange)_16%,transparent)] dark:bg-primary dark:text-primary-foreground"
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
