"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/*
 * r131 (F1 re-base) — canonical Madarek .sheet-panel recipe
 * (madarek components.css:1521-1628; A5 P1-4 · A6 P2-4 · A12 #6/#11):
 *   · LOGICAL placement — sides dock to inline-start/inline-end edges
 *     (`start-0`/`end-0`), never physical left/right docking or border
 *     utilities.
 *     Canonical API values are `side="start" | "end" | "top" | "bottom"`.
 *     The legacy physical values stay accepted and are aliased to the
 *     edge they have always occupied in this RTL-first app — "left" →
 *     inline-END (physical left under dir=rtl), "right" → inline-START
 *     (physical right) — so both existing call sites (storefront cart
 *     drawer side="left", dashboard nav side="right") render on their
 *     pre-r131 edge while the implementation is 100% logical.
 *   · width min(420px, 90vw); r-2xl (20px) on the LEADING corners
 *     (madarek .sheet-panel-end rounds its inline-start corners); full
 *     1px hairline border like the modal family.
 *   · scrim = var(--overlay) + 4px backdrop blur (the modal scrim
 *     recipe, ui/dialog r130; was blur-md/12px).
 *   · 240ms (--t-base) BOTH directions (open was --t-slow/380ms).
 *   · close rides `end-4` (inset-inline-end — the free-edge corner,
 *     never the title corner) and the ONE global :focus-visible outline
 *     (the legacy ring-2/ring-offset double indicator is gone).
 *   · grabber handle (madarek .sheet-grabber, 40×4) on the leading
 *     edge — a real dismiss affordance (Radix Close), opt-out with
 *     showGrabber={false}.
 */

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-(--z-sheet) bg-[var(--overlay)] backdrop-blur-[4px] duration-(--t-base) ease-smooth",
        className
      )}
      {...props}
    />
  )
}

type SheetSide = "start" | "end" | "top" | "bottom" | "left" | "right"

/* Leading-edge grabber — 40×4 pill (madarek .sheet-grabber geometry),
 * vertical on side sheets, horizontal on the vertical axes. Rendered as
 * a Radix Close so the affordance is honest (tap = dismiss). */
function SheetGrabber({ side }: { side: "start" | "end" | "top" | "bottom" }) {
  return (
    <SheetPrimitive.Close
      data-slot="sheet-grabber"
      aria-label="إغلاق"
      className={cn(
        "group/grabber absolute z-[2] flex cursor-pointer items-center justify-center transition-colors duration-(--t-fast) ease-smooth",
        side === "end" && "start-0 top-1/2 h-14 w-5 -translate-y-1/2",
        side === "start" && "end-0 top-1/2 h-14 w-5 -translate-y-1/2",
        side === "bottom" && "top-1 left-1/2 h-5 w-14 -translate-x-1/2",
        side === "top" && "bottom-1 left-1/2 h-5 w-14 -translate-x-1/2"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "rounded-full bg-foreground/20 transition-colors duration-(--t-fast) ease-smooth group-hover/grabber:bg-foreground/35",
          (side === "end" || side === "start") && "h-10 w-1",
          (side === "bottom" || side === "top") && "h-1 w-10"
        )}
      />
    </SheetPrimitive.Close>
  )
}

function SheetContent({
  className,
  children,
  side = "end",
  showGrabber = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: SheetSide
  showGrabber?: boolean
}) {
  /* Legacy physical aliases (see the header comment): this app pins
   * dir="rtl" at the root, where physical LEFT ≡ inline-end and
   * physical RIGHT ≡ inline-start. */
  const logical: "start" | "end" | "top" | "bottom" =
    side === "left" ? "end" : side === "right" ? "start" : side

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "bg-card text-card-foreground data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-(--z-sheet) flex flex-col gap-4 border shadow-(--shadow-modal) transition ease-smooth duration-(--t-base) data-[state=closed]:duration-(--t-base) data-[state=open]:duration-(--t-base)",
          logical === "start" &&
            "inset-y-0 start-0 h-full w-[min(420px,90vw)] rounded-e-2xl ltr:data-[state=open]:slide-in-from-left rtl:data-[state=open]:slide-in-from-right ltr:data-[state=closed]:slide-out-to-left rtl:data-[state=closed]:slide-out-to-right",
          logical === "end" &&
            "inset-y-0 end-0 h-full w-[min(420px,90vw)] rounded-s-2xl ltr:data-[state=open]:slide-in-from-right rtl:data-[state=open]:slide-in-from-left ltr:data-[state=closed]:slide-out-to-right rtl:data-[state=closed]:slide-out-to-left",
          logical === "top" &&
            "inset-x-0 top-0 h-auto max-h-[min(85dvh,720px)] rounded-b-2xl data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
          logical === "bottom" &&
            "safe-bottom inset-x-0 bottom-0 h-auto max-h-[min(85dvh,720px)] w-full rounded-t-2xl sm:mx-auto sm:max-w-[640px] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          className
        )}
        {...props}
      >
        {showGrabber && <SheetGrabber side={logical} />}
        {children}
        <SheetPrimitive.Close
          data-slot="sheet-close"
          /* r133 (A10): 44px close hit floor — was p-1 + size-4 ≈24px
             (madarek components.css:3188 is the reference). */
          className="absolute top-3.5 end-3.5 z-[2] flex size-11 items-center justify-center rounded-xs opacity-70 transition-opacity duration-(--t-fast) ease-smooth hover:opacity-100 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
        >
          <XIcon />
          <span className="sr-only">إغلاق</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetDescription,
}
