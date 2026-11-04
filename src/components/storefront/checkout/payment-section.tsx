import type { Dispatch, SetStateAction } from "react";
import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/dashboard/form-field";
import { toast } from "sonner";
import { AnimatedCopy } from "@/components/ui/animated-icons";
import { libyanaUssdCode, madarUssdCode, WALLET_CAP_LYD } from "@/lib/payment-constants";
import { formatPhoneDisplay } from "@/lib/phone";
import { collectsPaymentReference, normalizePaymentReference, paymentReferenceError } from "@/lib/payment-reference";
import { Check, Coins, FileText } from "lucide-react";
import { paymentIcon } from "./payment-icon";
import type { FieldErrors, StoreData } from "./types";

type PaymentMethod = StoreData["paymentMethods"][number];
type PaymentConfig = { number?: string } | null;

/** 17-DEBT-SO: payment section extracted verbatim from checkout-client.tsx
 * — ProviderPicker tile geometry, transfer-number row, r134 USSD
 * quick-code with the wallet-cap gate, and the COD/transfer footnote.
 * The copy buttons keep their exact handlers.
 * P43 SO-2: طرق التحويل (تحويل يدوي/مدار/ليبيانا) تسأل الآن عن مرجع
 * التحويل الاختياري — رقم الإشعار الذي يقبل به التاجر تحويله عند
 * المصالحة (لا إثبات دفع: الحالة تبقى «غير مدفوع» حتى يقرر التاجر). */
