"use client";

import { m } from "motion/react";
import {
  MessageCircle,
  ShoppingBag,
  Banknote,
  Smartphone,
  MapPin,
  Plus,
  Store as StoreIcon,
} from "lucide-react";
import { IPhoneMockup } from "@/components/ui/iphone-mockup";
import { DemoProductArt } from "@/components/landing/demo-product-art";
import { formatLyd } from "@/lib/money";
import { countedArabicPhrase } from "@/lib/arabic-plural";
import { springDefault } from "@/lib/motion";

/* ═══════════════════════════════════════════════════════════════════════
   W21 Wave 6 — StorefrontScene rebuilt as the balanced triptych.
   ─────────────────────────────────────────────────────────────────────
   The phone IS the storefront: the screen runs the shipped storefront
   vocabulary (header, category strip, product rows with real-looking
   art + د.ل prices, cart bar with the WhatsApp send). The QR plate and
   the customer cart live in their OWN grid columns beside the phone —
   nothing floats over the screen anymore (the old absolute-positioned
   panels obscured the very product they were selling).

   Demo data is SEEDED truth, not invention: names, descriptions, prices
   and featured flags are verbatim from the demo-store seed universe
   (scripts/e2e-seed.mjs ≡ /api/seed ≡ scripts/seed-family.js), and the
   cart card renders the SAME demo order chapter 03 (DashboardSection)
   consoles — 2× بيتزا مارغريتا + 2× عصير برتقال, the real seeded وسط
   المدينة zone fee — one order, one story, both chapters.
   ═══════════════════════════════════════════════════════════════════════ */

/** The seeded demo-store catalog (e2e-seed / /api/seed — 6 products);
 * the phone screen crops to the first four rows, the count chip tells
 * the whole truth. */
const DEMO_STORE_PRODUCT_COUNT = 6;

/** Category strip = the seeded categories (بيتزا / برجر / مشروبات) with
 * the storefront's الكل default — idle round pills, the active one
 * franked (the filter-pills stamp grammar). */
const DEMO_CATEGORIES = ["الكل", "بيتزا", "برجر", "مشروبات"] as const;

/** Product rows — names/descriptions/prices/featured verbatim from the
 * seed; the art is the deterministic DemoProductArt illustration. */
const DEMO_PRODUCTS = [
  { key: "p1", name: "بيتزا مارغريتا", desc: "صوص طماطم، موزاريلا، ريحان طازج", price: 45_000, art: "pizza" as const, featured: true },
  { key: "p2", name: "برجر لحم كلاسيك", desc: "لحم طازج على الفحم", price: 28_000, art: "burger-beef" as const, featured: true },
  { key: "p3", name: "برجر دجاج كبير", desc: "صدر دجاج مقرمش مع صوص خاص", price: 23_500, art: "burger-chicken" as const, featured: false },
  { key: "p4", name: "عصير برتقال طازج", desc: "برتقال طبيعي 100٪", price: 9_000, art: "juice" as const, featured: false },
];

/** The customer cart — the SAME demo order the merchant console renders
 * (chapter 03), delivery fee included (the real seeded وسط المدينة
 * zone: 5 د.ل). Every figure below is computed, never typed. */
const CART_ITEMS = [
  { name: "بيتزا مارغريتا", qty: 2, unitPrice: 45_000 },
  { name: "عصير برتقال طازج", qty: 2, unitPrice: 9_000 },
];
const DELIVERY = { zone: "وسط المدينة", fee: 5_000 };

/** The mini storefront rendered inside the phone screen — the shipped
 * storefront vocabulary: header, category strip, product rows with the
 * mono price-chip grammar, and the cart bar with the WhatsApp send. */
