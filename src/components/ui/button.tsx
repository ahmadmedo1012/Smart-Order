import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

/*
 * r130 (W2-1, fix 3) — re-based on the canonical Madarek .btn recipe
 * (components.css:258-415; W1-I §3.1; W1-F P0-3):
 *   · height 40px default (h-10) · label 13px / weight 600 · radius
 *     10px (rounded-md = --radius-md) · padding-inline 20px (px-5).
 *   · hover (filled CTAs) = translateY(-2px) + the NEUTRAL premium
 *     card shadow (hover:shadow-(--shadow-card-h), theme-aware) —
 *     no colored glow on any variant; the radial ::after glow layer
 *     is removed everywhere.
 *   · sheen sweep (::before, 105° gradient, --t-cinema) on the
 *     PRIMARY CTA family ONLY (default + flame — Madarek sheens
 *     .primary/.accent); quiet variants stay flat.
 *   · press = scale(0.97) @ --t-micro (80ms); disabled opacity .55.
 *   · sizes: sm 32px/h-8/12px · default 40px/h-10/13px ·
 *     lg 44px/h-11/14px · icon 40px · icon-sm 32px.
 *   · focus = the ONE global :focus-visible outline ring
 *     (globals.css, token-driven); the old double ring-offset
 *     indicator is gone (W1-F P2-11).
 * API unchanged (same variant/size keys) so page consumers don't
 * break; Pure-CSS effects keep it Server-Component-safe.
 */
const buttonVariants = cva(
  "group/btn relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-md border border-transparent font-sans text-[13px] font-semibold whitespace-nowrap select-none outline-none transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-(--t-fast) ease-smooth isolate active:scale-[0.97] active:duration-(--t-micro) disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-[0.55] aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&>*]:relative",
  {
    variants: {
      variant: {
        default:
          "bg-orange text-orange-foreground shadow-sm hover:-translate-y-[2px] hover:shadow-(--shadow-card-h) before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[linear-gradient(105deg,transparent_30%,oklch(1_0_0/0.22)_50%,transparent_70%)] before:-translate-x-full before:transition-transform before:duration-(--t-cinema) before:ease-out hover:before:translate-x-full",
        flame:
          "bg-[linear-gradient(135deg,var(--c-ember),var(--c-saffron)_50%,var(--c-ember))] text-espresso shadow-sm hover:-translate-y-[2px] hover:brightness-110 hover:shadow-(--shadow-card-h) before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[linear-gradient(105deg,transparent_30%,oklch(1_0_0/0.22)_50%,transparent_70%)] before:-translate-x-full before:transition-transform before:duration-(--t-cinema) before:ease-out hover:before:translate-x-full",
        outline:
          "border-border/70 bg-transparent text-foreground hover:border-foreground/25 hover:bg-foreground/5 dark:hover:bg-foreground/10",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-foreground/10 hover:text-foreground dark:hover:bg-foreground/15",
        destructive:
          "bg-destructive/10 text-destructive-ink hover:bg-destructive/20 dark:bg-destructive/15 dark:hover:bg-destructive/25",
        whatsapp:
          "bg-whatsapp text-(--whatsapp-foreground) shadow-sm hover:-translate-y-[2px] hover:shadow-(--shadow-card-h)",
        link:
          "bg-transparent text-accent-foreground underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        sm: "h-8 gap-1.5 px-3 text-xs",
        default: "h-10 px-5",
        lg: "h-11 gap-2.5 px-6 text-sm",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      aria-busy={loading || undefined}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin size-4" aria-hidden="true" />
          <span className="sr-only">جارٍ التحميل…</span>
        </>
      ) : (
        children
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
