import { Button } from "@/components/ui/button";
import { formatLyd } from "@/lib/money";
import { Loader2 } from "lucide-react";
import type { StoreData } from "./types";

/** 17-DEBT-SO: sticky total bar extracted verbatim from
 * checkout-client.tsx — estimated-total honesty (r140 P3-11) and the
 * type=submit + form= contract (r131-F2 P0-1) unchanged.
 * P18-W2-d (W1-d #8): the DISABLED button explains itself — a disabled
 * CTA with no reason is a dead end on the money path. The two real
 * reasons surface as a quiet warning micro-line (never a toast: a
 * disabled button can't fire one), and the reason is honest state, not
 * fabricated urgency. */
export function StickySubmitBar({
  data,
  subtotal,
  deliveryFee,
  total,
  submitting,
  minOrderUnmet,
  minOrderAmount,
}: {
  data: StoreData | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  submitting: boolean;
  minOrderUnmet: boolean;
  /** the active zone's real minimum (millimes) — drives the honest
   * disabled reason; absent on pickup. */
  minOrderAmount?: number;
}) {
  const disabled = submitting || minOrderUnmet || !data;
  return (
    <div className="fixed bottom-0 inset-x-0 z-(--z-dropdown) border-t border-border bg-background/95 backdrop-blur-md safe-bottom">
      <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          {/* r140 (P3-11): صدق مالي — هذا تقدير عميل (الخادم يعيد
              التسعير عند الإرسال)؛ السلة نفسها تقول «المجموع التقديري»
              (cart-drawer) فالشريط يطابقها بدل «الإجمالي» المطلق.
              P6-2-f3 (GROUP 1): كل أرقام المال هنا Mono. */}
          <div className="text-[11px] text-muted-foreground font-mono tabular-nums truncate">
            الإجمالي التقديري{deliveryFee > 0 ? ` — المنتجات ${formatLyd(subtotal)} + توصيل ${formatLyd(deliveryFee)}` : ""}
          </div>
          <div className="font-mono font-bold text-lg tabular-nums">{formatLyd(total)}</div>
          {/* P18-W2-d: disabled-explain — the real blocker, in the family
              warning voice, quiet (role=status so AT users hear it too). */}
          {disabled && !submitting && (
            <p role="status" className="mt-1 text-[11px] font-medium text-warning-ink truncate">
              {minOrderUnmet
                ? minOrderAmount
                  ? `الحد الأدنى للطلب ${formatLyd(minOrderAmount)} — أضف منتجات لتفعيل الإرسال`
                  : "الحد الأدنى للطلب غير مستوٍ بعد"
                : "بانتظار تحميل بيانات المتجر…"}
            </p>
          )}
        </div>
        {/* r131-F2 (P0-1): type=submit + form= — the sticky bar stays
            outside <main> yet submits the real checkout form (Enter works
            from every field). size=lg is the canonical 48px money CTA
            rung (r134: lg = h-12; the r150 wave unified the checkout
            money CTAs — sticky bar, success screen, cart drawer — on
            this ONE spelling). */}
        <Button
          type="submit"
          form="checkout-form"
          size="lg"
          disabled={submitting || minOrderUnmet || !data}
          className="w-full sm:w-auto"
        >
          {submitting ? (
            <>
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              جارٍ الإرسال…
            </>
          ) : (
            "إرسال الطلب"
          )}
        </Button>
      </div>
    </div>
  );
}
