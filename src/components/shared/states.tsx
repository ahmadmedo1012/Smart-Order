import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { TriangleAlert, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Canonical state family + the ROUTE & NODE motif (r152, Phase 5):
 * an empty state is a STATION on the route — the dashed road passes
 * through it with a node on each side, the icon tile sits at the
 * station. Title 18px/600, description 13px max 42ch, and an
 * always-actionable CTA — empty states must offer the next step.
 * The road uses primary at 45% (traveled) for empty, destructive for
 * errors (the blocked route).
 */
function RouteStationRoad({ tone }: { tone: "route" | "blocked" }) {
  const line = tone === "route" ? "border-primary/45" : "border-destructive/45";
  const node = tone === "route" ? "border-primary/55" : "border-destructive/55";
  return (
    <div className="flex w-full max-w-[260px] items-center gap-2" aria-hidden="true">
      <span className={cn("size-2.5 shrink-0 rounded-full border-2 bg-card", node)} />
      <span className={cn("h-0 flex-1 border-t-2 border-dashed", line)} />
      <span className={cn("size-2.5 shrink-0 rounded-full border-2 bg-card", node)} />
    </div>
  );
}

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
      <RouteStationRoad tone="route" />
      <span
        className="flex size-14 items-center justify-center rounded-xl bg-(--c-grey-bg) text-(--c-grey-deep)"
        aria-hidden="true"
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <RouteStationRoad tone="route" />
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
  description = "تعذّر تحميل البيانات. تحقق من اتصالك وحاول مرة أخرى.",
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
      <RouteStationRoad tone="blocked" />
      <span
        className="flex size-14 items-center justify-center rounded-xl bg-destructive-soft text-destructive-ink"
        aria-hidden="true"
      >
        <TriangleAlert className="size-4" aria-hidden="true" />
      </span>
      <RouteStationRoad tone="blocked" />
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
