import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading fallback (P6-2-f3 GROUP 4) — shape-matched to the
 * checkout FORM anatomy (the same surfaces CheckoutClient paints): the
 * sticky 14px header, the h1, the journey route (3 station circles on a
 * dashed road — static, no timers), then the section cards (fulfillment
 * tiles → customer fields → payment tiles) with squared stamp-tile
 * skeletons, and the sticky submit bar. The `.skeleton` shimmer is RM-
 * gated (the canonical duration token zeroes under reduced motion), so
 * every animated bit here is pulse-safe.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="جارٍ تحميل صفحة إتمام الطلب"
      className="min-h-screen bg-muted/30"
    >
      <header className="bg-background border-b border-border safe-top">
        <div className="mx-auto max-w-2xl px-4 h-14 flex items-center gap-3">
          <Skeleton className="h-6 w-20 rounded-md" />
          <Skeleton className="ms-auto h-4 w-28" />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-5 pb-32 space-y-4">
        <Skeleton className="h-7 w-40" />

        {/* the journey route — store → checkout → done (station circles
            at node-center height on the dashed road) */}
        <div aria-hidden="true" className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <Skeleton className="size-8 rounded-full" />
          </div>
          <span className="h-0 flex-1 mt-[15px] border-t-2 border-dashed border-border" />
          <div className="flex flex-col items-center gap-1">
            <Skeleton className="size-8 rounded-full" />
          </div>
          <span className="h-0 flex-1 mt-[15px] border-t-2 border-dashed border-border" />
          <div className="flex flex-col items-center gap-1">
            <Skeleton className="size-8 rounded-full" />
          </div>
        </div>

        {/* fulfillment tiles (squared stamp tiles) */}
        <div className="rounded-xl border border-border bg-card p-4">
          <Skeleton className="mb-3 h-4 w-24" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-[76px] rounded-sm" />
            <Skeleton className="h-[76px] rounded-sm" />
          </div>
        </div>

        {/* customer info fields */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3.5">
          <Skeleton className="h-4 w-16" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-11 rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-11 rounded-md" />
            </div>
          </div>
        </div>

        {/* payment tiles */}
        <div className="rounded-xl border border-border bg-card p-4">
          <Skeleton className="mb-3 h-4 w-24" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Skeleton className="h-14 rounded-sm" />
            <Skeleton className="h-14 rounded-sm" />
            <Skeleton className="h-14 rounded-sm" />
          </div>
        </div>

        {/* cart summary rows */}
        <div className="rounded-xl border border-border bg-card p-4">
          <Skeleton className="mb-3 h-4 w-28" />
          <div className="space-y-2.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </main>

      {/* the sticky submit bar */}
      <div className="fixed bottom-0 inset-x-0 border-t border-border bg-background/95 backdrop-blur-md safe-bottom">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-12 w-32 rounded-md" />
        </div>
      </div>
    </div>
  );
}
