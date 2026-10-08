import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Route + in-page loading skeletons (r131 F3, A5 P2-7 / A11 SO-2 —
 * shape-matched, not generic bars; Smart-Menu DashboardSkeletons
 * pattern): every surface mirrors the real page anatomy it stands in
 * for — PageHeader bar + KPI grid / toolbar + table shell / card
 * lists — with status semantics (role=status + aria-busy + sr-only
 * label) so screen readers announce the wait. The `.skeleton` class
 * rides the 1200ms linear sweep and goes static under RM.
 */

/** Page-level wrapper: status semantics (SM SkeletonPage pattern). */
function SkeletonPage({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn("space-y-5 animate-fade-in", className)}
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** PageHeader bar — clamp title rung + subtitle line + trailing action. */
export function HeaderSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4" aria-hidden="true">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-8 w-44 max-w-[60%]" />
        <Skeleton className="h-3.5 w-72 max-w-full" />
      </div>
      {action && <Skeleton className="h-10 w-28 rounded-md" />}
    </div>
  );
}

/** KPI strip — 4 MetricCard shapes (min-132px, 44px icon well). */
export function KpiGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-5 grid-cols-2 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex min-h-[132px] flex-col justify-between rounded-xl border border-border/80 bg-card p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-[30px] w-24" />
            </div>
            <Skeleton className="size-11 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Filter row — search well + two select triggers (orders toolbar). */
export function ToolbarSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <Skeleton className="h-10 w-full max-w-md rounded-md" />
      <div className="flex gap-2 flex-wrap">
        <Skeleton className="h-11 flex-1 min-w-44 max-w-72 rounded-md" />
        <Skeleton className="h-11 w-36 rounded-md" />
        <Skeleton className="h-11 w-36 rounded-md" />
      </div>
    </div>
  );
}

/** Canonical table shell — header band + zebra rows + pagination bar. */
export function TableSkeleton({
  rows = 6,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "hidden md:block rounded-xl border border-border bg-card overflow-hidden",
        className,
      )}
      aria-hidden="true"
    >
      <div className="border-b border-border bg-muted px-4 py-3">
        <div className="flex gap-6">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-16 ms-auto" />
        </div>
      </div>
      <div className="divide-y divide-border/60">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-6 px-4 py-3.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-28 max-w-[40%]" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-16 ms-auto" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <Skeleton className="h-3.5 w-24" />
        <div className="flex gap-1.5">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="size-9 rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Mobile card list — the md:hidden twin of the table. */
export function CardListSkeleton({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("md:hidden space-y-2.5", className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-4 space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-3.5 w-28 max-w-[55%]" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-3 w-32 max-w-[70%]" />
        </div>
      ))}
    </div>
  );
}

/** Simple stacked list-card rows (settings-ish forms, staff, delivery). */
export function ListRowsSkeleton({
  rows = 3,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5", className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
        >
          <Skeleton className="size-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32 max-w-[60%]" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-16 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Card grid — products/categories tiles with image header. */
export function CardGridSkeleton({
  count = 8,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card overflow-hidden"
        >
          <Skeleton className="h-32 rounded-none" />
          <div className="p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-4 w-28 max-w-[60%]" />
              <Skeleton className="h-4 w-14" />
            </div>
            <Skeleton className="h-3 w-20" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-8 flex-1 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Detail page — back chip + hero row + KPI tiles + two cards. */
export function DetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-5" aria-hidden="true">
      <Skeleton className="h-9 w-32 rounded-md" />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2.5">
          <Skeleton className="h-9 w-48 max-w-[70%]" />
          <Skeleton className="h-3.5 w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-4 space-y-2"
          >
            <Skeleton className="h-3 w-16 mx-auto" />
            <Skeleton className="h-[22px] w-20 mx-auto" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}

/* ── Route fallbacks (loading.tsx consumers) ─────────────────────── */

export function DashboardSkeleton() {
  return (
    <SkeletonPage label="جارٍ تحميل لوحة التحكم...">
      <HeaderSkeleton />
      <KpiGridSkeleton />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl lg:col-span-2" />
      </div>
    </SkeletonPage>
  );
}

export function OrdersSkeleton() {
  return (
    <SkeletonPage label="جارٍ تحميل الطلبات...">
      <HeaderSkeleton />
      <ToolbarSkeleton />
      <TableSkeleton rows={6} />
      <CardListSkeleton rows={4} />
    </SkeletonPage>
  );
}

export function ProductsSkeleton() {
  return (
    <SkeletonPage label="جارٍ تحميل المنتجات...">
      <HeaderSkeleton />
      <div className="max-w-72" aria-hidden="true">
        <Skeleton className="h-11 rounded-md" />
      </div>
      <CardGridSkeleton count={8} />
    </SkeletonPage>
  );
}

export function CustomersSkeleton() {
  return (
    <SkeletonPage label="جارٍ تحميل العملاء...">
      <HeaderSkeleton action={false} />
      <div className="max-w-72" aria-hidden="true">
        <Skeleton className="h-11 rounded-md" />
      </div>
      <TableSkeleton rows={5} />
      <CardListSkeleton rows={4} />
    </SkeletonPage>
  );
}

export function CategoriesSkeleton() {
  return (
    <SkeletonPage label="جارٍ تحميل الأقسام...">
      <HeaderSkeleton />
      <CardGridSkeleton count={8} />
    </SkeletonPage>
  );
}

export function DeliverySkeleton() {
  return (
    <SkeletonPage label="جارٍ تحميل مناطق التوصيل..." className="max-w-2xl">
      <HeaderSkeleton />
      <ListRowsSkeleton rows={3} />
    </SkeletonPage>
  );
}

export function PaymentsSkeleton() {
  return (
    <SkeletonPage label="جارٍ تحميل طرق الدفع..." className="max-w-2xl">
      <HeaderSkeleton action={false} />
      <ListRowsSkeleton rows={2} />
    </SkeletonPage>
  );
}

export function StaffSkeleton() {
  return (
    <SkeletonPage label="جارٍ تحميل فريق العمل..." className="max-w-2xl">
      <HeaderSkeleton />
      <ListRowsSkeleton rows={2} />
    </SkeletonPage>
  );
}

export function SettingsSkeleton() {
  return (
    <SkeletonPage label="جارٍ تحميل الإعدادات..." className="max-w-2xl">
      <HeaderSkeleton action={false} />
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-[420px] rounded-xl" />
    </SkeletonPage>
  );
}

export function OnboardingSkeleton() {
  return (
    <SkeletonPage label="جارٍ تحميل الإعداد..." className="max-w-2xl">
      <HeaderSkeleton action={false} />
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </SkeletonPage>
  );
}

export function OrderDetailSkeleton() {
  return <DetailSkeleton />;
}

export function CustomerDetailSkeleton() {
  return <DetailSkeleton />;
}

export function AdminPaymentsSkeleton() {
  return (
    <SkeletonPage label="جارٍ تحميل الموافقات...">
      <HeaderSkeleton action={false} />
      <div className="flex gap-2" aria-hidden="true">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-full" />
        ))}
      </div>
      <div className="space-y-3" aria-hidden="true">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </SkeletonPage>
  );
}
