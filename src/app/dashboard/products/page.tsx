"use client";

import * as React from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { useBusiness } from "@/components/dashboard/shell";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductEditor } from "@/components/dashboard/product-editor";
import { formatLyd } from "@/lib/money";
import { compressImage } from "@/lib/compress";
import { toast } from "sonner";
import { Package, Plus, Search, Upload, Loader2 } from "lucide-react";

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
    setError(false);
    Promise.all([
      api.get<{ products: Product[] }>(`/api/products?businessId=${businessId}`),
      api.get<{ categories: Category[] }>(`/api/categories?businessId=${businessId}`),
    ])
      .then(([p, c]) => {
        setProducts(p.data.products);
        setCategories(c.data.categories);
      })
      .catch(() => setError(true));
  }, [businessId]);

  React.useEffect(load, [load]);

  async function toggleAvailability(p: Product) {
    try {
      await api.patch(`/api/products/${p.id}`, { businessId, isAvailable: !p.isAvailable });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر التحديث");
    }
  }

  if (error) return <ErrorState retry={load} />;

  const filtered = (products ?? []).filter(
    (p) => !q.trim() || p.name.includes(q.trim()) || (p.category?.name ?? "").includes(q.trim())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">المنتجات</h1>
          <p className="text-sm text-muted-foreground mt-1 tabular">
            {products?.length ?? "…"} منتج · {categories.length} قسم
          </p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground h-10 px-4 text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4.5" aria-hidden="true" />
          منتج جديد
        </button>
      </div>

      <div className="relative max-w-72">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث عن منتج..."
          aria-label="بحث في المنتجات"
          className="w-full h-10 rounded-lg border border-input bg-card ps-9 pe-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-orange"
        />
      </div>

      {products === null ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={q ? "لا نتائج مطابقة" : "لا منتجات بعد"}
          description={q ? "جرّب كلمة بحث مختلفة" : "أضف أول منتج ليظهر في متجرك — صورة، سعر، وقسم"}
          action={
            !q && (
              <button
                onClick={() => setEditing("new")}
                className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground h-10 px-5 text-sm font-semibold"
              >
                <Plus className="size-4.5" aria-hidden="true" />
                أضف منتجك الأول
              </button>
            )
          }
        />
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <article
              key={p.id}
              className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg hover:shadow-black/5 transition-shadow"
            >
              <div className="relative h-32 bg-muted overflow-hidden">
                {p.imageUrl ? (
                   
                  <img src={p.imageUrl} alt={p.name} className="size-full object-cover" loading="lazy" />
                ) : (
                  <div className="size-full flex items-center justify-center text-muted-foreground/40">
                    <Package className="size-10" aria-hidden="true" />
                  </div>
                )}
                <div className="absolute top-2 end-2 flex gap-1.5">
                  {p.isFeatured && (
                    <span className="rounded-full bg-saffron/90 px-2 py-0.5 text-[10px] font-bold text-black/80 shadow">
                      مميز
                    </span>
                  )}
                  {!p.isAvailable && (
                    <span className="rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-bold text-muted-foreground shadow">
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
                      {p.variants.length > 0 && ` · ${p.variants.length} أحجام`}
                    </p>
                  </div>
                  <span className="font-bold text-sm tabular nums shrink-0">{formatLyd(p.price)}</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => setEditing(p)}
                    className="flex-1 rounded-lg border border-border h-8 text-xs font-medium hover:bg-muted transition-colors"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => toggleAvailability(p)}
                    className={`rounded-lg h-8 px-3 text-xs font-medium border transition-colors ${
                      p.isAvailable
                        ? "border-success/40 text-success hover:bg-success/10"
                        : "border-muted-foreground/40 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {p.isAvailable ? "متاح" : "غير متاح"}
                  </button>
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
