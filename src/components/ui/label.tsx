"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"

import { cn } from "@/lib/utils"

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        /* r130 (W2-1, fix 6): canonical label role — 13px (--fs-sm)
           / 500 / line-height 1.5 (W1-I §1.2); the old leading-none
           clipped Arabic diacritics. */
        "flex items-center gap-2 text-[13px] leading-normal font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }
