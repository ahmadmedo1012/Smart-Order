import { formatLyd } from "@/lib/money";
import { countedArabicPhrase } from "@/lib/arabic-plural";
import { useCart } from "@/hooks/use-cart";
import type { CartEvaluation } from "@/lib/checkout-refresh";
import { StickyNote, RefreshCw, CircleOff } from "lucide-react";

/** 17-DEBT-SO: items summary extracted verbatim from checkout-client.tsx.
 * The cart item type is derived from the zustand store — no changes to
 * the shared hook file.
 *
 * W2-ORD-2 (P42-W3، تدقيق 3c): الملخص كان يعرض تقديرات الإضافة القديمة
 * (unitPrice المخزّنة) — أسعار المتجر الحيّة تصل في نفس استجابة التحميل،
 * فالأسطر تُسعّر الآن بها: المتغيّر يوسَم «تحديث السعر»، وغير المتاح
 * يعلن بصراحة ويُستثنى من الإجمالي (الإرسال نفسه يُمنع في الجذر). */
type CartItems = ReturnType<typeof useCart.getState>["items"];

export function CartSummarySection({ items, evaluation }: { items: CartItems; evaluation: CartEvaluation }) {
  const lineByKey = new Map(evaluation.lines.map((l) => [l.key, l]));
  return (
    <section className="mt-3 rounded-xl border border-border bg-card p-4">
      <h2 className="font-semibold text-sm mb-3">
        {/* W7-G: العدّة القوسية تركب محرك الجمع — «عنصران» بدل «2 عنصر» */}
        ملخص السلة <span className="text-muted-foreground font-normal">({countedArabicPhrase(items.length, "عنصر", { one: "عنصر واحد", two: "عنصران", few: "عناصر", many: "عنصراً" })})</span>
      </h2>
      {evaluation.hasPriceChanges && (
        <p className="mb-3 flex items-start gap-1.5 rounded-lg border border-(--c-yellow-ink)/30 bg-(--c-yellow-bg) px-3 py-2 text-xs text-(--c-yellow-deep)" role="status">
          <RefreshCw className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          تحدّثت أسعار بعض الأصناف منذ إضافتها — المبالغ أدناه بالأسعار الحالية.
        </p>
      )}
      <ul className="space-y-2.5">
        {items.map((i) => {
          const line = lineByKey.get(i.key);
          const unavailable = line?.unavailable ?? false;
          const changed = line?.priceChanged ?? false;
          const unit = line?.currentUnitPrice ?? i.unitPrice;
          return (
            <li key={i.key} className={`flex items-start justify-between gap-3 text-sm ${unavailable ? "opacity-70" : ""}`}>
              <div className="min-w-0">
                <span className="font-mono tabular-nums text-muted-foreground">{i.quantity}×</span>{" "}
                <span className="font-medium">{i.productName}</span>
                {i.variantName && <span className="text-muted-foreground text-xs"> — {i.variantName}</span>}
                {i.options.length > 0 && (
                  <div className="text-[11px] text-muted-foreground mt-0.5">{i.options.map((o) => o.name).join("، ")}</div>
                )}
                {i.note && (
                  <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <StickyNote className="size-3 shrink-0" aria-hidden="true" />
                    {i.note}
                  </div>
                )}
                {/* W2-ORD-2: وسم الصدق لكل سطر — تحديث السعر أو عدم التوفر */}
                {unavailable && (
                  <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-destructive-ink">
                    <CircleOff className="size-3 shrink-0" aria-hidden="true" />
                    غير متاح حالياً — أزِل هذا الصنف من السلة لإتمام الطلب
                  </div>
                )}
                {changed && !unavailable && (
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-(--c-yellow-deep)">
                    <RefreshCw className="size-3 shrink-0" aria-hidden="true" />
                    تحديث السعر
                  </div>
                )}
              </div>
              {/* P6-2-f3 (GROUP 1): money figures ride IBM Plex Mono
                  (mixed-script stack — Latin/digits mono, Arabic sans) */}
              {unavailable ? (
                <span className="shrink-0 font-mono text-sm text-muted-foreground">—</span>
              ) : (
                <span className="font-mono tabular-nums font-medium shrink-0">{formatLyd(unit * i.quantity)}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
