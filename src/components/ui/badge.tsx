import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/*
 * Smart ecosystem badge — STATUS STAMP (r152, Phase 5 Route & Node).
 * The family pill retired for this product: status speaks the SHIPPING
 * STAMP language — a squared chip (rounded-sm) with a 1px family-ink
 * border over the solid family ground + family deep ink. r130/r148
 * notes (11px/600 tabular, ladder --t-fast, solid pastel grounds) survive;
 * the stamp border + squared corners are the r152 identity. API/variant
 * keys unchanged — consumers keep compiling. `saffron` maps onto the
 * yellow family (same warm hue — the SM spelling).
 */
const badgeVariants = cva(
  "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-sm border px-2 py-0.5 text-[11px] font-semibold tabular-nums whitespace-nowrap transition-[color,background-color,border-color,box-shadow] duration-(--t-fast) focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-(--c-rose-ink)/35 bg-(--c-rose-bg) text-(--c-rose-deep) [a&]:hover:opacity-90",
        outline:
          "border-border text-foreground [a&]:hover:bg-muted [a&]:hover:text-muted-foreground",
        ghost: "border-transparent hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        gold: "border-(--c-copper-ink)/35 bg-(--c-copper-bg) text-(--c-copper-deep) [a&]:hover:opacity-90",
        success:
          "border-(--c-mint-ink)/35 bg-(--c-mint-bg) text-(--c-mint-deep) [a&]:hover:opacity-90",
        warning:
          "border-(--c-yellow-ink)/40 bg-(--c-yellow-bg) text-(--c-yellow-deep) [a&]:hover:opacity-90",
        info: "border-(--c-sky-ink)/35 bg-(--c-sky-bg) text-(--c-sky-deep) [a&]:hover:opacity-90",
        saffron:
          "border-(--c-yellow-ink)/40 bg-(--c-yellow-bg) text-(--c-yellow-deep) [a&]:hover:opacity-90",
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
