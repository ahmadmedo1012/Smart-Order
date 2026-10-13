import Link from "next/link";
import { formatLyd } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowLeft, MessageCircle, ClipboardList, PartyPopper } from "lucide-react";
import type { CheckoutResult } from "./types";

/** 17-DEBT-SO: success screen extracted verbatim from checkout-client.tsx
 * (step === "success" && result branch). Pure presentation — receives the
 * settled result state; the redirect itself lives in the parent submit. */
export function SuccessScreen({ result, slug }: { result: CheckoutResult; slug: string }) {
  /* r150: SSR-safe absolute URL — guarded read (this screen is
   client-only post-submit, but the guard keeps it prerender-safe
   without a setState-in-effect cascade). */
  const trackUrl =
    typeof window === "undefined"
      ? `/track/${result.publicToken}`
      : `${window.location.origin}/track/${result.publicToken}`;
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-success/15 text-success-ink">
          <CheckCircle2 className="size-10" aria-hidden="true" />
        </div>
        <h1 className="mt-6 font-heading text-2xl font-bold">تم استلام طلبك!</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          رقم طلبك هو
        </p>
        <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/25 px-5 py-2.5">
          <ClipboardList className="size-5 text-accent-foreground" aria-hidden="true" />
          <span className="font-heading font-bold text-lg text-accent-foreground tabular-nums">{result.orderNumber}</span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          الإجمالي: <span className="font-bold text-foreground tabular-nums">{formatLyd(result.total)}</span>
        </p>

        <div className="mt-6 space-y-2.5">
          <Button asChild size="lg" className="w-full">
            <Link href={`/track/${result.publicToken}`}>
              تتبع حالة الطلب
              <ArrowLeft className="size-5 ms-2" aria-hidden="true" />
            </Link>
          </Button>
          {result.whatsapp && (
            <a
              href={`https://wa.me/${result.whatsapp.number}?text=${encodeURIComponent(result.whatsapp.message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="whatsapp-btn w-full h-12 rounded-lg font-bold text-base inline-flex items-center justify-center gap-2 transition-colors" /* r150: whatsapp hand-rolled twin keeps its 48px row with the lg CTA above */
            >
              <MessageCircle className="size-5" aria-hidden="true" />
              إرسال تفاصيل الطلب عبر واتساب
            </a>
          )}
          <Link
            href={`/store/${slug}`}
            className="flex w-full h-11 items-center justify-center gap-2 rounded-lg border border-border font-semibold text-sm hover:bg-muted transition-colors"
          >
            <PartyPopper className="size-4" aria-hidden="true" />
            متابعة التصفح
          </Link>
        </div>

        <p className="mt-6 text-[11px] text-muted-foreground leading-relaxed">
          احفظ رابط التتبع — يمكنك مشاركته مع أي شخص لمتابعة الطلب.
          <br />
          <span dir="ltr" className="tabular-nums">{trackUrl}</span>
        </p>
      </div>
    </div>
  );
}
