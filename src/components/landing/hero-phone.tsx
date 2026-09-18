"use client";

import { m } from "motion/react";
import { MessageCircle, TrendingUp, ShoppingBag, Check, Flame } from "lucide-react";
import { IPhoneMockup } from "@/components/ui/iphone-mockup";
import { springDefault } from "@/lib/motion";

/**
 * HeroPhone — the Smart Order "order moment": a phone mockup running the
 * storefront UI (family twin of the Smart Menu WhatsApp-moment hero), with
 * floating glass-strong proof cards (new-order ticket + monthly growth).
 */

/** The mini storefront rendered inside the phone screen. */
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
        <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[8px] font-bold text-success">مفتوح</span>
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

      {/* Product rows */}
      <div className="flex-1 space-y-2 overflow-hidden px-3 py-2.5">
        {[
          { name: "بيتزا مارغريتا", price: "45.00", tag: "الأكثر طلباً" },
          { name: "برجر دجاج كبير", price: "23.50", tag: "" },
          { name: "عصير برتقال طازج", price: "9.00", tag: "" },
          { name: "بطاطس بالجبنة", price: "12.00", tag: "" },
        ].map((p) => (
          <div key={p.name} className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-card p-2">
            <div className="size-11 shrink-0 rounded-lg bg-gradient-to-br from-accent-foreground/15 to-accent-foreground/5" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <div className="truncate text-[10px] font-bold text-foreground">{p.name}</div>
                {p.tag && (
                  <span className="flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[7px] font-bold text-primary-foreground">
                    <Flame className="size-1.5" aria-hidden="true" />
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
              109.00 د.ل
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

export function HeroPhone() {
  return (
    <div className="relative w-full max-w-[240px] sm:max-w-[280px] md:max-w-[300px] lg:max-w-[320px]">
      {/* QR-corner signature — the scan → order moment anchors the hero */}
      <div aria-hidden="true" className="absolute -top-4 end-[4%] sm:end-[12%] md:end-[16%] -z-10 opacity-90">
        <svg width="84" height="84" viewBox="0 0 84 84" fill="none" className="opacity-25 blur-[1px]">
          <rect x="8" y="8" width="26" height="26" rx="6" stroke="currentColor" strokeWidth="3" className="text-accent-foreground" />
          <rect x="15" y="15" width="12" height="12" fill="currentColor" className="text-accent-foreground" />
          <rect x="50" y="8" width="26" height="26" rx="6" stroke="currentColor" strokeWidth="3" className="text-accent-foreground" />
          <rect x="57" y="15" width="12" height="12" fill="currentColor" className="text-accent-foreground" />
          <rect x="8" y="50" width="26" height="26" rx="6" stroke="currentColor" strokeWidth="3" className="text-accent-foreground" />
          <rect x="15" y="57" width="12" height="12" fill="currentColor" className="text-accent-foreground" />
          <rect x="50" y="50" width="10" height="10" fill="currentColor" className="text-accent-foreground/60" />
          <rect x="64" y="64" width="10" height="10" fill="currentColor" className="text-accent-foreground/60" />
          <rect x="50" y="64" width="10" height="10" fill="currentColor" className="text-accent-foreground/30" />
        </svg>
      </div>

      {/* The phone recedes slightly under scroll (family scroll-craft) */}
      <IPhoneMockup model="15-pro" color="natural-titanium" screenBg="var(--background)" className="w-full">
        <StorefrontMiniUI />
      </IPhoneMockup>

      {/* Order ticket — the WhatsApp handoff, itemized like a real till receipt */}
      <m.div
        initial={{ opacity: 0, y: 14, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.55, ...springDefault }}
        className="absolute top-5 -start-2 z-10 sm:-start-5 md:-start-8"
      >
        <div className="animate-float-slow">
          <div className="glass-strong flex flex-col gap-2 rounded-2xl px-3.5 py-3 shadow-xl">
            <div className="flex items-center gap-2.5">
              <div className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-whatsapp/15">
                <MessageCircle className="size-4 text-whatsapp" aria-hidden="true" />
                <span className="absolute -top-0.5 -end-0.5 size-2.5 rounded-full bg-whatsapp ring-2 ring-background" />
              </div>
              <div className="text-start">
                <p className="text-xs font-bold leading-tight text-foreground">طلب جديد وصل</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">عبر المتجر الرقمي</p>
              </div>
            </div>
            <div className="animate-ticket-drop flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-background/70 px-3 py-1.5">
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-whatsapp" />
                <span className="text-[10px] font-bold text-foreground">بيتزا مارغريتا ×2</span>
              </div>
              <span className="text-[10px] font-bold text-ember dark:text-saffron" dir="ltr">
                32.00 د.ل
              </span>
            </div>
          </div>
        </div>
      </m.div>

      {/* Monthly growth — retail numerals, LTR */}
      <m.div
        initial={{ opacity: 0, y: 14, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.75, ...springDefault }}
        className="absolute bottom-24 -end-2 z-10 sm:-end-5 md:-end-8"
      >
        <div className="animate-float-slow [animation-delay:1.5s]">
          <div className="glass-strong flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 shadow-xl">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-foreground/15">
              <TrendingUp className="size-4 text-accent-foreground" aria-hidden="true" />
            </div>
            <div className="text-start">
              <p className="text-sm font-bold leading-none text-foreground" dir="ltr">
                +32%
              </p>
              <p className="mt-1 text-[10px] whitespace-nowrap text-muted-foreground">نمو الطلبات الشهرية</p>
            </div>
          </div>
        </div>
      </m.div>

      {/* Verified order chip — family verification motif */}
      <m.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.95, ...springDefault }}
        className="absolute bottom-6 -start-1 z-10 sm:-start-4"
      >
        <div className="animate-float-slow [animation-delay:2.5s]">
          <div className="glass-strong flex items-center gap-2 rounded-full px-3 py-1.5 shadow-lg">
            <span className="flex size-6 items-center justify-center rounded-full bg-success/20">
              <Check className="size-3.5 text-success" aria-hidden="true" />
            </span>
            <span className="text-[10px] font-bold text-foreground">تم تأكيد الدفع · ليبيانا</span>
          </div>
        </div>
      </m.div>
    </div>
  );
}
