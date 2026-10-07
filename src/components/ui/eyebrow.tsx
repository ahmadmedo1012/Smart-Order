"use client";

import { cn } from "@/lib/utils";

/**
 * Eyebrow — family micro-label above section headings.
 * Accent-ink label with a pulsing dot indicator. NO letter-spacing:
 * every call site feeds Arabic children and tracking breaks Arabic
 * cursive joins (Madarek ruling #2) — the visual hierarchy carries
 * via weight + size instead (semibold at 11px).
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
        "inline-flex items-center gap-2 text-[11px] font-semibold uppercase text-accent-foreground/90 mb-5",
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
