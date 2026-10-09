import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * FieldError — the canonical inline field-error text (r131 F3,
 * W1-I §4.5): 12px/500 danger ink directly under the control,
 * wired via aria-describedby on the input (which already carries
 * the aria-invalid destructive border + halo recipe from the
 * r130 input re-base). role=alert announces it immediately.
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
      className={cn("text-xs font-medium text-destructive-ink", className)}
    >
      {children}
    </p>
  );
}
