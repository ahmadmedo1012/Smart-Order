import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

/*
 * Smart ecosystem premium button — family language from Smart Menu/SmartBot:
 * h-12 default (48px touch target), font-bold, rounded-lg (18px token),
 * flame-orange default with soft glow + shine sweep hover + scale-press.
 * Signature "flame" variant: ember→saffron→ember gradient with espresso text.
 * Pure-CSS effects (no JS handlers) so it stays Server-Component-safe.
 */
const buttonVariants = cva(
  "group/btn relative inline-flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-transparent font-sans text-sm font-bold whitespace-nowrap outline-none select-none transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.2,1)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 isolate before:pointer-events-none before:absolute before:inset-0 before:-translate-x-full before:rounded-[inherit] before:bg-[linear-gradient(105deg,transparent_30%,oklch(1_0_0/0.22)_50%,transparent_70%)] before:transition-transform before:duration-700 before:ease-out hover:before:translate-x-full after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_50%,oklch(1_0_0/0.16),transparent_45%)] after:opacity-0 after:transition-opacity after:duration-500 hover:after:opacity-100 [&>*]:relative",
  {
    variants: {
      variant: {
        default:
          "bg-orange text-orange-foreground shadow-md shadow-orange/25 hover:bg-orange/95 hover:shadow-xl hover:shadow-orange/40",
        flame:
          "bg-[linear-gradient(135deg,var(--c-ember),var(--c-saffron)_50%,var(--c-ember))] text-espresso shadow-md shadow-orange/30 hover:brightness-110 hover:shadow-2xl hover:shadow-orange/45",
        outline:
          "border-border/70 bg-transparent text-foreground hover:border-orange/40 hover:bg-foreground/5 hover:shadow-sm dark:hover:bg-foreground/10 dark:hover:border-orange/35",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-foreground/10 hover:text-foreground dark:hover:bg-foreground/15",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 dark:bg-destructive/15 dark:hover:bg-destructive/25",
        whatsapp:
          "bg-whatsapp text-[#07361d] shadow-md shadow-whatsapp/25 hover:bg-whatsapp-deep hover:shadow-lg hover:shadow-whatsapp/40",
        link:
          "bg-transparent text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        sm: "h-10 gap-1.5 px-3.5 text-xs",
        default: "h-12 gap-2 px-5 text-sm",
        lg: "h-14 gap-2.5 px-7 text-sm sm:text-base",
        icon: "size-12",
        "icon-sm": "size-10",
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
