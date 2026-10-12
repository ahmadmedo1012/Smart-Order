import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/*
 * Smart ecosystem badge — pill (rounded-full).
 * r130 (W2-1): type snapped to the canonical badge role — 11px/600
 * (W1-I §3.6: `.badge` 11px/600 tabular) and the transition duration
 * rides the ladder --t-fast (was a raw duration-200; W1-F P1-12).
 * r148 (19-AUDIT-CROSS R3): the status variants land the fleet's
 * solid-pastel ruling (r131-F4 "status=solid pastel" — SM badge.tsx
 * is the canonical recipe): OPAQUE family ground (`--c-*-bg`) +
 * family deep ink (`--c-*-deep`), borderless, px-2.5. The old /15
 * translucent washes + /25 borders rendered as ghost chips next to
 * the SM/SB solid twins. `saffron` maps onto the yellow family (same
 * warm hue, pastel tokens — the SM spelling), so existing variant
 * props keep compiling. Status chips (shared/status-badges.tsx)
 * already rode the solid families via className — now the variants
 * themselves speak the same language.
 */
const badgeVariants = cva(
  "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2.5 py-0.5 text-[11px] font-semibold tabular-nums whitespace-nowrap transition-[color,background-color,border-color,box-shadow] duration-(--t-fast) focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "bg-(--c-rose-bg) text-(--c-rose-deep) [a&]:hover:opacity-90",
        outline:
          "border-border text-foreground [a&]:hover:bg-muted [a&]:hover:text-muted-foreground",
        ghost: "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        gold: "bg-(--c-copper-bg) text-(--c-copper-deep) [a&]:hover:opacity-90",
        success:
          "bg-(--c-mint-bg) text-(--c-mint-deep) [a&]:hover:opacity-90",
        warning:
          "bg-(--c-yellow-bg) text-(--c-yellow-deep) [a&]:hover:opacity-90",
        info: "bg-(--c-sky-bg) text-(--c-sky-deep) [a&]:hover:opacity-90",
        saffron:
          "bg-(--c-yellow-bg) text-(--c-yellow-deep) [a&]:hover:opacity-90",
        muted: "border-border bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge }
