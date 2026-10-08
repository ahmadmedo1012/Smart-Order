"use client";

import * as React from "react";
import Image from "next/image";
import { useCart } from "@/hooks/use-cart";
import { formatLyd } from "@/lib/money";
import type { StoreProduct } from "@/components/storefront/storefront";
import { ProductDialog } from "@/components/storefront/product-dialog";
import { toast } from "sonner";
import { Plus, Package } from "lucide-react";

export function ProductCard({
  product,
  slug,
  businessName,
}: {
  product: StoreProduct;
  slug: string;
  businessName: string;
}) {
  const [open, setOpen] = React.useState(false);
  const addItem = useCart((s) => s.addItem);

  function quickAdd() {
    if (product.variants.length > 0 || product.optionGroups.some((g) => g.required)) {
      setOpen(true); // needs selection
      return;
    }
    addItem(slug, businessName, {
      productId: product.id,
      productName: product.name,
      productImage: product.imageUrl,
      variantId: null,
      variantName: null,
      options: [],
      quantity: 1,
      note: "",
      unitPrice: product.price,
    });
    toast.success(`أُضيف ${product.name} إلى السلة`, {
      action: { label: "عرض السلة", onClick: () => window.dispatchEvent(new CustomEvent("open-cart")) },
    });
  }

  return (
    <>
      <article
        className="group rounded-xl border border-border bg-card overflow-hidden flex flex-col transition-[border-color,box-shadow,transform] duration-(--t-fast) hover:border-foreground/25 hover:shadow-(--shadow-card-h) hover:-translate-y-px"
      >
        <button
          onClick={() => setOpen(true)}
          className="relative h-28 sm:h-32 bg-muted overflow-hidden text-start"
          aria-label={`تفاصيل ${product.name}`}
        >
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 30vw, 46vw"
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <span className="size-full flex items-center justify-center text-muted-foreground/30">
              <Package className="size-9" aria-hidden="true" />
            </span>
          )}
          {product.isFeatured && (
            <span className="absolute top-2 start-2 rounded-full bg-saffron/95 px-2 py-0.5 text-[11px] font-bold text-espresso shadow">
              مميز
            </span>
          )}
          {!product.isAvailable && (
            <span className="absolute inset-0 bg-background/80 backdrop-blur-[2px] flex items-center justify-center">
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                غير متاح حالياً
              </span>
            </span>
          )}
        </button>

        <div className="p-3 flex flex-col flex-1">
          <button onClick={() => setOpen(true)} className="text-start">
            <h3 className="font-semibold text-sm leading-snug line-clamp-2">{product.name}</h3>
          </button>
          {product.description && (
            <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1 leading-relaxed">{product.description}</p>
          )}
          <div className="mt-auto pt-2.5 flex items-center justify-between gap-2">
            <span className="font-bold text-sm tabular-nums">{formatLyd(product.price)}</span>
            {/* r131-F2 (P1-3): the canonical icon-button recipe — 40px/r10/
                600-grammar press 0.97 (the 44px/r12/700/scale-95 spelling
                is retired; matches ui/button size="icon"). */}
            <button
              onClick={quickAdd}
              disabled={!product.isAvailable}
              aria-label={`إضافة ${product.name} إلى السلة`}
              className="rounded-md bg-primary text-primary-foreground size-10 flex items-center justify-center font-semibold transition-[color,background-color,transform] duration-(--t-fast) hover:bg-primary/90 active:scale-[0.97] active:duration-(--t-micro) disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="size-5" aria-hidden="true" />
            </button>
          </div>
          {(product.variants.length > 0 || product.optionGroups.length > 0) && product.isAvailable && (
            <button
              onClick={() => setOpen(true)}
              className="mt-1.5 text-[11px] text-accent-foreground font-medium hover:underline"
            >
              {product.variants.length > 0 && `${product.variants.length} أحجام · `}
              {product.optionGroups.length > 0 && `${product.optionGroups.length} إضافات`}
            </button>
          )}
        </div>
      </article>

      <ProductDialog
        product={product}
        slug={slug}
        businessName={businessName}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
