"use client";

import { cn } from "@/lib/utils";

/**
 * Eyebrow — family micro-label above section headings.
 * Uppercase tracked label in bright flame with a pulsing dot indicator.
 * Naskh face is reserved for editorial/quote surfaces via .font-naskh;
 * the eyebrow stays on the UI sans for scanability.
 */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-accent-foreground/90 mb-5",
        className,
      )}
    >
      {/* Animated pulsing dot — subtle premium indicator (family spec §3) */}
      <span
        className="inline-block size-1 shrink-0 animate-pulse-dot rounded-full bg-primary"
        aria-hidden="true"
      />
      {children}
    </span>
  );
}
