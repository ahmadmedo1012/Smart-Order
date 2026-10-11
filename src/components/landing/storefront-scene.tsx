"use client";

import { m } from "motion/react";
import { MessageCircle, ShoppingBag, Banknote, Smartphone } from "lucide-react";
import { IPhoneMockup } from "@/components/ui/iphone-mockup";
import { springDefault } from "@/lib/motion";

/* r142 «الخط» — StorefrontScene: chapter 02 «متجر يعمل فوراً».
 * The hero-phone composition evolved into the storefront chapter: the
 * phone runs the REAL storefront UI (categories, product cards with
 * د.ل prices, the cart bar and the WhatsApp send — the shipped
 * storefront + WhatsApp intake), flanked by the scan-to-order QR plate
 * and the customer cart card with the real local payment methods.
 * Entrances ride the global MotionConfig (reducedMotion="user"); the
 * idle floats are CSS and die under the global RM block. */

/** The mini storefront rendered inside the phone screen — the shipped
 * storefront vocabulary: category strip, product rows, cart bar. */
function StorefrontMiniUI() {
  return (
    <div className="flex h-full flex-col bg-background" dir="rtl">
      {/* Store header */}
      <div className="flex items-center gap-2 border-b border-border/60 bg-card px-3 pb-2 pt-1">
        <span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-[10px] font-black text-accent-foreground">
          SO
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-bold text-foreground">مخبز الواحة</div>
          <div className="text-[9px] text-muted-foreground">طرابلس · توصيل</div>
        </div>
        <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[8px] font-bold text-success-ink">مفتوح</span>
      </div>

      {/* Category strip */}
      <div className="flex gap-1.5 overflow-hidden border-b border-border/40 px-3 py-2">
        {["الكامل", "برجر", "بيتزا", "حلويات"].map((c, i) => (
          <span
            key={c}
            className={
              i === 0
                ? "rounded-full bg-primary px-2.5 py-1 text-[9px] font-bold text-primary-foreground"
                : "rounded-full border border-border/50 px-2.5 py-1 text-[9px] text-muted-foreground"
            }
          >
            {c}
          </span>
        ))}
      </div>

      {/* Product rows — prices ride the r138 clean-dinar seam (formatLyd
          contract, CLAUDE.md:69-72): whole dinars clean, fractions at the
          3-decimal dirham precision — matching the dashboard mock beside it. */}
      <div className="flex-1 space-y-2 overflow-hidden px-3 py-2.5">
        {[
          { name: "بيتزا مارغريتا", price: "45", tag: "الأكثر طلباً" },
          { name: "برجر دجاج كبير", price: "23.500", tag: "" },
          { name: "عصير برتقال طازج", price: "9", tag: "" },
          { name: "بطاطس بالجبنة", price: "12", tag: "" },
        ].map((p) => (
          <div key={p.name} className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-card p-2">
            <div className="size-11 shrink-0 rounded-lg bg-gradient-to-br from-accent-foreground/15 to-accent-foreground/5" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <div className="truncate text-[10px] font-bold text-foreground">{p.name}</div>
                {p.tag && (
                  <span className="flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[7px] font-bold text-primary-foreground">
                    {p.tag}
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[9px] font-bold text-accent-foreground" dir="ltr">
                {p.price} د.ل
              </div>
            </div>
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ShoppingBag className="size-3" aria-hidden="true" />
            </span>
          </div>
        ))}
      </div>

      {/* Cart bar */}
      <div className="border-t border-border/60 bg-card/95 px-3 py-2.5 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[8px] text-muted-foreground">الإجمالي</div>
            <div className="text-[11px] font-black tabular-nums text-foreground" dir="ltr">
              108 د.ل
            </div>
          </div>
          <span className="whatsapp-btn flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[10px] font-bold">
            <MessageCircle className="size-3" aria-hidden="true" />
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
      <rect x="50" y="50" width="10" height="10" fill="currentColor" opacity="0.6" />
      <rect x="64" y="64" width="10" height="10" fill="currentColor" opacity="0.6" />
      <rect x="50" y="64" width="10" height="10" fill="currentColor" opacity="0.3" />
      <rect x="64" y="50" width="10" height="10" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

export function StorefrontScene() {
  return (
    <div className="ln-store-scene">
      {/* the phone — the storefront itself */}
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

      {/* the QR plate — scan → store */}
      <m.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ delay: 0.15, ...springDefault }}
        className="ln-store-qr"
      >
        <div className="animate-float-slow">
          <div className="glass-strong flex flex-col gap-2.5 rounded-2xl p-4 shadow-xl">
            <div className="ln-store-qr-frame" aria-hidden="true">
              <QrPlate />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-foreground">امسح واطلب</p>
              <p className="ln-mono mt-1 text-[10px] leading-relaxed" dir="ltr">
                order.smart-link.ly/store/…
              </p>
            </div>
          </div>
        </div>
      </m.div>

      {/* the customer cart — the order being built */}
      <m.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ delay: 0.3, ...springDefault }}
        className="ln-store-cart"
      >
        <div className="animate-float-slow [animation-delay:1.6s]">
          <div className="glass-strong flex flex-col gap-3 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-accent-foreground/15">
                <ShoppingBag className="size-4 text-accent-foreground" aria-hidden="true" />
              </span>
              <div className="text-start">
                <p className="text-xs font-bold leading-tight text-foreground">سلة الزبون</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">بُنيت من المتجر مباشرة</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-background/70 px-3 py-1.5">
              <span className="text-[10px] font-bold text-foreground">بيتزا مارغريتا ×2</span>
              <span className="text-[10px] font-bold text-accent-foreground" dir="ltr">
                90 د.ل
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-background/70 px-3 py-1.5">
              <span className="text-[10px] font-bold text-foreground">عصير برتقال ×2</span>
              <span className="text-[10px] font-bold text-accent-foreground" dir="ltr">
                18 د.ل
              </span>
            </div>
            {/* the real local payment methods, as the storefront offers them */}
            <div className="flex flex-wrap gap-1.5">
              <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-1 text-[9px] font-bold text-success-ink">
                <Banknote className="size-2.5" aria-hidden="true" />
                نقداً عند الاستلام
              </span>
              <span className="flex items-center gap-1 rounded-full bg-info/15 px-2 py-1 text-[9px] font-bold text-info-ink">
                <Smartphone className="size-2.5" aria-hidden="true" />
                مدار
              </span>
              <span className="flex items-center gap-1 rounded-full bg-info/15 px-2 py-1 text-[9px] font-bold text-info-ink">
                <Smartphone className="size-2.5" aria-hidden="true" />
                ليبيانا
              </span>
            </div>
          </div>
        </div>
      </m.div>

      {/* the WhatsApp intake chip — the order reaching the merchant */}
      <m.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ delay: 0.45, ...springDefault }}
        className="ln-store-wa"
      >
        <div className="glass-strong flex items-center gap-2 rounded-full px-3 py-1.5 shadow-lg">
          <span className="relative flex size-6 items-center justify-center rounded-full bg-whatsapp/15">
            <MessageCircle className="size-3.5 text-whatsapp" aria-hidden="true" />
            <span className="absolute -top-0.5 -end-0.5 size-2 rounded-full bg-whatsapp ring-2 ring-background" />
          </span>
          <span className="text-[10px] font-bold text-foreground">الطلب يصل التاجر فوراً</span>
        </div>
      </m.div>
    </div>
  );
}
