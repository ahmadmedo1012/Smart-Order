"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "./scroll-reveal";
import { Eyebrow } from "./eyebrow";

type SectionHeaderProps = {
  eyebrow?: ReactNode;
  title?: string;
  subtitle?: ReactNode;
  className?: string;
  icon?: ReactNode;
  align?: "center" | "start";
};

/**
 * SectionHeader — family section rhythm: eyebrow (pulse dot) → title →
 * subtitle → gradient divider. Children stagger 80ms; reveals are
 * SSR-visible (see scroll-reveal) and run once on view.
 */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  className,
  icon,
  align = "center",
}: SectionHeaderProps) {
  const centered = align === "center";
  return (
    <div className={cn("mb-14 sm:mb-20", centered ? "text-center" : "text-start", className)}>
      {eyebrow && (
        <Reveal as="div" y={8} duration={0.4}>
          <Eyebrow className={centered ? "justify-center" : "justify-start"}>
            {icon}
            {icon && " "}
            {eyebrow}
          </Eyebrow>
        </Reveal>
      )}
      {title && (
        <Reveal as="h2" y={16} delay={80}>
          <span
            className={cn(
              "text-3xl font-semibold leading-[1.25] tracking-tight text-balance sm:text-4xl lg:text-[3.25rem]",
              centered ? "mx-auto block" : "max-w-2xl",
            )}
          >
            {title}
          </span>
        </Reveal>
      )}
      {subtitle && (
        <Reveal as="p" y={8} delay={160}>
          <span
            className={cn(
              "mt-4 block max-w-[48ch] text-base leading-relaxed text-muted-foreground/90",
              centered ? "mx-auto" : "",
            )}
          >
            {subtitle}
          </span>
        </Reveal>
      )}
      {/* Gradient divider after the section head (family spec §4) */}
      {title && (
        <Reveal y={8} delay={240} className="aria-hidden" aria-hidden="true">
          <div className="mx-auto mt-6 h-[2px] w-16 rounded-full bg-gradient-to-r from-accent-foreground/0 via-accent-foreground to-accent-foreground/0" />
        </Reveal>
      )}
    </div>
  );
}
