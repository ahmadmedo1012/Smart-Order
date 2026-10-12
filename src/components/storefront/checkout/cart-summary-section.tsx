import { formatLyd } from "@/lib/money";
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
        ملخص السلة <span className="text-muted-foreground font-normal tabular-nums">({items.length} عنصر)</span>
      </h2>
      <ul className="space-y-2.5">
        {items.map((i) => (
          <li key={i.key} className="flex items-start justify-between gap-3 text-sm">
            <div className="min-w-0">
              <span className="tabular-nums text-muted-foreground">{i.quantity}×</span>{" "}
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
            <span className="tabular-nums font-medium shrink-0">{formatLyd(i.unitPrice * i.quantity)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
