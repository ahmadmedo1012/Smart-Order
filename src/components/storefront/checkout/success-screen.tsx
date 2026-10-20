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
        {/* P6-2-f3 (GROUP 1): the order-number token squares to the
            stamp idiom (family border + soft wash) and rides the mono
            code stack — codes are Plex Mono, per the identity. */}
        <div className="mt-2 inline-flex items-center gap-2 rounded-sm bg-primary/10 border border-primary/25 px-5 py-2.5">
          <ClipboardList className="size-5 text-accent-foreground" aria-hidden="true" />
          <span className="font-mono font-bold text-lg text-accent-foreground tabular-nums">{result.orderNumber}</span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          الإجمالي: <span className="font-mono font-bold text-foreground tabular-nums">{formatLyd(result.total)}</span>
        </p>

        <div className="mt-6 space-y-2.5">
          <Button asChild size="lg" className="w-full">
            <Link href={`/track/${result.publicToken}`}>
              تتبع حالة الطلب
              <ArrowLeft className="size-5 ms-2" aria-hidden="true" />
            </Link>
          </Button>
          {result.whatsapp && (
            /* W7-G (fix 18): the stacked column speaks ONE rung + ONE
               verb — the hand-rolled rounded-lg twins reuse the Button
               variants (whatsapp keeps its 48px row via size="lg",
               matching the lg CTA above). */
            <Button asChild variant="whatsapp" size="lg" className="w-full">
              <a
                href={`https://wa.me/${result.whatsapp.number}?text=${encodeURIComponent(result.whatsapp.message)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="size-5" aria-hidden="true" />
                إرسال تفاصيل الطلب عبر واتساب
              </a>
            </Button>
          )}
          <Button asChild variant="outline" className="w-full">
            <Link href={`/store/${slug}`}>
              <PartyPopper className="size-4" aria-hidden="true" />
              متابعة التصفح
            </Link>
          </Button>
        </div>

        <p className="mt-6 text-[11px] text-muted-foreground leading-relaxed">
          احفظ رابط التتبع — يمكنك مشاركته مع أي شخص لمتابعة الطلب.
          <br />
          <span dir="ltr" className="font-mono tabular-nums">{trackUrl}</span>
        </p>
      </div>
    </div>
  );
}
