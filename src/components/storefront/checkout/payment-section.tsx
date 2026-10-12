import type { Dispatch, SetStateAction } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldError } from "@/components/dashboard/form-field";
import { toast } from "sonner";
import { AnimatedCopy } from "@/components/ui/animated-icons";
import { libyanaUssdCode, madarUssdCode, WALLET_CAP_LYD } from "@/lib/payment-constants";
import { formatPhoneDisplay } from "@/lib/phone";
import { Coins } from "lucide-react";
import { paymentIcon } from "./payment-icon";
import type { FieldErrors, StoreData } from "./types";

type PaymentMethod = StoreData["paymentMethods"][number];
type PaymentConfig = { number?: string } | null;

/** 17-DEBT-SO: payment section extracted verbatim from checkout-client.tsx
 * — ProviderPicker tile geometry, transfer-number row, r134 USSD
 * quick-code with the wallet-cap gate, and the COD/transfer footnote.
 * The copy buttons keep their exact handlers. */
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
}) {
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
              <Skeleton className="h-14 rounded-xl" />
              <Skeleton className="h-14 rounded-xl" />
              <Skeleton className="h-14 rounded-xl" />
            </>
          )
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
              }}
              aria-pressed={selected}
              className={`flex h-14 flex-col items-center justify-center gap-1 rounded-xl border text-[13px] font-medium transition-colors duration-(--t-fast) ${
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
      {paymentMethod && paymentConfig?.number && (
        <>
          {/* Transfer target — family number row with copy */}
          <div className="rounded-xl border border-border/20 bg-muted/30 p-3">
            <p className="mb-1 text-xs text-muted-foreground">حوّل المبلغ إلى الرقم</p>
            <div className="flex items-center justify-between">
              <span className="font-mono text-lg font-bold tracking-wide" dir="ltr">
                {formatPhoneDisplay(paymentConfig.number)}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(paymentConfig.number!);
                  toast.success("تم نسخ الرقم");
                }}
                className="flex size-10 items-center justify-center rounded-md border border-border/30 transition-colors hover:bg-muted"
                title="نسخ الرقم"
                aria-label="نسخ الرقم"
              >
                <AnimatedCopy className="size-3.5" />
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
            <div className="rounded-xl border border-success/25 bg-success/10 p-3">
              <p className="mb-1.5 text-xs font-medium text-success-ink">رمز التحويل السريع</p>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-sm font-bold text-accent-foreground" dir="ltr">
                  {paymentMethod.type === "LIBYANA"
                    ? libyanaUssdCode(paymentConfig.number, total / 1000)
                    : madarUssdCode(paymentConfig.number, total / 1000)}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    const code =
                      paymentMethod.type === "LIBYANA"
                        ? libyanaUssdCode(paymentConfig.number!, total / 1000)
                        : madarUssdCode(paymentConfig.number!, total / 1000);
                    try {
                      await navigator.clipboard.writeText(code);
                      toast.success("تم نسخ الرمز");
                    } catch {
                      toast.error("تعذّر النسخ");
                    }
                  }}
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-success px-3 text-xs font-medium text-success-foreground transition-colors hover:bg-success/90"
                  title="نسخ رمز التحويل السريع"
                  aria-label="نسخ رمز التحويل السريع"
                >
                  <AnimatedCopy className="size-3.5" />
                  نسخ
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
