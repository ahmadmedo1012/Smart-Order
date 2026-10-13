import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

/*
 * r150 (20-IDEAL-CTA completion, §8 of the r150 mission) — re-based on
 * the family 44/48/52 control canon (r149) + the canonical Madarek .btn
 * recipe (components.css:258-415; W1-I §3.1; W1-F P0-3):
 *   · height 44px default (h-11) — the r131 h-10 40px CTA rung is
 *     RETIRED (the last family-wide h-10 CTA debt, resolved in sync
 *     with Smart-Link's inner-page set) · label 13px / weight 600 ·
 *     radius 10px (rounded-md = --radius-md) · padding-inline 20px
 *     (px-5).
 *   · hover (filled CTAs) = translateY(-2px) + the NEUTRAL premium
 *     card shadow (hover:shadow-(--shadow-card-h), theme-aware) —
 *     no colored glow on any variant; the radial ::after glow layer
 *     is removed everywhere.
 *   · sheen sweep (::before, 105° gradient, --t-cinema) on the
 *     PRIMARY CTA family ONLY (default + flame — Madarek sheens
 *     .primary/.accent); quiet variants stay flat.
 *   · press = scale(0.97) @ --t-micro (80ms); disabled opacity .55.
 *   · sizes: sm 32px/h-8/12px (sanctioned dense-interface rung —
 *     never a primary CTA) · default 44px/h-11/13px · lg 48px/h-12
 *     · icon 40px square (utility rung; touch floor via hit
 *     patterns) · icon-sm 32px.
 *   · focus = the ONE global :focus-visible outline ring
 *     (globals.css, token-driven); the old double ring-offset
 *     indicator is gone (W1-F P2-11). r151 (FOCUS-FAMILY-SO1):
 *     that global rule lives in @layer base, so the bare
 *     outline-none utility (later cascade layer) silently killed
 *     the ring on every Button outside the .landing world (whose
 *     unlayered cream rule still wins) — measured live in
 *     r151-a0d: the nested auth button painted outline none while
 *     the neighbouring m.button ThemeToggle kept the ring. The
 *     focus-visible utilities below re-declare the SAME token
 *     contract (--state-focus-ring-*, with the global fallbacks)
 *     so the primitive carries its own ring regardless of layer
 *     order; unfocused state is untouched (outline stays none)
 *     and the documented ring colors ride the tokens (dark accent
 *     gold / light accent-strong copper, globals.css), never
 *     currentColor.
 * API unchanged (same variant/size keys) so page consumers don't
 * break; Pure-CSS effects keep it Server-Component-safe.
 */
const buttonVariants = cva(
  "group/btn relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-md border border-transparent font-sans text-[13px] font-semibold whitespace-nowrap select-none outline-none focus-visible:outline-solid focus-visible:outline-[length:var(--state-focus-ring-width,2px)] focus-visible:outline-[color:var(--state-focus-ring-color,var(--ring))] focus-visible:outline-offset-[length:var(--state-focus-ring-offset,2px)] transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-(--t-fast) ease-smooth isolate active:scale-[0.97] active:duration-(--t-micro) disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-[0.55] aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&>*]:relative",
  {
    variants: {
      variant: {
        default:
          /* r152: the delivery-orange press register — the
             --accent-pressed step (deep daylight / luminous night)
             joins the canonical scale+micro-tier press. */
          "bg-orange text-orange-foreground shadow-sm hover:-translate-y-[2px] hover:shadow-(--shadow-card-h) active:bg-(--accent-pressed) before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[linear-gradient(105deg,transparent_30%,oklch(1_0_0/0.18)_50%,transparent_70%)] before:-translate-x-full before:transition-transform before:duration-(--t-cinema) before:ease-out hover:before:translate-x-full",
        flame:
          /* r133 (A10 §2): hover:brightness-110 retired — the reference
             flame-equivalents lift + neutral shadow, never a filter
             (lift + shadow already on the class; zero brightness hovers
             exist anywhere in madarek). */
          "bg-[linear-gradient(135deg,var(--c-ember),var(--c-saffron)_50%,var(--c-ember))] text-espresso shadow-sm hover:-translate-y-[2px] hover:shadow-(--shadow-card-h) before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[linear-gradient(105deg,transparent_30%,oklch(1_0_0/0.22)_50%,transparent_70%)] before:-translate-x-full before:transition-transform before:duration-(--t-cinema) before:ease-out hover:before:translate-x-full",
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
        /* r150 (§8): default = the family 44px CTA rung (h-11) — the
           r131 h-10 40px rung retired in sync with Smart-Link's
           inner-page canon (SL parity C3 pins the same contract). */
        default: "h-11 px-5",
        /* r134 (W2 #19): lg = the canon 48px rung (madarek
           components.css .btn.lg block-size 48px; Smart-Menu button.tsx
           h-12) — was h-11 (44px), caught by the sibling canon-check. */
        lg: "h-12 gap-2.5 px-6 text-sm",
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
