import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * PageHeader — canonical Madarek `.page-header` / `.page-title`
 * (base.css:243-266, polish.css:707-716):
 *   · title: display face, clamp(28px, 3.6vw, 40px) / 700 / lh 1.2,
 *     letter-spacing 0 (zero-tracking Arabic rule).
 *   · subtitle: 13px / lh 1.55 secondary, max-width 72ch.
 *   · flex space-between wrap row with the trailing actions at the end.
 * RTL-first: logical flex only, no physical sides.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Trailing toolbar (buttons, filters) pinned to the row's end. */
  actions?: ReactNode;
  /** Extra content under the title block (badges, live strips). */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-3", className)}>
      <div className="min-w-0 flex-1 basis-72">
        <h1 className="font-heading text-[clamp(1.75rem,3.6vw,2.5rem)] leading-[1.2] font-bold text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 max-w-[72ch] text-[13px] leading-[1.55] text-muted-foreground">{subtitle}</p>
        )}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** The title classes alone — detail pages that own their hero row
 * (order/customer detail) apply this to their existing h1. */
export const pageTitleClass =
  "font-heading text-[clamp(1.75rem,3.6vw,2.5rem)] leading-[1.2] font-bold text-foreground";
