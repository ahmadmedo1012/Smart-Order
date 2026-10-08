"use client";

import { cn } from "@/lib/utils";

/**
 * UnderlineTabs — canonical Madarek `.tabs > .tab`
 * (components.css:556-604, polish v15): hairline-bottom container,
 * transparent 13px/600 tabs, 2px underline indicator (ink light / gold
 * dark) scaling in with the base-ladder settle, 0.45 hover preview.
 *
 * r131 (F3): filter-vs-tabs semantics — these drive LIST FILTERS with
 * no tabpanel, so role=tablist/tab + aria-selected was the wrong ARIA
 * (a tablist promises a controlled panel). Adopted the Smart-Menu
 * CategoryTabs ruling: role=group + aria-pressed buttons. Also dropped
 * the redundant focus ring (double indicator with the ONE global
 * :focus-visible outline contract, globals.css).
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
        "flex items-stretch overflow-x-auto scrollbar-none border-b border-border",
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
              "group/tab relative shrink-0 px-4 py-3 text-[13px] font-semibold whitespace-nowrap transition-colors duration-(--t-fast) rounded-t-xs",
              on
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {it.label}
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-x-2 -bottom-px h-0.5 rounded-[2px_2px_0_0] bg-foreground transition-transform opacity-40 duration-(--t-base) ease-smooth dark:bg-primary",
                on
                  ? "scale-x-100 opacity-100"
                  : "scale-x-0 group-hover/tab:scale-x-[0.45]",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
