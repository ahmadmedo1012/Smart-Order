"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/*
 * r130 (W2-1, fix 2 + W1-F P1-8) — re-based on the canonical Madarek
 * .modal-overlay/.modal-card recipe (components.css:1471-1516):
 *   · RTL: DialogHeader aligns `text-start` (logical) — the stock
 *     shadcn header anchored Arabic titles to the physical LEFT edge
 *     on ≥sm; the close button rides `end-4` (inset-inline-end).
 *   · Card: surface ground (bg-card — dark #0D1428 / light #FFFFFF,
 *     never the page ground), r-xl 16px (rounded-xl), width cap
 *     min(560px,100%), --shadow-modal, and the signature 3px accent
 *     top-sheen ::before (inset-inline 30%).
 *   · Scrim: 4px blur (--scrim-blur; was blur-md/12px — Madarek keeps
 *     dimming scrims light).
 */

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-(--z-modal) bg-[var(--overlay)] backdrop-blur-[4px] duration-(--t-base) ease-smooth",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "bg-card text-card-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:slide-out-to-bottom-1 fixed top-[50%] left-[50%] z-(--z-modal) grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl border p-6 shadow-(--shadow-modal) duration-(--t-base) ease-smooth data-[state=closed]:duration-(--t-fast) sm:max-w-[560px] before:pointer-events-none before:absolute before:top-0 before:inset-x-[30%] before:z-[1] before:h-[3px] before:rounded-b-[3px] before:bg-[linear-gradient(90deg,transparent,var(--primary),transparent)]",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            /* r133 (A10): 44px close hit floor (madarek components.css:3188)
               — was a bare size-4 icon ≈24px; legacy ring utilities retired
               for the ONE global :focus-visible outline. */
            className="absolute top-3.5 end-3.5 flex size-11 items-center justify-center rounded-xs opacity-70 transition-opacity duration-(--t-fast) ease-smooth hover:opacity-100 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            {/* r131-F1b (A11 SO-7): Arabic screen-reader label — the kit
                ships to an all-Arabic app; "Close" was the lone English
                string in the chrome. */}
            <span className="sr-only">إغلاق</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-start", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
}
