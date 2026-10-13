import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * FieldError — the canonical inline field-error (r131 F3, W1-I §4.5):
 * wired via aria-describedby on the input (which already carries the
 * aria-invalid destructive border + halo recipe from the r130 input
 * re-base). role=alert announces it immediately.
 *
 * Route & Node chrome (Phase 6): the error text now speaks the QUIET
 * STAMP geometry — squared corner (rounded-sm) + 1px rose-family-ink
 * border over the rose family ground + family deep ink (the badge
 * destructive stamp language), hugging its content (w-fit).
 */
export function FieldError({
  id,
  children,
  className,
}: {
  /** The id referenced by the control's aria-describedby. */
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      id={id}
      role="alert"
      className={cn(
        "w-fit rounded-sm border border-(--c-rose-ink)/35 bg-(--c-rose-bg) px-2 py-0.5 text-xs font-medium text-(--c-rose-deep)",
        className,
      )}
    >
      {children}
    </p>
  );
}
