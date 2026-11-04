import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/dashboard/form-field";
import { formatLyd } from "@/lib/money";
import { TicketPercent, X, Loader2, BadgeCheck } from "lucide-react";
import type { CouponPreview } from "./types";

/**
 * P43 SO-2 — كود الخصم في صفحة الدفع (checkout section): the customer
 * types a flyer code, the PUBLIC preview endpoint answers with the
 * merchant's canonical spelling + description + the honest discount, and
 * the sticky bar's total subtracts it. The submission re-validates
 * everything server-side inside the order transaction — this UI owns the
 * EXPERIENCE, never the money.
 *
 * Card grammar: the section family's rounded-xl border p-4 (the
 * consistency pass's own rule — same padding/radius as بياناتك/
 * التوصيل/الدفع/ملخص السلة).
 */
export function CouponSection({
  couponInput,
  setCouponInput,
  coupon,
  couponBusy,
  couponError,
  setCouponError,
  applyCoupon,
  removeCoupon,
  deliveryFee,
}: {
  couponInput: string;
  setCouponInput: (v: string) => void;
  coupon: CouponPreview | null;
  couponBusy: boolean;
  couponError: string | null;
  setCouponError: (v: string | null) => void;
  applyCoupon: () => void;
  removeCoupon: () => void;
  /** the live zone fee — the FREE_DELIVERY chip's honest «مجاناً» note */
  deliveryFee: number;
}) {
  return (
    <section className="mt-3 space-y-3 rounded-xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <TicketPercent className="size-4 text-accent-foreground" aria-hidden="true" />
        كود الخصم
      </h2>

      {coupon ? (
        /* Applied — the merchant's canonical code + description + the
           live discount figure, and one tap to remove. */
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-sm border border-(--c-mint-ink)/35 bg-(--c-mint-bg) px-3 py-2.5"
        >
          <BadgeCheck className="size-4 shrink-0 text-(--c-mint-deep)" aria-hidden="true" />
          <div className="min-w-0 flex-1 text-[13px]">
            <span className="font-mono font-bold tracking-wide text-(--c-mint-deep)" dir="ltr">
              {coupon.code}
            </span>
            <span className="ms-1.5 text-muted-foreground">
              {coupon.type === "FREE_DELIVERY"
                ? coupon.discount > 0
                  ? `توصيل مجاني${deliveryFee > 0 ? ` (وفّرت ${formatLyd(coupon.discount)})` : ""}`
                  : "توصيل مجاني"
                : coupon.description}
            </span>
          </div>
          <button
            type="button"
            onClick={removeCoupon}
            className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={`إزالة الكود ${coupon.code}`}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <Input
              id="c-coupon"
              value={couponInput}
              onChange={(e) => {
                setCouponInput(e.target.value);
                if (couponError) setCouponError(null);
              }}
              placeholder="مثال: WELCOME10"
              maxLength={40}
              dir="ltr"
              className="font-mono text-start uppercase"
              aria-label="كود الخصم"
              aria-invalid={!!couponError}
              aria-describedby={couponError ? "c-coupon-error" : undefined}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault(); // the form's Enter submits — the code field applies instead
                  applyCoupon();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={applyCoupon}
              disabled={couponBusy || !couponInput.trim()}
              className="shrink-0"
            >
              {couponBusy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                "تطبيق"
              )}
            </Button>
          </div>
          {couponError && <FieldError id="c-coupon-error">{couponError}</FieldError>}
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            لديك كود من المتجر؟ طبّقه هنا — يُعاد التحقق منه عند الإرسال.
          </p>
        </>
      )}
    </section>
  );
}
