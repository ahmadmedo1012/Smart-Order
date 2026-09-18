import { Skeleton } from "@/components/ui/skeleton";

/**
 * StorefrontSkeleton — family loading surface. Uses the family
 * `.skeleton` shimmer (muted→border sweep, 1.8s) with radii from the
 * family token scale (xl on cards, lg on inputs).
 */
export function StorefrontSkeleton() {
  return (
    <div className="min-h-screen bg-background" aria-busy="true" aria-label="جارٍ تحميل المتجر">
      <div className="border-b border-border/70">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-4">
          <Skeleton className="size-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="size-10 rounded-lg" />
        </div>
        <div className="mx-auto max-w-4xl px-4 py-2.5">
          <Skeleton className="h-10 rounded-xl" />
        </div>
      </div>
      <main className="mx-auto max-w-4xl px-4 py-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-border">
              <Skeleton className="h-28 rounded-none" />
              <div className="space-y-2 p-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