export function PaymentSection({
  data,
  loadError,
  paymentMethodId,
  setPaymentMethodId,
  errors,
  setErrors,
  paymentMethod,
  paymentConfig,
  overWalletCap,
  total,
  storeWhatsapp,
  paymentReference,
  setPaymentReference,
}: {
  data: StoreData | null;
  loadError: boolean;
  paymentMethodId: string;
  setPaymentMethodId: Dispatch<SetStateAction<string>>;
  errors: FieldErrors;
  setErrors: Dispatch<SetStateAction<FieldErrors>>;
  paymentMethod: PaymentMethod | null;
  paymentConfig: PaymentConfig;
  overWalletCap: boolean;
  total: number;
  /* P42-2 (E-1): the store's WhatsApp (business.whatsappNumber) — the
     contact lifeline shown when zero payment methods are active. */
  storeWhatsapp?: string | null;
  /* P43 SO-2: مرجع التحويل — يظهر فقط لطرق التحويل. */
  paymentReference: string;
  setPaymentReference: Dispatch<SetStateAction<string>>;
}) {
  /* P43 SO-2: خطأ مرجع التحويل المحلي — يُمسح عند التعديل (نمط مسح
     أخطاء الحقول العائلي) ويُعاد التحقق عند الإرسال في الجذر. */
  const [payRefError, setPayRefError] = React.useState<string | null>(null);
  /* P18-W2-d (W1-d #8 — USSD copy feedback state): the copy action
     answers INLINE, not only via toast — the button flips to a franked
     ✓ «تم النسخ» state for ~2s (the same transient grammar the family
     AnimatedCopy answer uses). The 2s timer is display-only state; the
     clipboard write itself is awaited and its FAILURE surfaces (the
     transfer-number button used to fire-and-forget — no await, no
     catch, a silent dead copy on non-secure contexts). */
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const copyText = React.useCallback(
    async (key: string, text: string, okMsg: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedKey(key);
        window.setTimeout(() => {
          setCopiedKey((k) => (k === key ? null : k));
        }, 2_000);
        toast.success(okMsg);
      } catch {
        toast.error("تعذّر النسخ — انسخ الرقم يدوياً");
      }
    },
    [],
  );
  return (
    <section className="mt-3 space-y-3 rounded-xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Coins className="size-4 text-accent-foreground" aria-hidden="true" />
        طريقة الدفع
      </h2>
      <div
        id="c-pay-group"
        role="group"
        aria-label="طرق الدفع"
        tabIndex={-1}
        aria-describedby={errors.payment ? "c-pay-error" : undefined}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 focus-visible:outline-none"
      >
        {!data ? (
          !loadError && (
            <>
              <Skeleton className="h-14 rounded-sm" />
              <Skeleton className="h-14 rounded-sm" />
              <Skeleton className="h-14 rounded-sm" />
            </>
          )
        ) : data.paymentMethods.length === 0 ? (
          /* P42-2 (E-1): zero active payment methods used to render a silent
             empty grid while the submit bar stayed blocked on «اختر طريقة
             الدفع» — a dead end with no explanation. The merchant surface
             warns (payments/page.tsx empty-state), the register seeds COD+CASH,
             but a merchant who disables both leaves customers stranded mid-
             checkout. Honest copy + the store's own WhatsApp channel (when
             configured) — the same degrade-grammar as no-zones→PICKUP. */
          <p className="col-span-2 rounded-sm border border-dashed border-border bg-muted/30 p-3 text-center text-[12px] leading-relaxed text-muted-foreground sm:col-span-3">
            لم يفعّل هذا المتجر طرق دفع بعد
            {storeWhatsapp ? (
              <>
                {" — "}
                <a
                  href={`https://wa.me/${storeWhatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  تواصل مع المتجر عبر واتساب
                </a>
                {" لترتيب الدفع معه مباشرة"}
              </>
            ) : null}
          </p>
        ) : (
          data.paymentMethods.map((p) => {
          const selected = paymentMethodId === p.id;
          const Icon = paymentIcon(p.type);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPaymentMethodId(p.id);
                if (errors.payment) setErrors((x) => ({ ...x, payment: undefined }));
                /* P43 SO-2: مغادرة عائلة التحويل تُخلي مرجع التحويل — لا
                   يُرسل رقم إشعار مع طلب نقدي عند التسليم */
                if (!collectsPaymentReference(p.type)) {
                  setPaymentReference("");
                  setPayRefError(null);
                }
              }}
              aria-pressed={selected}
              /* P6-2-f3 (GROUP 1): stamp grammar — squared provider
                 tiles (1px family border; selected = orange border +
                 soft wash); the error-clearing handler is untouched. */
              className={`flex h-14 flex-col items-center justify-center gap-1 rounded-sm border text-[13px] font-medium transition-colors duration-(--t-fast) ${
                selected
                  ? "border-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {p.name}
            </button>
          );
          })
        )}
      </div>
      {errors.payment && <FieldError id="c-pay-error">{errors.payment}</FieldError>}
      {paymentMethod?.instructions && (
        <p className="text-[11px] leading-relaxed text-muted-foreground">{paymentMethod.instructions}</p>
      )}
      {/* P43 SO-2: مرجع التحويل — حقل اختياري يظهر لطرق التحويل فقط
          (تحويل يدوي/مدار/ليبيانا). الصيغة 4–50 حرفاً/رقماً/شرطة/قاطع —
          نفس نص الخادم حرفياً (payment-reference.ts مصدر واحد). */}
      {collectsPaymentReference(paymentMethod?.type) && (
        <div className="space-y-1.5">
          <label htmlFor="c-payref" className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <FileText className="size-3" aria-hidden="true" />
            رقم الحوالة / مرجع التحويل (اختياري)
          </label>
          <Input
            id="c-payref"
            value={paymentReference}
            onChange={(e) => {
              setPaymentReference(e.target.value);
              setPayRefError(null);
            }}
            onBlur={() => {
              /* تحقق لطيف عند المغادرة — نفس قواعد الخادم (المصدر واحد)،
                 والحقل اختياري فالفراغ ليس خطأ */
              const ref = normalizePaymentReference(paymentReference);
              setPayRefError(ref ? paymentReferenceError(ref) : null);
            }}
            placeholder="مثال: TRX-9F3A2C"
            maxLength={50}
            dir="ltr"
            className="font-mono text-start uppercase"
            aria-invalid={!!payRefError}
            aria-describedby={payRefError ? "c-payref-error" : undefined}
          />
          {payRefError && <FieldError id="c-payref-error">{payRefError}</FieldError>}
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            إن أردت، أدخل رقم إشعار التحويل من رسالة المحفظة أو البنك — يصل
            للمتجر مع طلبك لتسهيل مطابقة تحويلك.
          </p>
        </div>
      )}
      {paymentMethod && paymentConfig?.number && (
        <>
          {/* Transfer target — family number row with copy (squared to
              the stamp well, P6-2-f3) */}
          <div className="rounded-sm border border-border bg-muted/30 p-3">
            <p className="mb-1 text-xs text-muted-foreground">حوّل المبلغ إلى الرقم</p>
            <div className="flex items-center justify-between">
              <span className="font-mono text-lg font-bold tracking-wide" dir="ltr">
                {formatPhoneDisplay(paymentConfig.number)}
              </span>
              <button
                type="button"
                onClick={() => {
                  copyText("number", paymentConfig.number!, "تم نسخ الرقم");
                }}
                aria-label="نسخ الرقم"
                title={copiedKey === "number" ? "تم النسخ" : "نسخ الرقم"}
                className="flex size-11 items-center justify-center rounded-md border border-border/30 transition-colors hover:bg-muted"
              >
                {copiedKey === "number" ? (
                  <Check className="size-4 text-success-ink" aria-hidden="true" />
                ) : (
                  <AnimatedCopy className="size-3.5" />
                )}
              </button>
            </div>
          </div>
          {/* Quick transfer code — family USSD quick-code row.
              r134 (W2 #3): hidden above the wallet network cap — the
              amount-embedded USSD code cannot succeed over 99 LYD; the
              family cap note (provider-picker pattern) replaces the
              dead code, the manual transfer target above stays. */}
          {overWalletCap ? (
            <p className="text-xs text-accent-foreground">
              {/* r140 (P3-3): القالب يتبع الثابت — النص الحرفي «99» كان
                  يكذب لو تغيّر WALLET_CAP_LYD يومًا (المنطق يستخدمه سطر 139). */}
              المبالغ فوق {WALLET_CAP_LYD} د.ل لا تُدعم عبر رمز التحويل السريع — حوّل المبلغ يدوياً إلى الرقم أعلاه
            </p>
          ) : (
            <div className="rounded-sm border border-(--c-sky-ink)/35 bg-(--c-sky-bg) p-3">
              {/* P6-2-f3 (GROUP 1): the quick-code box re-toned from
                  success-green to the identity — it is a PAYMENT
                  INSTRUCTION, not a success state: steel (sky) family
                  stamp ground + delivery-orange copy CTA. Copy handler
                  + wallet-cap gate untouched. */}
              <p className="mb-1.5 text-xs font-medium text-(--c-sky-deep)">رمز التحويل السريع</p>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-sm font-bold text-accent-foreground" dir="ltr">
                  {paymentMethod.type === "LIBYANA"
                    ? libyanaUssdCode(paymentConfig.number, total / 1000)
                    : madarUssdCode(paymentConfig.number, total / 1000)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const code =
                      paymentMethod.type === "LIBYANA"
                        ? libyanaUssdCode(paymentConfig.number!, total / 1000)
                        : madarUssdCode(paymentConfig.number!, total / 1000);
                    copyText("ussd", code, "تم نسخ الرمز");
                  }}
                  className="flex h-11 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  title="نسخ رمز التحويل السريع"
                  aria-label="نسخ رمز التحويل السريع"
                >
                  {copiedKey === "ussd" ? (
                    <>
                      <Check className="size-3.5" aria-hidden="true" />
                      تم النسخ
                    </>
                  ) : (
                    <>
                      <AnimatedCopy className="size-3.5" />
                      نسخ
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {paymentMethod?.type === "COD" || paymentMethod?.type === "CASH"
          ? "الدفع نقداً عند وصول طلبك — لا حاجة لأي تحويل مسبق."
          : "بعد إرسال الطلب، تواصل مع المتجر عبر واتساب لتأكيد تحويلك. يُؤكد المتجر الدفع يدوياً."}
      </p>
    </section>
  );
}
