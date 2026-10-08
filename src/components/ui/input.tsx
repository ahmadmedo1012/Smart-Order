import * as React from "react"

import { cn } from "@/lib/utils"

/*
 * r130 (W2-1, fix 4) — unified on the canonical Madarek input recipe
 * (components.css:690-752; W1-I §3.2; W1-F P0-4):
 *   · height 44px (h-11) · radius 10px (rounded-md = --radius-md) ·
 *     padding-inline 16px · 1px border · no shadow.
 *   · font-size 16px at EVERY breakpoint (the iOS zoom floor — the
 *     old `md:text-sm` dropped desktop to 14px and still zoomed
 *     iOS keyboards on responsive pages).
 *   · focus = accent border + the ONE sanctioned 3px halo at 22% of
 *     the SOLID accent (--state-input-focus-halo → --primary: gold
 *     #E9B44C dark / copper #B57438 light — never #C9962F); the old
 *     ring-2/ring-ring/20 double indicator is gone (W1-F P2-11).
 *   · error (aria-invalid) = destructive border + 3px destructive halo.
 *   · disabled = opacity .6 (canonical --state-input-disabled-opacity).
 * Textarea + select-trigger ride the same recipe (see those files).
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      dir="auto"
      className={cn(
        "border-input placeholder:text-placeholder-text selection:bg-primary selection:text-primary-foreground file:text-foreground flex h-11 w-full min-w-0 rounded-md border bg-transparent px-4 text-base transition-[color,box-shadow,border-color] duration-(--t-fast) outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60",
        "focus-visible:border-primary focus-visible:shadow-(--state-input-focus-halo)",
        "aria-invalid:border-destructive aria-invalid:shadow-(--state-input-error-halo)",
        className
      )}
      {...props}
    />
  )
}

export { Input }
