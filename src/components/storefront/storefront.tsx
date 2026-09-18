"use client";

// Storefront — Arabic RTL customer menu with categories, search, cart drawer.

import * as React from "react";
import { api } from "@/lib/client";
import { useCart, cartCount, cartEstimatedSubtotal } from "@/hooks/use-cart";
import { StorefrontSkeleton } from "@/components/storefront/skeletons";
import { ProductCard } from "@/components/storefront/product-card";
import { CartDrawer } from "@/components/storefront/cart-drawer";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { formatLyd } from "@/lib/money";
import { toE164 } from "@/lib/phone";
import { waLink } from "@/lib/whatsapp";
import { normalizeArabic } from "@/lib/arabic";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search,
  ShoppingBag,
  MessageCircle,
  MapPin,
  Phone,
  Package,
  X,
  Store as StoreIcon,
} from "lucide-react";

export interface StoreProduct {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  isAvailable: boolean;
  isFeatured: boolean;
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

export interface StoreData {
  business: {
    slug: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    coverUrl: string | null;
    city: string | null;
    phone: string | null;
    whatsappNumber: string | null;
    address: string | null;
    receiptFooter: string | null;
  };
  categories: Array<{ id: string; name: string; description: string | null; imageUrl: string | null }>;
  products: StoreProduct[];
  deliveryZones: Array<{ id: string; name: string; fee: number; minOrder: number }>;
  paymentMethods: Array<{ id: string; type: string; name: string; instructions: string | null; config: string | null }>;
}

export function Storefront({
  slug,
  business,
}: {
  slug: string;
  business: StoreData["business"];
}) {
  const [data, setData] = React.useState<StoreData | null>(null);
  const [error, setError] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<string>("ALL");
  const [cartOpen, setCartOpen] = React.useState(false);

  const items = useCart((s) => s.items);
  const cartBusinessSlug = useCart((s) => s.businessSlug);
  const count = cartCount(items);

  const load = React.useCallback(() => {
    setError(false);
    api
      .get<StoreData>(`/api/public/store/${slug}`)
      .then((r) => setData(r.data))
      .catch(() => setError(true));
  }, [slug]);

  React.useEffect(load, [load]);

  if (error) return <ErrorState retry={load} className="min-h-screen" />;
  if (!data) return <StorefrontSkeleton />;

  const query = normalizeArabic(q);
  const visibleProducts = data.products.filter((p) => {
    if (activeCategory !== "ALL" && p.categoryId !== activeCategory) return false;
    if (query && !normalizeArabic(p.name).includes(query) && !normalizeArabic(p.description ?? "").includes(query)) return false;
    return true;
  });

  const featured = visibleProducts.filter((p) => p.isFeatured);
  const regular = visibleProducts.filter((p) => !p.isFeatured);
  const categoriesWithProducts = data.categories.filter(
    (c) => data.products.some((p) => p.categoryId === c.id)
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Store header */}
      <header className="sticky top-0 z-40 safe-top">
        <div className="bg-background/92 backdrop-blur-md border-b border-border/70">
          <div className="mx-auto max-w-4xl px-4 h-16 flex items-center gap-3">
            {data.business.logoUrl ? (
               
              <img src={data.business.logoUrl} alt={data.business.name} className="size-10 rounded-xl object-cover border border-border" />
            ) : (
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <StoreIcon className="size-5" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="font-heading font-bold text-base truncate">{data.business.name}</h1>
              {data.business.city && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                  <MapPin className="size-3" aria-hidden="true" />
                  {data.business.city}
                </p>
              )}
            </div>
            {data.business.whatsappNumber && (
              <a
                href={waLink(toE164(data.business.whatsappNumber))}
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-btn rounded-lg size-10 flex items-center justify-center"
                aria-label="تواصل مع المتجر عبر واتساب"
              >
                <MessageCircle className="size-5" aria-hidden="true" />
              </a>
            )}
            <ThemeToggle className="size-10" />
            {/* Cart button */}
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <button
                  className="relative rounded-lg bg-primary text-primary-foreground size-10 flex items-center justify-center font-semibold"
                  aria-label={`عرض السلة (${count} عنصر)`}
                >
                  <ShoppingBag className="size-5" aria-hidden="true" />
                  {count > 0 && (
                    <span className="absolute -top-1.5 -end-1.5 min-w-5 h-5 rounded-full bg-saffron text-espresso text-[11px] font-bold flex items-center justify-center px-1 tabular">
                      {count}
                    </span>
                  )}
                </button>
              </SheetTrigger>
              <CartDrawer
                slug={slug}
                data={data}
                onCheckout={() => setCartOpen(false)}
                onClearIfOther={() => useCart.getState().clear()}
              />
            </Sheet>
          </div>
        </div>

        {/* Search + categories strip */}
        <div className="bg-background/92 backdrop-blur-md border-b border-border/70">
          <div className="mx-auto max-w-4xl px-4 py-2.5 space-y-2.5">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث في المنتجات..."
                aria-label="ابحث في المنتجات"
                className="w-full h-10 rounded-xl border border-input bg-card ps-9 pe-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-orange"
              />
              {q && (
                <button onClick={() => setQ("")} className="absolute end-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted" aria-label="مسح البحث">
                  <X className="size-3.5 text-muted-foreground" aria-hidden="true" />
                </button>
              )}
            </div>
            {categoriesWithProducts.length > 0 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5" role="tablist" aria-label="أقسام المنتجات">
                <button
                  role="tab"
                  aria-selected={activeCategory === "ALL"}
                  onClick={() => setActiveCategory("ALL")}
                  className={`shrink-0 rounded-full h-10 px-4 text-xs font-semibold transition-colors ${
                    activeCategory === "ALL" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  الكل
                </button>
                {categoriesWithProducts.map((c) => (
                  <button
                    key={c.id}
                    role="tab"
                    aria-selected={activeCategory === c.id}
                    onClick={() => setActiveCategory(c.id)}
                    className={`shrink-0 rounded-full h-10 px-4 text-xs font-semibold transition-colors ${
                      activeCategory === c.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Menu */}
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-5">
        {data.business.description && activeCategory === "ALL" && !q && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-5 text-center max-w-lg mx-auto">
            {data.business.description}
          </p>
        )}

        {visibleProducts.length === 0 ? (
          <EmptyState
            icon={Package}
            title={q ? "لا نتائج لبحثك" : "لا منتجات متاحة حالياً"}
            description={q ? "جرّب كلمة أخرى أو تصفح كل الأقسام" : "أعد المحاولة لاحقاً — المتجر يجهز منتجاته"}
          />
        ) : (
          <>
            {featured.length > 0 && (
              <section aria-label="منتجات مميزة" className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="font-heading font-bold text-sm">مميز</h2>
                  <Badge className="bg-saffron/15 text-accent-foreground border-saffron/30 text-[11px]">اختيار المتجر</Badge>
                </div>
                <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
                  {featured.map((p) => (
                    <ProductCard key={p.id} product={p} slug={slug} businessName={data.business.name} />
                  ))}
                </div>
              </section>
            )}
            <section aria-label="قائمة المنتجات">
              {regular.length > 0 && (
                <h2 className="font-heading font-bold text-sm mb-3">كل المنتجات</h2>
              )}
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
                {regular.map((p) => (
                  <ProductCard key={p.id} product={p} slug={slug} businessName={data.business.name} />
                ))}
              </div>
            </section>
          </>
        )}

        {data.business.receiptFooter && (
          <p className="mt-10 text-center text-xs text-muted-foreground">{data.business.receiptFooter}</p>
        )}
        <p className="mt-3 text-center text-xs text-muted-foreground">
          متجر رقمي بواسطة <a href="/" className="hover:text-primary">سمارت أوردر</a>
        </p>
      </main>

      {/* Sticky cart bar (mobile) */}
      {count > 0 && (
        <div className="lg:hidden sticky bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md safe-bottom">
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground tabular">{count} عنصر في السلة</div>
              <div className="font-bold text-sm tabular nums">{formatLyd(cartEstimatedSubtotal(items))}</div>
            </div>
            <Button onClick={() => setCartOpen(true)} className="font-semibold">
              <ShoppingBag className="size-4 me-1.5" aria-hidden="true" />
              عرض السلة
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
