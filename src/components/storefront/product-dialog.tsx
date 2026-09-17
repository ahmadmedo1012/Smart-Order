"use client";

import * as React from "react";
import { useCart, MAX_CART_QUANTITY } from "@/hooks/use-cart";
import { formatLyd } from "@/lib/money";
import type { StoreProduct } from "@/components/storefront/storefront";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Minus, Plus, Package, ShoppingBag } from "lucide-react";

export function ProductDialog({
  product,
  slug,
  businessName,
  onClose,
}: {
  product: StoreProduct;
  slug: string;
  businessName: string;
  onClose: () => void;
}) {
  const addItem = useCart((s) => s.addItem);
  const [variantId, setVariantId] = React.useState<string | null>(
    product.variants.length > 0 ? product.variants[0].id : null
  );
  const [selectedOptions, setSelectedOptions] = React.useState<Record<string, Set<string>>>({});
  const [quantity, setQuantity] = React.useState(1);
  const [note, setNote] = React.useState("");

  const variant = product.variants.find((v) => v.id === variantId) ?? null;

  const chosenOptionObjects = React.useMemo(() => {
    const all: Array<{ id: string; name: string; priceDelta: number }> = [];
    for (const g of product.optionGroups) {
      for (const o of g.options) {
        if (selectedOptions[g.id]?.has(o.id)) all.push(o);
      }
    }
    return all;
  }, [selectedOptions, product.optionGroups]);

  const unitPrice =
    product.price +
    (variant?.priceDelta ?? 0) +
    chosenOptionObjects.reduce((s, o) => s + o.priceDelta, 0);

  function toggleOption(groupId: string, optionId: string, maxSelect: number) {
    setSelectedOptions((prev) => {
      const current = new Set(prev[groupId] ?? []);
      if (current.has(optionId)) {
        current.delete(optionId);
      } else {
        if (current.size >= maxSelect) {
          if (maxSelect === 1) current.clear();
          else return prev;
        }
        current.add(optionId);
      }
      return { ...prev, [groupId]: current };
    });
  }

  const groupsValid = product.optionGroups.every((g) => {
    const count = selectedOptions[g.id]?.size ?? 0;
    if (g.required && count < Math.max(1, g.minSelect)) return false;
    return count <= g.maxSelect;
  });

  function add() {
    if (!groupsValid) {
      toast.error("أكمل الاختيارات المطلوبة أولاً");
      return;
    }
    addItem(slug, businessName, {
      productId: product.id,
      productName: product.name,
      productImage: product.imageUrl,
      variantId: variant?.id ?? null,
      variantName: variant?.name ?? null,
      options: chosenOptionObjects,
      quantity,
      note: note.trim(),
      unitPrice,
    });
    toast.success(`أُضيف ${product.name} إلى السلة`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={product.name}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-2xl max-h-[92vh] flex flex-col">
        {/* Product header */}
        <div className="relative h-40 sm:h-44 bg-muted shrink-0">
          {product.imageUrl ? (
             
            <img src={product.imageUrl} alt={product.name} className="size-full object-cover rounded-t-2xl" />
          ) : (
            <span className="size-full flex items-center justify-center text-muted-foreground/30">
              <Package className="size-12" aria-hidden="true" />
            </span>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 end-3 rounded-full bg-background/90 shadow p-2 hover:bg-background"
            aria-label="إغلاق"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <h2 className="font-heading font-bold text-lg leading-snug">{product.name}</h2>
            {product.description && (
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{product.description}</p>
            )}
          </div>

          {/* Variants */}
          {product.variants.length > 0 && (
            <fieldset>
              <legend className="text-sm font-semibold mb-2.5">اختر الحجم</legend>
              <div className="grid grid-cols-3 gap-2">
                {product.variants.map((v) => {
                  const selected = variantId === v.id;
                  const price = product.price + v.priceDelta;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVariantId(v.id)}
                      aria-pressed={selected}
                      className={`rounded-xl border p-2.5 text-center transition-colors ${
                        selected ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted/60"
                      }`}
                    >
                      <div className="text-xs font-semibold">{v.name}</div>
                      {v.priceDelta !== 0 && (
                        <div className="text-[10px] mt-0.5 tabular nums">{formatLyd(price)}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {/* Option groups */}
          {product.optionGroups.map((g) => {
            const selected = selectedOptions[g.id] ?? new Set<string>();
            return (
              <fieldset key={g.id}>
                <legend className="text-sm font-semibold mb-1 flex items-center gap-2 flex-wrap">
                  {g.name}
                  {g.required ? (
                    <span className="text-[10px] font-medium text-destructive">إلزامي</span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      {g.maxSelect > 1 ? `حتى ${g.maxSelect} خيارات` : "اختياري"}
                    </span>
                  )}
                </legend>
                <div className="space-y-1.5 mt-2">
                  {g.options.map((o) => {
                    const isSelected = selected.has(o.id);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => toggleOption(g.id, o.id, g.maxSelect)}
                        aria-pressed={isSelected}
                        role={g.maxSelect > 1 ? "checkbox" : "radio"}
                        className={`w-full flex items-center gap-3 rounded-xl border px-3.5 h-11 text-start transition-colors ${
                          isSelected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/60"
                        }`}
                      >
                        <span
                          className={`flex items-center justify-center shrink-0 ${g.maxSelect > 1 ? "size-5 rounded-md" : "size-5 rounded-full"} border-2 ${
                            isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border"
                          }`}
                          aria-hidden="true"
                        >
                          {isSelected && (
                            <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="3.5">
                              <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span className="text-sm font-medium flex-1">{o.name}</span>
                        {o.priceDelta !== 0 && (
                          <span className="text-xs text-muted-foreground tabular nums">
                            {o.priceDelta > 0 ? "+" : ""}
                            {formatLyd(o.priceDelta)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}

          {/* Note */}
          <div>
            <label htmlFor="item-note" className="text-sm font-semibold mb-1.5 block">
              ملاحظة <span className="text-[10px] text-muted-foreground font-normal">(اختياري)</span>
            </label>
            <textarea
              id="item-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثال: بدون بصل، صوص زيادة..."
              maxLength={200}
              rows={2}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Footer: quantity + add */}
        <div className="border-t border-border p-4 pb-5 sm:pb-4 safe-bottom shrink-0 bg-card rounded-b-2xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-border">
              <button
                onClick={() => setQuantity((q) => Math.min(MAX_CART_QUANTITY, q + 1))}
                className="size-10 flex items-center justify-center hover:bg-muted rounded-s-xl transition-colors"
                aria-label="زيادة الكمية"
              >
                <Plus className="size-4" aria-hidden="true" />
              </button>
              <span className="w-10 text-center font-bold tabular" aria-live="polite">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="size-10 flex items-center justify-center hover:bg-muted rounded-e-xl transition-colors"
                aria-label="إنقاص الكمية"
              >
                <Minus className="size-4" aria-hidden="true" />
              </button>
            </div>
            <Button onClick={add} disabled={!groupsValid} className="flex-1 h-11 font-bold text-base">
              <ShoppingBag className="size-5 me-1.5" aria-hidden="true" />
              إضافة — <span className="tabular nums">{formatLyd(unitPrice * quantity)}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
