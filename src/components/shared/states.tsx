import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { TriangleAlert } from "lucide-react";

/**
 * EmptyState — family pattern: flame-tinted icon ring (orange/20 border,
 * orange/8 wash), centered Arabic copy, optional CTA. RTL-first by
 * construction (centered text, no physical margins).
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
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-4 py-12 text-center", className)}>
      <span
        className="flex size-16 items-center justify-center rounded-2xl border border-orange/20 bg-orange/8 text-orange shadow-sm"
        aria-hidden="true"
      >
        <Icon className="size-7" />
      </span>
      <p className="mt-1 text-sm font-bold text-foreground">{title}</p>
      {description && (
        <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">{description}</p>
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
    <div className={cn("flex flex-col items-center justify-center gap-2 px-4 py-12 text-center", className)}>
      <span
        className="flex size-16 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive shadow-sm"
        aria-hidden="true"
      >
        <TriangleAlert className="size-7" aria-hidden="true" />
      </span>
      <p className="mt-1 text-sm font-bold text-foreground">{title}</p>
      <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">{description}</p>
      {retry && (
        <button
          onClick={retry}
          className="mt-3 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-orange/40 hover:bg-foreground/5"
        >
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}
