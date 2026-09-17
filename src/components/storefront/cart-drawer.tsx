"use client";

import * as React from "react";
import Link from "next/link";
import { useCart, cartEstimatedSubtotal, cartCount } from "@/hooks/use-cart";
import { formatLyd } from "@/lib/money";
import type { StoreData } from "@/components/storefront/storefront";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { EmptyState } from "@/components/shared/states";
import { toast } from "sonner";
import { ShoppingBag, Minus, Plus, Trash2, ArrowLeft, Store } from "lucide-react";

// listen for external "open cart" events (e.g., toast action)
if (typeof window !== "undefined") {
  window.addEventListener("open-cart", () => {
    window.dispatchEvent(new CustomEvent("toggle-cart-drawer"));
  });
}

export function CartDrawer({
  slug,
  data,
  onCheckout,
  onClearIfOther,
}: {
  slug: string;
  data: StoreData;
  onCheckout: () => void;
  onClearIfOther: () => void;
}) {
  const items = useCart((s) => s.items);
  const cartSlug = useCart((s) => s.businessSlug);
  const updateQuantity = useCart((s) => s.updateQuantity);
  const removeItem = useCart((s) => s.removeItem);
  const updateNote = useCart((s) => s.updateNote);

  // cart belongs to a different store → reset (single-business cart)
  React.useEffect(() => {
    if (cartSlug && cartSlug !== slug) {
      onClearIfOther();
      toast.info("بدأت سلة جديدة لمتجر " + data.business.name);
    }
  }, [cartSlug, slug, onClearIfOther, data.business.name]);

  const subtotal = cartEstimatedSubtotal(items);
  const count = cartCount(items);

  return (
    <SheetContent side="left" className="w-full sm:max-w-md p-0 flex flex-col" dir="rtl">
      <div className="h-16 flex items-center gap-3 px-5 border-b border-border shrink-0">
        <ShoppingBag className="size-5 text-primary" aria-hidden="true" />
        <div className="flex-1">
          <h2 className="font-heading font-bold">سلة الطلب</h2>
          <p className="text-[11px] text-muted-foreground tabular">{count} عنصر</p>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="سلتك فارغة"
          description="تصفح المنتجات وأضف ما يعجبك"
          className="flex-1"
        />
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
            {items.map((item) => (
              <div key={item.key} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-start gap-3">
                  {item.productImage ? (
                     
                    <img src={item.productImage} alt="" className="size-14 rounded-lg object-cover shrink-0" loading="lazy" />
                  ) : (
                    <span className="flex size-14 items-center justify-center rounded-lg bg-muted text-muted-foreground/40 shrink-0">
                      <Store className="size-5" aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold leading-snug">{item.productName}</div>
                    {item.variantName && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">{item.variantName}</div>
                    )}
                    {item.options.length > 0 && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {item.options.map((o) => o.name).join("، ")}
                      </div>
                    )}
                    {item.note && (
                      <div className="text-[11px] text-warning-foreground mt-0.5">📝 {item.note}</div>
                    )}
                  </div>
                  <div className="text-end shrink-0">
                    <div className="text-sm font-bold tabular nums">{formatLyd(item.unitPrice * item.quantity)}</div>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-1 rounded-lg border border-border">
                    <button
                      onClick={() => updateQuantity(item.key, item.quantity + 1)}
                      className="size-8 flex items-center justify-center hover:bg-muted rounded-s-lg transition-colors"
                      aria-label={`زيادة كمية ${item.productName}`}
                    >
                      <Plus className="size-3.5" aria-hidden="true" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold tabular">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.key, item.quantity - 1)}
                      className="size-8 flex items-center justify-center hover:bg-muted rounded-e-lg transition-colors"
                      aria-label={`إنقاص كمية ${item.productName}`}
                    >
                      <Minus className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.key)}
                    className="rounded-lg p-2 hover:bg-destructive/10 transition-colors"
                    aria-label={`إزالة ${item.productName} من السلة`}
                  >
                    <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}

            {/* note editor per item (compact) */}
            {items.some((i) => !i.note) && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer select-none hover:text-foreground">إضافة ملاحظة لأحد العناصر</summary>
                <div className="mt-2 space-y-1.5">
                  {items.filter((i) => !i.note).map((i) => (
                    <input
                      key={i.key}
                      placeholder={`ملاحظة: ${i.productName}`}
                      maxLength={200}
                      onBlur={(e) => updateNote(i.key, e.target.value.trim())}
                      className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  ))}
                </div>
              </details>
            )}
          </div>

          {/* Summary + checkout */}
          <div className="border-t border-border p-4 pb-5 safe-bottom shrink-0 space-y-3 bg-card">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">المجموع التقديري</span>
              <span className="font-bold tabular nums">{formatLyd(subtotal)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              رسوم التوصيل تُحسب في الخطوة التالية حسب منطقتك
            </p>
            <Button
              asChild
              className="w-full h-12 text-base font-bold"
              onClick={onCheckout}
            >
              <Link href={`/store/${slug}/checkout`}>
                إتمام الطلب
                <ArrowLeft className="size-5 ms-2" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </>
      )}
    </SheetContent>
  );
}
