"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { useCheckoutState } from "@/components/storefront/checkout/use-checkout-state";
import { formatLyd } from "@/lib/money";
import { normalizeLibyanPhone } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { SkipLink } from "@/components/shared/skip-link";
import { toast } from "sonner";
import { randomUUID } from "@/lib/uuid";
import { ArrowRight, Store, ClipboardList, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { FIELD_FOCUS_ID, type FieldKey } from "@/components/storefront/checkout/types";
import { SuccessScreen } from "@/components/storefront/checkout/success-screen";
import { CheckoutHold } from "@/components/storefront/checkout/checkout-hold";
import { EmptyCartScreen } from "@/components/storefront/checkout/empty-cart-screen";
import { FulfillmentSection } from "@/components/storefront/checkout/fulfillment-section";
import { CustomerInfoSection } from "@/components/storefront/checkout/customer-info-section";
import { DeliveryDetailsSection } from "@/components/storefront/checkout/delivery-details-section";
import { PaymentSection } from "@/components/storefront/checkout/payment-section";
import { NoteSection } from "@/components/storefront/checkout/note-section";
import { CartSummarySection } from "@/components/storefront/checkout/cart-summary-section";
import { StickySubmitBar } from "@/components/storefront/checkout/sticky-submit-bar";

/**
 * 17-DEBT-SO split map — checkout-client.tsx stays the composition root
 * (same path, same named export, same props) and the focused modules now
 * live in src/components/storefront/checkout/:
 *   types.ts — StoreData/Step/FieldKey/FieldErrors/CheckoutResult + FIELD_FOCUS_ID
 *   payment-icon.ts — ProviderPicker tile icon mapping
 *   use-checkout-state.ts — the whole state machine (useState + load +
 *     derived money/eligibility values + beforeunload guard)
 *   success-screen.tsx / checkout-hold.tsx / empty-cart-screen.tsx — the
 *     three non-form screens
 *   fulfillment-section.tsx / customer-info-section.tsx /
 *     delivery-details-section.tsx / payment-section.tsx / note-section.tsx /
 *     cart-summary-section.tsx / sticky-submit-bar.tsx — the form sections
 * The submit flow (validation + POST /api/public/orders + redirect) and
 * the <main id="main"> shell stay HERE deliberately: tests/parity.mjs
 * pins both to this exact file path (r133 durable-success router.replace
 * + D skip-target assertion) and pins are never moved for refactors.
 */
export function CheckoutClient({
  slug,
  business,
}: {
  slug: string;
  business: { name: string; logoUrl: string | null; whatsappNumber: string | null };
}) {
  /* P6-2-f3 (GROUP 1): the checkout journey — a quiet route indicator
     (store → checkout → done) speaking the tracking-road grammar:
     dashed spine + circular station nodes, the ACTIVE node breathing
     through the RM-safe pulse-soft ring (the global
     prefers-reduced-motion gate halts it). Presentation only — the
     station set is fixed because this page IS the middle station; no
     state, no effect, aria-current marks the step for AT. */
  const JOURNEY = [
    { icon: Store, label: "المتجر", state: "done" as const },
    { icon: ClipboardList, label: "إتمام الطلب", state: "active" as const },
    { icon: Check, label: "التسليم", state: "pending" as const },
  ];

  const {
    items,
    clearCart,
    hydrated,
    data,
    loadError,
    load,
    step,
    setStep,
    submitting,
    setSubmitting,
    result,
    setResult,
    fulfillment,
    setFulfillment,
    name,
    setName,
    phone,
    setPhone,
    city,
    setCity,
    area,
    setArea,
    addressLine,
    setAddressLine,
    customerNote,
    setCustomerNote,
    zoneId,
    setZoneId,
    paymentMethodId,
    setPaymentMethodId,
    errors,
    setErrors,
    subtotal,
    zone,
    deliveryFee,
    total,
    overWalletCap,
    paymentMethod,
    paymentConfig,
    minOrderUnmet,
  } = useCheckoutState(slug);
  const router = useRouter();

  // r132-F1a (A10 #2): idempotency key is minted ONCE per cart-session
  // and reused across retries — the SM checkoutKeyRef spec
  // (smart-menu-real cart/page.tsx:85-92). A fresh randomUUID() per
  // submit click defeated the DB @@unique([businessId, idempotencyKey])
  // dedup: an ambiguous failure (network cut after the server committed)
  // retried with a NEW key and produced a duplicate order. Retired ONLY
  // after a confirmed success (fresh 201 or the inert replay) so the
  // next order in the same session mints a fresh key.
  const checkoutKeyRef = React.useRef("");

  async function submit() {
    // r132-F1a (A2 F4): collect ALL field errors in one pass — every
    // failing field gets its inline FieldError + aria-invalid at once
    // (the old one-toast-at-a-time flow never marked the field and made
    // the customer guess which input was wrong).
    if (minOrderUnmet) {
      toast.error(`الحد الأدنى للطلب في ${zone?.name} هو ${formatLyd(zone!.minOrder)}`);
      return;
    }
    if (items.length === 0) return toast.error("سلتك فارغة");

    const found: Partial<Record<FieldKey, string>> = {};
    if (name.trim().length < 2) found.name = "أدخل اسمك الكامل";
    if (!normalizeLibyanPhone(phone)) found.phone = "رقم الهاتف غير صحيح — مثال: 0912345678";
    if (fulfillment === "DELIVERY" && !zoneId) found.zone = "اختر منطقة التوصيل";
    if (fulfillment === "DELIVERY" && !addressLine.trim()) found.address = "أدخل عنوانك بالتفصيل";
    if (!paymentMethodId) found.payment = "اختر طريقة الدفع";

    const first = (["name", "phone", "zone", "address", "payment"] as const).find((k) => found[k]);
    setErrors(found);
    if (first) {
      // Toast stays as reinforcement (r131 <form> ruling); the field
      // itself now announces and receives focus/scroll.
      toast.error(found[first]);
      const el = document.getElementById(FIELD_FOCUS_ID[first]);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus({ preventScroll: true });
      return;
    }

    setSubmitting(true);
    try {
      // r132-F1a (A10 #2): reuse ONE key per cart-session (see
      // checkoutKeyRef) — network retries now hit the DB dedup and get
      // the inert replay instead of a second order.
      if (!checkoutKeyRef.current) checkoutKeyRef.current = randomUUID();
      const r = await api.post<{ order: { orderNumber: string; publicToken: string; total: number; replay?: boolean }; whatsapp: { number: string; message: string } | null }>(
        "/api/public/orders",
        {
          slug,
          idempotencyKey: checkoutKeyRef.current,
          fulfillmentType: fulfillment,
          customerName: name.trim(),
          customerPhone: phone,
          city: fulfillment === "DELIVERY" ? city : "",
          area: area.trim(),
          addressLine: fulfillment === "DELIVERY" ? addressLine.trim() : "",
          customerNote: customerNote.trim(),
          deliveryZoneId: fulfillment === "DELIVERY" ? zoneId : null,
          paymentMethodId,
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            optionIds: i.options.map((o) => o.id),
            quantity: i.quantity,
            note: i.note,
          })),
        }
      );
      /* 4-c (P15, 3-c audit P1 «the stale error rides the confirmation»):
         the sonner wrapper pins every toast.error to duration: Infinity
         (r133 A11 doctrine — errors persist until the human acts). An
         earlier failed submit's «أدخل اسمك الكامل» therefore survived
         the client navigation to /track/…?placed=1 and sat beside
         «تم استلام طلبك!» for 18+ seconds (only a hard reload cleared
         it). The error's reason is RESOLVED at this point — the order
         committed — so retiring the queue here is not soft-dismissal,
         it is the doctrine's own exit condition. toast.dismiss() with
         no id clears the whole queue; called BEFORE the replay info
         toast so that one (default duration) still renders. */
      toast.dismiss();
      if (r.data.order.replay) {
        toast.info("تم استلام طلبك مسبقاً");
      }
      // Confirmed success (fresh 201 OR the inert replay) — retire the
      // key so the NEXT order in this session mints a fresh one.
      checkoutKeyRef.current = "";
      setResult({ ...r.data.order, whatsapp: r.data.whatsapp });
      setStep("success");
      clearCart();
      /* r133 (A1 F9): the success moment used to live only in component
         state — a refresh (or an accidental back) landed on the
         empty-cart branch with zero reference to the order just placed.
         Redirect to the durable track URL (?placed=1 renders the
         confirmation banner); the in-page success screen stays mounted
         as the transition view while the navigation settles. */
      router.replace(`/track/${r.data.order.publicToken}?placed=1`);
      window.scrollTo({ top: 0 });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر إرسال الطلب، حاول مرة أخرى");
      // key intentionally KEPT — the retry resubmits the same key and
      // the server replays the existing order if it actually committed.
    } finally {
      setSubmitting(false);
    }
  }

  // ===== SUCCESS SCREEN =====
  if (step === "success" && result) {
    return <SuccessScreen result={result} slug={slug} />;
  }

  // ===== PRE-HYDRATION HOLD (r140 P2-2) =====
  // سلة مخزنة لم تُرطّب بعد: احتفظ بهيكل محايد حتى يكتمل rehydrate —
  // HTML الخادم والإطار الأول للعميل كلاهما يمر من هنا، فلا فرع
  // «سلتك فارغة» قبل أن تُقرأ localStorage.
  if (!hydrated) {
    return <CheckoutHold businessName={business.name} />;
  }

  // ===== EMPTY CART =====
  if (items.length === 0) {
    return <EmptyCartScreen slug={slug} />;
  }

  // ===== CHECKOUT FORM =====
  return (
    <div className="min-h-screen bg-muted/30">
      <SkipLink />
      <header className="bg-background border-b border-border safe-top sticky top-0 z-(--z-dropdown)">
        <div className="mx-auto max-w-2xl px-4 h-14 flex items-center gap-3">
          {/* r151 (LIVE-AUDIT-SO1 P2-3): the primary phone escape route
              rides the 44px touch floor — a 20px text box inside the 56px
              header was the thinnest target on the money path (r151 live
              eval: h=20). The box extends vertically to h-11 inside the
              centered h-14 row; the label position is unchanged. */}
          <Link href={`/store/${slug}`} className="flex h-11 items-center gap-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors" aria-label="العودة للمتجر">
            <ArrowRight className="size-4" aria-hidden="true" />
            العودة
          </Link>
          <div className="ms-auto font-heading font-bold text-sm">{business.name}</div>
        </div>
      </header>

      {/* r133 (A11 S2): tabIndex={-1} on the skip-link target so
          Safari/Firefox move keyboard focus into <main> on skip. */}
      <main id="main" tabIndex={-1} aria-busy={!data && !loadError} className="mx-auto max-w-2xl px-4 py-5 pb-32 focus:outline-none">
        {/* P18-W2-d (two-voice law — UC P4 dim-prefix extended to the
            checkout heading): the stable context «طلبك» rides the dim
            ink, the live claim carries the full ink — the SAME grammar
            as the tracking h2 («طلبك …»), so the customer funnel reads
            as one product voice from cart to door. */}
        <h1 className="font-heading text-xl font-bold leading-tight">
          <span className="text-muted-foreground">طلبك</span>{" "}
          <span className="text-foreground">على بعد خطوة من الإرسال</span>
        </h1>

        {/* P6-2-f3 (GROUP 1): the journey route — store → checkout →
            done. Traveled road (into the form) = delivery orange at
            50%; the road ahead stays hairline. */}
        <ol aria-label="مسار الطلب" className="mt-3 flex items-start">
          {JOURNEY.map((n, i) => (
            <li
              key={n.label}
              aria-current={n.state === "active" ? "step" : undefined}
              className={cn("flex items-start", i === 0 ? "shrink-0" : "flex-1")}
            >
              {i > 0 && (
                <span
                  aria-hidden="true"
                  /* dashed segment at node-center height (circle 32px →
                     center 16px, 2px line → 15px offset) */
                  className={cn(
                    "h-0 flex-1 mt-[15px] border-t-2 border-dashed",
                    n.state === "pending" ? "border-border" : "border-primary/50"
                  )}
                />
              )}
              <div className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border-2",
                    n.state === "done" && "border-primary/50 bg-primary/10 text-accent-foreground",
                    n.state === "active" &&
                      "border-primary bg-accent-soft text-accent-foreground animate-pulse-soft",
                    n.state === "pending" && "border-border bg-muted text-muted-foreground/60"
                  )}
                >
                  <n.icon className="size-4" aria-hidden="true" />
                </span>
                <span
                  className={cn(
                    "text-[10px]",
                    n.state === "active" ? "font-medium text-accent-foreground" : "text-muted-foreground"
                  )}
                >
                  {n.label}
                </span>
              </div>
            </li>
          ))}
        </ol>

        {/* Zones/payment fetch failed — explicit banner + retry (never a
            silent PICKUP-only degrade; submit stays disabled until data
            resolves). */}
        {loadError && (
          <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3.5">
            <div>
              <div className="text-sm font-bold text-destructive-ink">تعذّر تحميل بيانات المتجر</div>
              <p className="mt-0.5 text-xs text-muted-foreground">مناطق التوصيل وطرق الدفع غير متاحة — تحقق من اتصالك وأعد المحاولة.</p>
            </div>
            <Button variant="outline" onClick={load} className="shrink-0">
              إعادة المحاولة
            </Button>
          </div>
        )}

        {/* r131-F2 (P0-1): a REAL <form> — Enter submits from any field
            and the button is a true type=submit (form= reaches the sticky
            bar outside <main>); validation stays manual (noValidate) with
            the toast as reinforcement. */}
        <form
          id="checkout-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          noValidate
          className="contents"
        >
        <FulfillmentSection data={data} loadError={loadError} fulfillment={fulfillment} setFulfillment={setFulfillment} />
        <CustomerInfoSection name={name} setName={setName} phone={phone} setPhone={setPhone} errors={errors} setErrors={setErrors} />
        {fulfillment === "DELIVERY" && (
          <DeliveryDetailsSection
            data={data}
            loadError={loadError}
            city={city}
            setCity={setCity}
            area={area}
            setArea={setArea}
            zoneId={zoneId}
            setZoneId={setZoneId}
            addressLine={addressLine}
            setAddressLine={setAddressLine}
            errors={errors}
            setErrors={setErrors}
            minOrderUnmet={minOrderUnmet}
            zone={zone}
            subtotal={subtotal}
          />
        )}
        <PaymentSection
          data={data}
          loadError={loadError}
          paymentMethodId={paymentMethodId}
          setPaymentMethodId={setPaymentMethodId}
          errors={errors}
          setErrors={setErrors}
          paymentMethod={paymentMethod}
          paymentConfig={paymentConfig}
          overWalletCap={overWalletCap}
          total={total}
        />
        <NoteSection customerNote={customerNote} setCustomerNote={setCustomerNote} />
        </form>

        <CartSummarySection items={items} />
      </main>

      <StickySubmitBar
        data={data}
        subtotal={subtotal}
        deliveryFee={deliveryFee}
        total={total}
        submitting={submitting}
        minOrderUnmet={minOrderUnmet}
        minOrderAmount={zone?.minOrder}
      />
    </div>
  );
}