function StorefrontMiniUI() {
  const subtotal = CART_ITEMS.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
  const count = CART_ITEMS.reduce((sum, it) => sum + it.qty, 0);

  return (
    <div className="flex h-full flex-col bg-background" dir="rtl">
      {/* Store header — the shipped storefront header anatomy:
          logo tile, name + city, open stamp, cart with the saffron count. */}
      <div className="flex items-center gap-2 border-b border-border/60 bg-card px-3 pb-2 pt-1.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-accent-foreground">
          <StoreIcon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-bold leading-tight text-foreground">مخبز الواحة</div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">طرابلس</span>
          </div>
        </div>
        <span className="shrink-0 rounded-sm border border-(--c-mint-ink)/35 bg-(--c-mint-bg) px-1.5 py-0.5 text-[10px] font-bold text-(--c-mint-deep)">
          مفتوح
        </span>
        <span className="relative flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ShoppingBag className="size-4.5" aria-hidden="true" />
          <span className="absolute -top-1 -end-1 flex size-4.5 items-center justify-center rounded-full bg-saffron text-[10px] font-bold tabular-nums text-espresso">
            {count}
          </span>
        </span>
      </div>

      {/* Category strip — idle round pills, the active one squared
          (franked stamp — the filter-pills grammar). */}
      <div className="flex gap-1.5 overflow-hidden border-b border-border/40 px-3 py-2">
        {DEMO_CATEGORIES.map((c, i) => (
          <span
            key={c}
            className={
              i === 0
                ? "rounded-sm border border-(--c-copper-ink)/35 bg-(--c-copper-bg) px-2.5 py-1 text-[11px] font-bold text-(--c-copper-deep)"
                : "rounded-full border border-border/60 px-2.5 py-1 text-[11px] text-muted-foreground"
            }
          >
            {c}
          </span>
        ))}
      </div>

      {/* Chapter label + the live mono count chip (the storefront h2 row). */}
      <div className="flex items-center justify-between gap-2 px-3 pb-1 pt-2.5">
        <span className="text-[12px] font-bold text-foreground">كل المنتجات</span>
        <span className="rounded-sm border border-border/60 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums text-muted-foreground">
          {countedArabicPhrase(DEMO_STORE_PRODUCT_COUNT, "منتج", {
            one: "منتج واحد",
            two: "منتجان",
            few: "منتجات",
            many: "منتجاً",
          })}
        </span>
      </div>

      {/* Product rows — real-looking art tiles, name + desc, the mono
          price chip (rounded-sm, hairline, tabular digits), add button. */}
      <div className="flex-1 space-y-2 overflow-hidden px-3 py-2">
        {DEMO_PRODUCTS.map((p) => (
          <div key={p.key} className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-card p-2">
            <span className="relative block size-13 shrink-0 overflow-hidden rounded-lg">
              <DemoProductArt kind={p.art} className="size-full" />
              {p.featured && (
                <span className="absolute top-1 start-1 rounded-full bg-saffron/95 px-1.5 py-px text-[8px] font-bold text-espresso">
                  مميز
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold leading-snug text-foreground">{p.name}</div>
              <div className="truncate text-[10.5px] leading-snug text-muted-foreground">{p.desc}</div>
              <span
                className="mt-1 inline-flex items-center rounded-sm border border-border/70 bg-muted/50 px-1.5 py-0.5 font-mono text-[11.5px] font-bold tabular-nums text-foreground"
                dir="ltr"
              >
                {formatLyd(p.price)}
              </span>
            </div>
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"
              aria-hidden="true"
            >
              <Plus className="size-4.5" />
            </span>
          </div>
        ))}
      </div>

      {/* Cart bar — the subtotal (computed) + the WhatsApp send. */}
      <div className="border-t border-border/60 bg-card px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] text-muted-foreground">
              سلة الزبون ·{" "}
              {countedArabicPhrase(count, "عنصر", {
                one: "عنصر واحد",
                two: "عنصران",
                few: "عناصر",
                many: "عنصراً",
              })}
            </div>
            <div className="font-mono text-[14px] font-bold tabular-nums text-foreground" dir="ltr">
              {formatLyd(subtotal)}
            </div>
          </div>
          <span className="whatsapp-btn flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-[11.5px] font-bold">
            <MessageCircle className="size-4" aria-hidden="true" />
            إرسال الطلب
          </span>
        </div>
      </div>
    </div>
  );
}

/** Decorative QR motif — the scan-to-order moment (the store URL beside
 * it is the real content; the QR is drawn, aria-hidden). */
function QrPlate() {
  return (
    <svg viewBox="0 0 84 84" fill="none" className="size-full" aria-hidden="true">
      <rect x="8" y="8" width="26" height="26" rx="6" stroke="currentColor" strokeWidth="3" />
      <rect x="15" y="15" width="12" height="12" fill="currentColor" />
      <rect x="50" y="8" width="26" height="26" rx="6" stroke="currentColor" strokeWidth="3" />
      <rect x="57" y="15" width="12" height="12" fill="currentColor" />
      <rect x="8" y="50" width="26" height="26" rx="6" stroke="currentColor" strokeWidth="3" />
      <rect x="15" y="57" width="12" height="12" fill="currentColor" />
      <rect x="42" y="42" width="7" height="7" fill="currentColor" />
      <rect x="53" y="45" width="6" height="6" fill="currentColor" opacity="0.75" />
      <rect x="63" y="42" width="7" height="7" fill="currentColor" opacity="0.45" />
      <rect x="45" y="55" width="6" height="6" fill="currentColor" opacity="0.75" />
      <rect x="56" y="56" width="7" height="7" fill="currentColor" />
      <rect x="68" y="55" width="6" height="6" fill="currentColor" opacity="0.45" />
      <rect x="42" y="66" width="7" height="7" fill="currentColor" opacity="0.45" />
      <rect x="54" y="68" width="6" height="6" fill="currentColor" opacity="0.75" />
      <rect x="66" y="66" width="7" height="7" fill="currentColor" opacity="0.3" />
      <rect x="50" y="50" width="3" height="3" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

export function StorefrontScene() {
  const total =
    CART_ITEMS.reduce((sum, it) => sum + it.qty * it.unitPrice, 0) + DELIVERY.fee;

  return (
    <div className="ln-store-scene">
      {/* the phone — the storefront itself (center column) */}
      <m.div
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ ...springDefault }}
        className="ln-store-phone"
      >
        <IPhoneMockup model="15-pro" color="natural-titanium" screenBg="var(--background)" className="w-full">
          <StorefrontMiniUI />
        </IPhoneMockup>
      </m.div>

      {/* the QR plate — scan → store. Its own grid column beside the
          phone (P12-2d-2 flat editorial plate), pointing at the REAL
          demo-store URL the section CTA opens. */}
      <m.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ delay: 0.15, ...springDefault }}
        className="ln-store-qr"
      >
        <div className="animate-float-slow">
          <div className="ln-plate flex flex-col items-center gap-3 p-4">
            <div className="ln-store-qr-frame" aria-hidden="true">
              <QrPlate />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-bold text-foreground">امسح واطلب</p>
              <p className="ln-mono mt-1.5 text-[10px] leading-relaxed" dir="ltr">
                <span className="block">order.smart-link.ly</span>
                <span className="block">/store/demo-store</span>
              </p>
            </div>
          </div>
        </div>
      </m.div>

      {/* the customer cart — a detached card in its own column (never
          over the phone): the same demo order chapter 03 consoles, with
          the receipt grammar (items → dashed route divider → fee →
          total) and the real local payment methods. */}
      <m.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ delay: 0.3, ...springDefault }}
        className="ln-store-cart"
      >
        <div className="animate-float-slow [animation-delay:1.6s]">
          <div className="ln-plate p-4">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-foreground/10">
                <ShoppingBag className="size-4 text-accent-foreground" aria-hidden="true" />
              </span>
              <div className="text-start">
                <p className="text-[13px] font-bold leading-tight text-foreground">سلة الزبون</p>
                <p className="mt-0.5 text-[10.5px] text-muted-foreground">بُنيت من المتجر مباشرة</p>
              </div>
            </div>

            <ul className="mt-3 space-y-1.5">
              {CART_ITEMS.map((it) => (
                <li
                  key={it.name}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-background/70 px-2.5 py-1.5"
                >
                  <span className="truncate text-[11.5px] font-bold text-foreground">
                    {it.name} ×{it.qty}
                  </span>
                  <span
                    className="shrink-0 font-mono text-[11.5px] font-bold tabular-nums text-accent-foreground"
                    dir="ltr"
                  >
                    {formatLyd(it.qty * it.unitPrice)}
                  </span>
                </li>
              ))}
            </ul>

            {/* receipt tail — the dashed route divider, then fee + total */}
            <div className="mt-2.5 space-y-1 border-t border-dashed border-border/70 pt-2.5">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[11px] text-muted-foreground">التوصيل · {DELIVERY.zone}</span>
                <span className="font-mono text-[11px] font-medium tabular-nums text-muted-foreground" dir="ltr">
                  {formatLyd(DELIVERY.fee)}
                </span>
              </div>
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[12px] font-bold text-foreground">الإجمالي</span>
                <span className="font-mono text-[13px] font-bold tabular-nums text-foreground" dir="ltr">
                  {formatLyd(total)}
                </span>
              </div>
            </div>

            {/* the real local payment methods, as the storefront offers them */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-1 text-[10px] font-bold text-success-ink">
                <Banknote className="size-3" aria-hidden="true" />
                الدفع عند التوصيل
              </span>
              <span className="flex items-center gap-1 rounded-full bg-info/15 px-2 py-1 text-[10px] font-bold text-info-ink">
                <Smartphone className="size-3" aria-hidden="true" />
                مدار
              </span>
              <span className="flex items-center gap-1 rounded-full bg-info/15 px-2 py-1 text-[10px] font-bold text-info-ink">
                <Smartphone className="size-3" aria-hidden="true" />
                ليبيانا
              </span>
            </div>

            {/* the WhatsApp intake — the order reaching the merchant
                (was a floating chip; now the cart's own footer line). */}
            <div className="mt-3 flex items-center gap-2 border-t border-border/50 pt-2.5">
              <span className="relative flex size-6 shrink-0 items-center justify-center rounded-full bg-whatsapp/15">
                <MessageCircle className="size-3.5 text-whatsapp" aria-hidden="true" />
                <span className="absolute -top-0.5 -end-0.5 size-2 rounded-full bg-whatsapp ring-2 ring-(--ln-ink-2)" />
              </span>
              <span className="text-[11px] font-bold text-foreground">الطلب يصل التاجر فوراً</span>
            </div>
          </div>
        </div>
      </m.div>
    </div>
  );
}
