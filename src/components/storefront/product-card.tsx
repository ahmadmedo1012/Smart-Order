"use client";

import * as React from "react";
import Image from "next/image";
import { useCart } from "@/hooks/use-cart";
import { formatLyd } from "@/lib/money";
import { countedArabicPhrase } from "@/lib/arabic-plural";
import type { StoreProduct } from "@/components/storefront/storefront";
import { ProductDialog } from "@/components/storefront/product-dialog";
import { ProductPlaceholder } from "@/components/storefront/product-placeholder";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function ProductCard({
  product,
  slug,
  businessName,
  eager = false,
}: {
  product: StoreProduct;
  slug: string;
  businessName: string;
  /** r132-F1a (A9 SO-9): first 4 above-the-fold cards render with
   * priority (fetchPriority=high + preload) — the SM MenuItemCard
   * `eager` prop shape; everything else stays lazy. */
  eager?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const addItem = useCart((s) => s.addItem);

  // r132-F1a (A2 F1): the out-of-stock overlay is rendered INSIDE the
  // image/title buttons — tapping the "غير متاح حالياً" overlay used to
  // open the dialog with a LIVE add CTA and the dead item rode all the
  // way to checkout submit. The dialog is now blocked at the source for
  // the unavailable snapshot (and re-checks live availability on every
  // open — see product-dialog).
  const canOpen = product.isAvailable;

  function quickAdd() {
    if (!product.isAvailable) return; // defense-in-depth (button already disabled)
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
          onClick={() => canOpen && setOpen(true)}
          disabled={!canOpen}
          className="relative h-28 sm:h-32 bg-muted overflow-hidden text-start disabled:cursor-not-allowed"
          aria-label={`تفاصيل ${product.name}`}
        >
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 30vw, 46vw"
              priority={eager}
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            /* r148 (SO-D3): the designed no-photo tile — copper gradient +
               product-initial monogram + package glyph (was the bare
               Package icon that read as unfinished). */
            <ProductPlaceholder name={product.name} size="card" />
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
          {/* r148 (SO-D2): the title row is the card's primary tap target —
              a bare <h3> measured 19px tall, far under the fleet 44px
              touch floor. min-h-11 + centered column lifts the hit area
              to 44px (1-line and 2-line names alike) without disturbing
              the card rhythm. */}
          <button
            onClick={() => canOpen && setOpen(true)}
            disabled={!canOpen}
            className="flex min-h-11 w-full flex-col justify-center text-start disabled:cursor-not-allowed"
          >
            <h3 className="font-semibold text-sm leading-snug line-clamp-2">{product.name}</h3>
          </button>
          {product.description && (
            <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1 leading-relaxed">{product.description}</p>
          )}
          <div className="mt-auto pt-2.5 flex items-center justify-between gap-2">
            <span className="font-bold text-sm tabular-nums">{formatLyd(product.price)}</span>
            {/* r149 (SO5): the quick-add rides the 44px touch canon
                (size-11; the r131 40px icon-button recipe is retired by
                the r149 fleet floor — same grammar otherwise). */}
            <button
              onClick={quickAdd}
              disabled={!product.isAvailable}
              aria-label={`إضافة ${product.name} إلى السلة`}
              className="rounded-md bg-primary text-primary-foreground size-11 flex items-center justify-center font-semibold transition-[color,background-color,transform] duration-(--t-fast) hover:bg-primary/90 active:scale-[0.97] active:duration-(--t-micro) disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="size-5" aria-hidden="true" />
            </button>
          </div>
          {(product.variants.length > 0 || product.optionGroups.length > 0) && product.isAvailable && (
            <button
              onClick={() => setOpen(true)}
              className="mt-1.5 text-[11px] text-accent-foreground font-medium hover:underline"
            >
              {/* r140 (P3-6): جمع معدود مصروف — «1 أحجام · 1 إضافات» كانت
                  غير نحوية؛ محرك العائلة (توأم arabic-plural.ts):
                  «حجم واحد»/«حجمان»/«3 أحجام» (نمط SM cartCountPhrase). */}
              {product.variants.length > 0 &&
                `${countedArabicPhrase(product.variants.length, "حجم", {
                  one: "حجم واحد",
                  two: "حجمان",
                  few: "أحجام",
                  many: "حجمًا",
                })} · `}
              {product.optionGroups.length > 0 &&
                countedArabicPhrase(product.optionGroups.length, "إضافة", {
                  one: "إضافة واحدة",
                  two: "إضافتان",
                  few: "إضافات",
                  many: "إضافة",
                })}
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
