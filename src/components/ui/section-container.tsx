"use client";

import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionContainerProps = React.ComponentProps<"section"> & {
  children: ReactNode;
  /** Visual separation tone: "default" (flat) or "alt" (subtle raised band) */
  tone?: "default" | "alt";
};

/**
 * SectionContainer — family page rhythm: py-16/24/28 vertical cadence,
 * 1220px content column, "alt" tone renders the sunken-surface band with
 * hairline borders top and bottom.
 */
export const SectionContainer = forwardRef<HTMLElement, SectionContainerProps>(
  function SectionContainer({ children, className, tone = "default", ...props }, ref) {
    return (
      <section
        ref={ref}
        className={cn(
          "relative scroll-mt-20 overflow-hidden py-16 transition-[background-color,border-color] duration-300 sm:py-24 lg:py-28",
          tone === "alt" && "border-y border-border/40 bg-surface-sunken/60",
          className,
        )}
        {...props}
      >
        <div className="relative mx-auto max-w-[1220px] px-4 sm:px-6">{children}</div>
      </section>
    );
  },
);
