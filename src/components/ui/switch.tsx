"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

/*
 * r131 (F1 — A12 #1 · A5 P2-4):
 *   · RTL thumb mirror: the checked travel now carries the rtl: twin
 *     (`data-[state=checked]:rtl:-translate-x-[calc(100%-2px)]`, the
 *     smart-menu/smart-bot fleet pattern) — under dir=rtl the thumb
 *     starts at the inline-start edge, so the physical +translate-x
 *     pushed it OFF the track on check (live in the product editor).
 *   · ≥44px hit target via the smart-menu pseudo-hit pattern: the
 *     painted track stays 18.4×32 (zero layout shift for existing
 *     rows); an invisible ::after box (−6px inline / −12.8px block per
 *     side) extends the pointer target to exactly 44×44.
 */
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 relative inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none after:absolute after:-inset-x-1.5 after:-inset-y-3.2 after:content-[''] focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=checked]:rtl:-translate-x-[calc(100%-2px)]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
