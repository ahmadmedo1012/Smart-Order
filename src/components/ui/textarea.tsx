import * as React from "react"

import { cn } from "@/lib/utils"

/*
 * r130 (W2-1, fix 4) — rides the same canonical input recipe as
 * Input (44px family): radius 10 (rounded-md), 16px font floor,
 * min-height 96px, block padding 12px, line-height 1.65, focus =
 * accent border + the 3px halo (--state-input-focus-halo), error =
 * destructive border + halo. Logical padding only.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-placeholder-text flex field-sizing-content min-h-24 w-full rounded-md border bg-transparent px-4 py-3 text-base leading-[1.65] transition-[color,box-shadow,border-color] duration-(--t-fast) outline-none disabled:cursor-not-allowed disabled:opacity-60",
        /* r133 (A10): hover border state (madarek components.css:721). */
        "hover:not-aria-invalid:border-foreground/25",
        "focus-visible:border-primary focus-visible:shadow-(--state-input-focus-halo)",
        "aria-invalid:border-destructive aria-invalid:shadow-(--state-input-error-halo)",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
