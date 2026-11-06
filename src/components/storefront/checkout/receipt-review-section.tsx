import { formatLyd } from "@/lib/money";
import { FULFILLMENT_AR } from "@/lib/constants";
import { useCart } from "@/hooks/use-cart";
import type { CartEvaluation } from "@/lib/checkout-refresh";
import { ReceiptText, MapPin, Wallet, Store, Truck, TicketPercent } from "lucide-react";

/** P45-W1 (المبادرة A — تمديد): كتلة الإيصال الموحدة قبل الإرسال.
 *
 * فجوة التوزيع الموثقة في خط الأساس (P45-BASELINE §المبادرة A): ملخص
 * المال النهائي كان موزعاً — الأصناف في «ملخص السلة»، والمال الحي في
 * الشريط اللاصق، وطريقة الدفع في قسمها، والعنوان في قسمه — فلا توجد
 * لحظة مراجعة واحدة يقرأها الزبون قبل الضغط على «إرسال الطلب». هذه
 * الكتلة هي تلك اللحظة: أصناف×كميات (مع خيارات كل سطر) وإجماليات
 * الأسطر، المجموع، التوصيل، الخصم (بكوده)، الإجمالي، طريقة الدفع
 * المختارة، والعنوان (أو مؤشر الاستلام من الفرع) — في بلوك واحد.
 *
 * قانون التركيب (Composition only): كل القيم تُقرأ من use-checkout-state
 * كما هي — لا حساب مالّي جديد هنا إطلاقاً (نفس معادلة الخادم حرفياً:
 * المجموع + التوصيل − الخصم)، ونفس صدق «التقديري» الذي يتكلم به
 * الشريط اللاصق (الخادم يعيد التسعير عند الإرسال). المال عبر formatLyd
 * (مليم صحيح، لا فواصل عائمة أبداً) وكل الأرقام على IBM Plex Mono —
 * قانون رحلة المال في هذا المتجر. */
type CartItems = ReturnType<typeof useCart.getState>["items"];

export function ReceiptReviewSection({
  items,
  evaluation,
  subtotal,
  deliveryFee,
  discount,
  couponCode,
  total,
  paymentMethodName,
  fulfillment,
  zoneName,
  city,
  area,
  addressLine,
}: {
  items: CartItems;
  evaluation: CartEvaluation;
  /** القيم المشتقة من use-checkout-state كما هي — بلا إعادة احتساب. */
  subtotal: number;
  deliveryFee: number;
  discount: number;
  couponCode: string | null;
  total: number;
  paymentMethodName: string | null;
  fulfillment: "DELIVERY" | "PICKUP";
  zoneName: string | null;
  city: string;
  area: string;
  addressLine: string;
}) {
  const lineByKey = new Map(evaluation.lines.map((l) => [l.key, l]));
  /* العنوان كما سيقرأه السائق — أجزاؤه الموجودة فقط، بلا فواصل معلقة. */
  const addressParts = [city.trim(), area.trim(), addressLine.trim()].filter(Boolean);
  return (
    <section
      className="mt-3 rounded-xl border border-border bg-card p-4"
      aria-label="مراجعة الطلب قبل الإرسال — الأصناف والمبالغ وطريقة الدفع والعنوان في كتلة واحدة"
    >
      <h2 className="mb-3 flex items-center gap-1.5 font-semibold text-sm">
        <ReceiptText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        مراجعة طلبك قبل الإرسال
      </h2>

      {/* الأصناف × الكميات مع خيارات كل سطر وإجماليه — لقطة السلة الحية
          بنفس تقييم الأسعار (السعر الحالي، لا المخزّن). */}
      <ul className="space-y-2.5">
        {items.map((i) => {
          const line = lineByKey.get(i.key);
          const unavailable = line?.unavailable ?? false;
          const unit = line?.currentUnitPrice ?? i.unitPrice;
          return (
            <li
              key={i.key}
              className={`flex items-start justify-between gap-3 text-sm ${unavailable ? "opacity-70" : ""}`}
            >
              <div className="min-w-0">
                <span className="font-mono tabular-nums text-muted-foreground">{i.quantity}×</span>{" "}
                <span className="font-medium">{i.productName}</span>
                {i.variantName && <span className="text-muted-foreground text-xs"> — {i.variantName}</span>}
                {i.options.length > 0 && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {i.options.map((o) => o.name).join("، ")}
                  </div>
                )}
              </div>
              {unavailable ? (
                <span className="shrink-0 font-mono text-sm text-muted-foreground">—</span>
              ) : (
                <span className="shrink-0 font-mono tabular-nums font-medium">{formatLyd(unit * i.quantity)}</span>
              )}
            </li>
          );
        })}
      </ul>

      {/* سطور المال — نفس معادلة الخادم (المجموع + التوصيل − الخصم)،
          وكل الأرقام Mono. «تقديري» يبقى الصدق المعلن: الخادم يعيد
          التسعير عند الإرسال. */}
      <div className="mt-3 space-y-1.5 border-t border-dashed border-border pt-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">المنتجات</span>
          <span className="font-mono tabular-nums">{formatLyd(subtotal)}</span>
        </div>
        {fulfillment === "DELIVERY" && (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Truck className="size-3.5 shrink-0" aria-hidden="true" />
              التوصيل{zoneName ? ` — ${zoneName}` : ""}
            </span>
            <span className="font-mono tabular-nums">
              {deliveryFee > 0 ? formatLyd(deliveryFee) : "—"}
            </span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <TicketPercent className="size-3.5 shrink-0" aria-hidden="true" />
              الخصم{couponCode ? ` — كود ${couponCode}` : ""}
            </span>
            <span className="font-mono tabular-nums">−{formatLyd(discount)}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
          <span className="font-semibold">الإجمالي التقديري</span>
          <span className="font-mono font-bold tabular-nums">{formatLyd(total)}</span>
        </div>
      </div>

      {/* طريقة الدفع المختارة — الاسم التجاري الذي اختاره الزبون، أو
          الصدق إن لم يختر بعد (الإرسال يُمنع أصلاً بلا اختيار). */}
      <div className="mt-3 space-y-2 border-t border-dashed border-border pt-3 text-sm">
        <div className="flex items-start justify-between gap-3">
          <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
            <Wallet className="size-3.5 shrink-0" aria-hidden="true" />
            الدفع
          </span>
          <span className="text-end font-medium">
            {paymentMethodName ?? <span className="text-muted-foreground">لم تختر طريقة دفع بعد</span>}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            {FULFILLMENT_AR[fulfillment]}
          </span>
          {fulfillment === "PICKUP" ? (
            <span className="flex items-center gap-1.5 text-end font-medium">
              <Store className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              استلام من فرع المتجر
            </span>
          ) : addressParts.length > 0 ? (
            <span className="text-end leading-relaxed">{addressParts.join("، ")}</span>
          ) : (
            <span className="text-end text-muted-foreground">أدخل عنوانك أعلاه</span>
          )}
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        مراجعة أخيرة — يُعاد تسعير كل شيء من الخادم عند الإرسال، وأي كود
        خصم يُتحقق منه داخل معاملة الطلب نفسها.
      </p>
    </section>
  );
}
