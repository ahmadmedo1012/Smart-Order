export function StorefrontSkeleton() {
  return (
    <div className="min-h-screen bg-background" aria-busy="true" aria-label="جارٍ تحميل المتجر">
      <div className="border-b border-border/70">
        <div className="mx-auto max-w-4xl px-4 h-16 flex items-center gap-3">
          <div className="size-10 rounded-xl skeleton-shimmer" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-32 rounded skeleton-shimmer" />
            <div className="h-3 w-20 rounded skeleton-shimmer" />
          </div>
          <div className="size-10 rounded-lg skeleton-shimmer" />
        </div>
        <div className="mx-auto max-w-4xl px-4 py-2.5">
          <div className="h-10 rounded-xl skeleton-shimmer" />
        </div>
      </div>
      <main className="mx-auto max-w-4xl px-4 py-5">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border overflow-hidden">
              <div className="h-28 skeleton-shimmer" />
              <div className="p-3 space-y-2">
                <div className="h-4 w-3/4 rounded skeleton-shimmer" />
                <div className="h-3 w-1/2 rounded skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
