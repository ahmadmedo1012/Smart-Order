import { Skeleton } from "@/components/ui/skeleton";

/**
 * StorefrontSkeleton — family loading surface. Uses the family
 * `.skeleton` shimmer (muted→border sweep) and mirrors the REAL
 * storefront geometry — W7-G (fix 14): search rounded-md (the real
 * input), the category-pills row the real strip carries (≈56px — no
 * CLS when data lands), card images h-28 sm:h-32 (the product-card
 * twin).
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
          <Skeleton className="size-11 rounded-lg" />
        </div>
        <div className="mx-auto max-w-4xl px-4 py-2.5 space-y-2.5">
          <Skeleton className="h-11 rounded-md" />
          {/* W7-G (fix 14): the category pills row — h-11 round pills like
              the real filter strip (idle pills are round), killing the
              ≈56px jump when the store hydrates. */}
          <div className="flex gap-2" aria-hidden="true">
            <Skeleton className="h-11 w-14 rounded-full shrink-0" />
            <Skeleton className="h-11 w-16 rounded-full shrink-0" />
            <Skeleton className="h-11 w-12 rounded-full shrink-0" />
            <Skeleton className="h-11 w-16 rounded-full shrink-0" />
            <Skeleton className="h-11 w-14 rounded-full shrink-0" />
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-4xl px-4 py-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-border">
              <Skeleton className="h-28 sm:h-32 rounded-none" />
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
