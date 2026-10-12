import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";

/** 17-DEBT-SO: pre-hydration hold extracted verbatim from
 * checkout-client.tsx (r140 P2-2). Pure presentation. */
export function CheckoutHold({ businessName }: { businessName: string }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b border-border safe-top sticky top-0 z-(--z-dropdown)">
        <div className="mx-auto max-w-2xl px-4 h-14 flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ArrowRight className="size-4" aria-hidden="true" />
            العودة
          </div>
          <div className="ms-auto font-heading font-bold text-sm">{businessName}</div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-5 space-y-4" aria-busy="true">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </main>
    </div>
  );
}
