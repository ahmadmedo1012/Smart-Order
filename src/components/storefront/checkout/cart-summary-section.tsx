import { formatLyd } from "@/lib/money";
import { countedArabicPhrase } from "@/lib/arabic-plural";
import { useCart } from "@/hooks/use-cart";
import { StickyNote } from "lucide-react";

/** 17-DEBT-SO: items summary extracted verbatim from checkout-client.tsx.
 * The cart item type is derived from the zustand store — no changes to
 * the shared hook file. */
type CartItems = ReturnType<typeof useCart.getState>["items"];

export function CartSummarySection({ items }: { items: CartItems }) {
  return (
    <section className="mt-3 rounded-xl border border-border bg-card p-4">
      <h2 className="font-semibold text-sm mb-3">
        {/* W7-G: العدّة القوسية تركب محرك الجمع — «عنصران» بدل «2 عنصر» */}
        ملخص السلة <span className="text-muted-foreground font-normal">({countedArabicPhrase(items.length, "عنصر", { one: "عنصر واحد", two: "عنصران", few: "عناصر", many: "عنصراً" })})</span>
      </h2>
      <ul className="space-y-2.5">
        {items.map((i) => (
          <li key={i.key} className="flex items-start justify-between gap-3 text-sm">
            <div className="min-w-0">
              <span className="font-mono tabular-nums text-muted-foreground">{i.quantity}×</span>{" "}
              <span className="font-medium">{i.productName}</span>
              {i.variantName && <span className="text-muted-foreground text-xs"> — {i.variantName}</span>}
              {i.options.length > 0 && (
                <div className="text-[11px] text-muted-foreground mt-0.5">{i.options.map((o) => o.name).join("، ")}</div>
              )}
              {i.note && (
                <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <StickyNote className="size-3 shrink-0" aria-hidden="true" />
                  {i.note}
                </div>
              )}
            </div>
            {/* P6-2-f3 (GROUP 1): money figures ride IBM Plex Mono
                (mixed-script stack — Latin/digits mono, Arabic sans) */}
            <span className="font-mono tabular-nums font-medium shrink-0">{formatLyd(i.unitPrice * i.quantity)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
