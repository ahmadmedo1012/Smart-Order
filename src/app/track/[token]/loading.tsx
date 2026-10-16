import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading fallback (P6-2-f3 GROUP 4) — shape-matched to the
 * TRACKING page anatomy (the same surfaces TrackingClient paints): the
 * 14px header, the order header card (mono order number + status
 * stamp), the STATION ROAD (five circular nodes threaded on the dashed
 * spine — the third carries the RM-safe pulse-soft ring exactly like
 * the live active station), and the receipt card rows. No timers, no
 * JS-driven loops; the skeleton shimmer and the pulse-soft ring are
 * both zeroed by the global prefers-reduced-motion gate.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="جارٍ تحميل تتبع الطلب"
      className="min-h-screen bg-muted/30"
    >
      <header className="bg-background border-b border-border safe-top">
        <div className="mx-auto max-w-lg lg:max-w-2xl px-4 h-14 flex items-center gap-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="ms-auto size-8 rounded-md" />
        </div>
      </header>
      <main className="mx-auto max-w-lg lg:max-w-2xl px-4 py-6 space-y-4">
        {/* order header card */}
        <div className="rounded-xl border border-border bg-card p-5 text-center space-y-3">
          <Skeleton className="mx-auto h-6 w-36" />
          <Skeleton className="mx-auto h-3 w-44" />
          <Skeleton className="mx-auto h-8 w-28 rounded-md" />
          <Skeleton className="mx-auto h-3 w-40" />
        </div>

        {/* the station road — the flow card */}
        <div className="rounded-xl border border-border bg-card p-5">
          <Skeleton className="mb-4 h-4 w-20" />
          <div className="space-y-1" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3.5 relative pb-4 last:pb-0">
                {i < 4 && (
                  /* the dashed spine segment — station geometry twin */
                  <span
                    className={
                      "absolute top-[18px] h-full w-0 start-[17px] border-s-2 border-dashed " +
                      (i < 2 ? "border-primary/50" : "border-border")
                    }
                  />
                )}
                {i === 2 ? (
                  /* the live "current" station — pulse-safe: the RM gate
                     halts the breathe ring and the shimmer both */
                  <Skeleton className="relative z-10 size-9 shrink-0 rounded-full animate-pulse-soft" />
                ) : (
                  <Skeleton
                    className={
                      "relative z-10 size-9 shrink-0 rounded-full " +
                      (i < 2 ? "opacity-70" : "opacity-50")
                    }
                  />
                )}
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        </div>

        {/* receipt card — items + totals ledger */}
        <div className="rounded-xl border border-border bg-card p-5">
          <Skeleton className="mb-3 h-4 w-24" />
          <div className="space-y-2.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="mt-4 pt-3 border-t border-border/60 space-y-1.5">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </main>
    </div>
  );
}
