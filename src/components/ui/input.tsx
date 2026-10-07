import * as React from "react"

import { cn } from "@/lib/utils"

/*
 * Smart ecosystem input — h-12 (48px touch target), rounded-lg (12px),
 * gold/copper focus ring with a token-based soft halo (Madarek
 * --state-input-focus-halo recipe: color-mix on the accent, no raw
 * color literals). Logical padding keeps RTL/LTR safe.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      dir="auto"
      className={cn(
        "file:text-foreground placeholder:text-placeholder-text selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-12 w-full min-w-0 rounded-lg border bg-transparent px-4 py-3 text-base shadow-xs transition-[color,box-shadow,border-color] duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-orange focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_22%,transparent)]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
