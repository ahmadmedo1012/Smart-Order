"use client";
import { countedArabicPhrase } from "@/lib/arabic-plural";
import { normalizeArabic } from "@/lib/arabic";

import * as React from "react";
import Image from "next/image";
import { api } from "@/lib/client";
import { useBusiness } from "@/components/dashboard/shell";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProductEditor } from "@/components/dashboard/product-editor";
import { ProductsSkeleton } from "@/components/dashboard/skeletons";
import { formatLyd } from "@/lib/money";
import { toast } from "sonner";
import { Package, Plus, Search } from "lucide-react";

export interface ProductVariant {
  id?: string;
  name: string;
  priceDelta: number;
}
export interface ProductOptionItem {
  id?: string;
  name: string;
  priceDelta: number;
}
export interface ProductOptionGroup {
  id?: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  required: boolean;
  options: ProductOptionItem[];
}
export interface Product {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  price: number;
  isAvailable: boolean;
  isFeatured: boolean;
  trackInventory: boolean;
  stockQuantity: number;
  variants: Array<{ id: string; name: string; priceDelta: number }>;
  optionGroups: Array<{
    id: string;
    name: string;
    minSelect: number;
    maxSelect: number;
    required: boolean;
    options: Array<{ id: string; name: string; priceDelta: number }>;
  }>;
}
export interface Category {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  _count?: { products: number };
}

export default function ProductsPage() {
  const { businessId } = useBusiness();
  const [products, setProducts] = React.useState<Product[] | null>(null);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [error, setError] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [editing, setEditing] = React.useState<Product | "new" | null>(null);

  const load = React.useCallback(() => {
    if (!businessId) return;
    Promise.all([
      api.get<{ products: Product[] }>(
        `/api/products?businessId=${businessId}`,
      ),
      api.get<{ categories: Category[] }>(
        `/api/categories?businessId=${businessId}`,
      ),
    ])
      .then(([p, c]) => {
        setError(false);
        setProducts(p.data.products);
        setCategories(c.data.categories);
      })
      .catch(() => setError(true));
  }, [businessId]);

  React.useEffect(load, [load]);

  async function toggleAvailability(p: Product) {
    try {
      await api.patch(`/api/products/${p.id}`, {
        businessId,
        isAvailable: !p.isAvailable,
      });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر التحديث");
    }
  }

  if (error) return <ErrorState retry={() => { setError(false); load(); }} />;

  /* r150: normalizeArabic parity with the storefront search — the same
     product finds the same way on both surfaces (hamza/alef forms). */
  const needle = normalizeArabic(q.trim());
  const filtered = (products ?? []).filter(
    (p) =>
      !needle ||
      normalizeArabic(p.name).includes(needle) ||
      normalizeArabic(p.category?.name ?? "").includes(needle),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="المنتجات"
        /* Phase 6 (route grammar): the operational counts moved from the
           subtitle to the MONO meta line (the dispatcher's code voice)
           and the header row ends in the quiet route divider. */
        meta={
          <span>
            {products?.length ?? "…"} منتج · {categories.length} قسم
          </span>
        }
        divider
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4.5" aria-hidden="true" />
            منتج جديد
          </Button>
        }
      />

      <div className="relative max-w-72">
        <Search
          className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث عن منتج…"
          aria-label="بحث في المنتجات"
          className="ps-9 bg-card"
        />
      </div>

      {products === null ? (
        /* r131 (F3, A5 P2-7): shape-matched card-grid skeleton (image
           header + title/price + actions rows), not flat h-36 bars. */
        <ProductsSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={q ? "لا نتائج مطابقة" : "لا منتجات بعد"}
          description={
            q
              ? "جرّب كلمة بحث مختلفة"
              : "أضف أول منتج ليظهر في متجرك — صورة، سعر، وقسم"
          }
          action={
            !q && (
              <Button onClick={() => setEditing("new")} variant="outline">
                <Plus className="size-4.5" aria-hidden="true" />
                أضف منتجك الأول
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <article
              key={p.id}
              className="group rounded-xl border border-border bg-card overflow-hidden transition-[border-color,box-shadow,transform] duration-(--t-base) hover:-translate-y-px hover:border-foreground/25 hover:shadow-md"
            >
              <div className="relative h-32 bg-muted overflow-hidden">
                {p.imageUrl ? (
                  <Image
                    src={p.imageUrl}
                    alt={p.name}
                    fill
                    sizes="220px"
                    className="object-cover"
                  />
                ) : (
                  <div className="size-full flex items-center justify-center text-muted-foreground/40">
                    <Package className="size-10" aria-hidden="true" />
                  </div>
                )}
                <div className="absolute top-2 end-2 flex gap-1.5">
                  {/* Phase 6: the featured/unavailable chips speak the
                      squared shipping-stamp idiom (status-badges
                      language: 1px family border over the pastel family
                      ground + family deep ink). */}
                  {p.isFeatured && (
                    <span className="rounded-sm border border-(--c-yellow-ink)/40 bg-(--c-yellow-bg) px-2 py-0.5 text-[11px] font-bold text-(--c-yellow-deep)">
                      مميز
                    </span>
                  )}
                  {!p.isAvailable && (
                    <span className="rounded-sm border border-(--c-grey-ink)/35 bg-(--c-grey-bg) px-2 py-0.5 text-[11px] font-bold text-(--c-grey-deep)">
                      غير متاح
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">{p.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {p.category?.name ?? "بدون قسم"}
                      {p.variants.length > 0 &&
                        ` · ${countedArabicPhrase(p.variants.length, "حجم", {
                          one: "حجم واحد",
                          two: "حجمان",
                          few: "أحجام",
                          many: "حجمًا",
                        })}`}
                    </p>
                  </div>
                  {/* Phase 6: money figures ride IBM Plex Mono — the
                      operational code voice (tabular-nums kept for
                      alignment). */}
                  <span className="font-mono font-bold text-sm tabular-nums shrink-0">
                    {formatLyd(p.price)}
                  </span>
                </div>
                {/* r131 (F3, A5 P2-10): the two hand-rolled card actions
                    (r8 radius, no press scale, 3rd ad-hoc grammar) →
                    the Button primitive at the sm rung (r10, 0.97 press,
                    canonical focus). */}
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setEditing(p)}
                  >
                    تعديل
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={
                      p.isAvailable
                        ? "flex-1 border-success/40 text-success-ink hover:bg-success/10"
                        : "flex-1 border-muted-foreground/40 text-muted-foreground hover:bg-muted"
                    }
                    onClick={() => toggleAvailability(p)}
                  >
                    {p.isAvailable ? "متاح" : "غير متاح"}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <ProductEditor
          product={editing === "new" ? null : editing}
          categories={categories}
          businessId={businessId}
          onClose={(changed) => {
            setEditing(null);
            if (changed) load();
          }}
        />
      )}
    </div>
  );
}
