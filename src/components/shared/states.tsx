import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { TriangleAlert, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Canonical state family (Madarek components.css:1314-1342 / §3.13):
 * centered column, 56px r-xl icon tile (grey family for empty, rose
 * family for error), title 18px/600, description 13px max 42ch, and an
 * always-actionable CTA — empty states must offer the next step.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-12 text-center", className)}>
      <span
        className="flex size-14 items-center justify-center rounded-xl bg-(--c-grey-bg) text-(--c-grey-deep)"
        aria-hidden="true"
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <p className="mt-1 text-lg font-semibold text-foreground">{title}</p>
      {description && (
        <p className="max-w-[42ch] text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "حدث خطأ",
  description = "تعذر تحميل البيانات. تحقق من اتصالك وحاول مرة أخرى.",
  retry,
  className,
}: {
  title?: string;
  description?: string;
  retry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-12 text-center", className)}>
      <span
        className="flex size-14 items-center justify-center rounded-xl bg-destructive-soft text-destructive-ink"
        aria-hidden="true"
      >
        <TriangleAlert className="size-4" aria-hidden="true" />
      </span>
      <p className="mt-1 text-lg font-semibold text-foreground">{title}</p>
      <p className="max-w-[42ch] text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      {retry && (
        <Button variant="outline" size="sm" className="mt-3" onClick={retry}>
          <RotateCcw className="size-3.5" aria-hidden="true" />
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
}
