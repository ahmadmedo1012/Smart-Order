import type { ReactNode } from "react";

/**
 * PageHeader — the dashboard page crown (re-based on the Route & Node
 * chrome, Phase 6):
 *   · title: display face (Barlow Semi Condensed → Tajawal chain),
 *     clamp(28px, 3.6vw, 40px) / 700 / lh 1.2, zero Arabic tracking.
 *   · subtitle: 13px / lh 1.55 secondary, max-width 72ch.
 *   · meta (additive, optional): the operational counts/codes line —
 *     renders in IBM Plex Mono with tabular numerals (the dispatcher's
 *     code voice: «12 طلبًا هذا اليوم» reads its numeral as a code).
 *   · divider (additive, off by default): the quiet ROUTE DIVIDER under
 *     the header row — the globals.css `.route-divider-quiet` pattern
 *     (dashed hairline road + terminal node) that already separates
 *     storefront sections.
 *   · flex space-between wrap row with the trailing actions at the end.
 * RTL-first: logical flex only, no physical sides.
 */
export function PageHeader({
  title,
  subtitle,
  meta,
  divider = false,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Operational meta line (counts, codes) — mono face + tabular-nums. */
  meta?: ReactNode;
  /** Quiet route divider under the header row (dashed hairline + node). */
  divider?: boolean;
  /** Trailing toolbar (buttons, filters) pinned to the row's end. */
  actions?: ReactNode;
  /** Extra content under the title block (badges, live strips). */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={className}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1 basis-72">
          <h1 className="font-heading text-[clamp(1.75rem,3.6vw,2.5rem)] leading-[1.2] font-bold text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 max-w-[72ch] text-[13px] leading-[1.55] text-muted-foreground">{subtitle}</p>
          )}
          {meta && (
            <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">{meta}</p>
          )}
          {children}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {divider && <div aria-hidden="true" className="route-divider route-divider-quiet mt-4" />}
    </header>
  );
}

/** The title classes alone — detail pages that own their hero row
 * (order/customer detail) apply this to their existing h1. */
export const pageTitleClass =
  "font-heading text-[clamp(1.75rem,3.6vw,2.5rem)] leading-[1.2] font-bold text-foreground";
