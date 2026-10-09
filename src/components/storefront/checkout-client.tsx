"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { useCart, cartEstimatedSubtotal } from "@/hooks/use-cart";
import { formatLyd } from "@/lib/money";
import { normalizeLibyanPhone, formatPhoneDisplay } from "@/lib/phone";
import { FULFILLMENT_AR, LIBYA_CITIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/states";
import { SkipLink } from "@/components/shared/skip-link";
import { FieldError } from "@/components/dashboard/form-field";
import { toast } from "sonner";
import { randomUUID } from "@/lib/uuid";
import { AnimatedCopy } from "@/components/ui/animated-icons";
import { libyanaUssdCode, madarUssdCode, WALLET_CAP_LYD } from "@/lib/payment-constants";
import {
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  Truck,
  Store,
  Coins,
  Loader2,
  CheckCircle2,
  MapPin,
  Phone,
  User,
  MessageCircle,
  ClipboardList,
  PartyPopper,
  StickyNote,
  Banknote,
  Landmark,
} from "lucide-react";

/** Family ProviderPicker tile geometry: icon + label, mapped per payment type. */
function paymentIcon(type: string) {
  if (type === "CASH" || type === "COD") return Banknote;
  if (type === "WHATSAPP") return MessageCircle;
  if (type === "MADAR" || type === "LIBYANA") return Phone;
  return Landmark;
}

interface StoreData {
  deliveryZones: Array<{ id: string; name: string; fee: number; minOrder: number }>;
  paymentMethods: Array<{ id: string; type: string; name: string; instructions: string | null; config: string | null }>;
}

type Step = "form" | "success";

/** r132-F1a (A2 F4): field-level checkout validation keys — the r131
 * aria-invalid + FieldError recipe (dashboard form-field.tsx), extended
 * to the customer money path. Errors are set on the submit attempt and
 * each field clears its own on change, exactly like the dashboard
 * dialogs (delivery/page.tsx ZoneDialog). */
type FieldKey = "name" | "phone" | "zone" | "address" | "payment";

/** First-invalid focus targets — inputs focus natively; the two tile
 * groups (zone/payment) get tabIndex={-1} containers so focus()+scroll
 * land on them. */
const FIELD_FOCUS_ID: Record<FieldKey, string> = {
  name: "c-name",
  phone: "c-phone",
  zone: "c-zone-grid",
  address: "c-address",
  payment: "c-pay-group",
};

export function CheckoutClient({
  slug,
  business,
}: {
  slug: string;
  business: { name: string; logoUrl: string | null; whatsappNumber: string | null };
}) {
  const items = useCart((s) => s.items);
  const clearCart = useCart((s) => s.clear);
  const router = useRouter();
  const [data, setData] = React.useState<StoreData | null>(null);
  const [loadError, setLoadError] = React.useState(false);
  const [step, setStep] = React.useState<Step>("form");
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<{
    orderNumber: string;
    publicToken: string;
    total: number;
    whatsapp: { number: string; message: string } | null;
  } | null>(null);

  const [fulfillment, setFulfillment] = React.useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [city, setCity] = React.useState("طرابلس");
  const [area, setArea] = React.useState("");
  const [addressLine, setAddressLine] = React.useState("");
  const [customerNote, setCustomerNote] = React.useState("");
  const [zoneId, setZoneId] = React.useState<string>("");
  const [paymentMethodId, setPaymentMethodId] = React.useState<string>("");
  const [errors, setErrors] = React.useState<Partial<Record<FieldKey, string>>>({});

  // r132-F1a (A10 #2): idempotency key is minted ONCE per cart-session
  // and reused across retries — the SM checkoutKeyRef spec
  // (smart-menu-real cart/page.tsx:85-92). A fresh randomUUID() per
  // submit click defeated the DB @@unique([businessId, idempotencyKey])
  // dedup: an ambiguous failure (network cut after the server committed)
  // retried with a NEW key and produced a duplicate order. Retired ONLY
  // after a confirmed success (fresh 201 or the inert replay) so the
  // next order in the same session mints a fresh key.
  const checkoutKeyRef = React.useRef("");

  const load = React.useCallback(() => {
    setLoadError(false);
    api
      .get<StoreData>(`/api/public/store/${slug}`)
      .then((r) => {
        setData(r.data);
        if (r.data.deliveryZones.length > 0) setZoneId(r.data.deliveryZones[0].id);
        if (r.data.paymentMethods.length > 0) setPaymentMethodId(r.data.paymentMethods[0].id);
        if (r.data.deliveryZones.length === 0) setFulfillment("PICKUP");
      })
      .catch(() => setLoadError(true));
  }, [slug]);

  React.useEffect(load, [load]);

  const subtotal = cartEstimatedSubtotal(items);
  const zone = data?.deliveryZones.find((z) => z.id === zoneId) ?? null;
  const deliveryFee = fulfillment === "DELIVERY" ? (zone?.fee ?? 0) : 0;
  const total = subtotal + deliveryFee;
  /* r134 (W2 #3): wallet networks (libyana/madar) reject single
     transfers above WALLET_CAP_LYD — subscriptions already enforce the
     cap (payment-dialog.tsx); the checkout quick-code row now matches
     (amounts are millimes — the constant is whole LYD). */
  const overWalletCap = total > WALLET_CAP_LYD * 1000;
  const paymentMethod = data?.paymentMethods.find((p) => p.id === paymentMethodId) ?? null;
  const paymentConfig = paymentMethod?.config ? (JSON.parse(paymentMethod.config) as { number?: string }) : null;

  const minOrderUnmet: boolean =
    fulfillment === "DELIVERY" && !!zone && zone.minOrder > 0 && subtotal < zone.minOrder;

  /* r134 (W2 #15): beforeunload dirty guard — the r133 useDirtyClose
     family pattern adapted to a full-page client form (dialogs guard
     ESC/scrim/close; a page form needs the browser-level guard; note
     beforeunload fires on real unloads only — refresh/close — not on
     Next.js client-side navigations, and the success path uses
     router.replace so it never trips). Dirty = any field off the value
     load() seeds; armed only while there are items to lose. */
  const formDirty =
    step === "form" &&
    !!data &&
    (name.trim() !== "" ||
      phone.trim() !== "" ||
      area.trim() !== "" ||
      addressLine.trim() !== "" ||
      customerNote.trim() !== "" ||
      city !== "طرابلس" ||
      zoneId !== (data.deliveryZones[0]?.id ?? "") ||
      paymentMethodId !== (data.paymentMethods[0]?.id ?? "") ||
      fulfillment !== (data.deliveryZones.length > 0 ? "DELIVERY" : "PICKUP"));

  React.useEffect(() => {
    if (!formDirty || items.length === 0) return;
    const guardUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ""; // legacy contract — Chrome ignores preventDefault alone
    };
    window.addEventListener("beforeunload", guardUnload);
    return () => window.removeEventListener("beforeunload", guardUnload);
  }, [formDirty, items.length]);

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
    const trackUrl = `${window.location.origin}/track/${result.publicToken}`;
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
            <Button asChild className="w-full h-12 font-bold text-base">
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
                className="whatsapp-btn w-full h-12 rounded-lg font-bold text-base inline-flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle className="size-5" aria-hidden="true" />
                إرسال تفاصيل الطلب عبر واتساب
              </a>
            )}
            <Link
              href={`/store/${slug}`}
              className="block w-full h-11 rounded-lg border border-border font-semibold text-sm flex items-center justify-center gap-2 hover:bg-muted transition-colors"
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

  // ===== EMPTY CART =====
  if (items.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <EmptyState
          icon={ShoppingBag}
          title="سلتك فارغة"
          description="أضف منتجات من المتجر لتتمكن من إتمام الطلب"
          action={
            <Button asChild className="px-6">
              <Link href={`/store/${slug}`}>
                <ArrowLeft className="size-4 me-2" aria-hidden="true" />
                العودة للمتجر
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  // ===== CHECKOUT FORM =====
  return (
    <div className="min-h-screen bg-muted/30">
      <SkipLink />
      <header className="bg-background border-b border-border safe-top sticky top-0 z-(--z-dropdown)">
        <div className="mx-auto max-w-2xl px-4 h-14 flex items-center gap-3">
          <Link href={`/store/${slug}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors" aria-label="العودة للمتجر">
            <ArrowRight className="size-4" aria-hidden="true" />
            العودة
          </Link>
          <div className="ms-auto font-heading font-bold text-sm">{business.name}</div>
        </div>
      </header>

      {/* r133 (A11 S2): tabIndex={-1} on the skip-link target so
          Safari/Firefox move keyboard focus into <main> on skip. */}
      <main id="main" tabIndex={-1} aria-busy={!data && !loadError} className="mx-auto max-w-2xl px-4 py-5 pb-32 focus:outline-none">
        <h1 className="font-heading text-xl font-bold">إتمام الطلب</h1>

        {/* Zones/payment fetch failed — explicit banner + retry (never a
            silent PICKUP-only degrade; submit stays disabled until data
            resolves). */}
        {loadError && (
          <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3.5">
            <div>
              <div className="text-sm font-bold text-destructive-ink">تعذّر تحميل بيانات المتجر</div>
              <p className="mt-0.5 text-xs text-muted-foreground">مناطق التوصيل وطرق الدفع غير متاحة — تحقق من اتصالك وأعد المحاولة.</p>
            </div>
            <Button variant="outline" size="sm" onClick={load} className="h-9 shrink-0">
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
        {/* Fulfillment */}
        <section className="mt-4 rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold text-sm mb-3">طريقة الاستلام</h2>
          <div className="grid grid-cols-2 gap-2">
            {!data ? (
              loadError ? (
                <p className="col-span-2 text-xs text-muted-foreground">خيارات الاستلام تظهر بعد إعادة المحاولة.</p>
              ) : (
                <>
                  <Skeleton className="h-[76px] rounded-xl" />
                  <Skeleton className="h-[76px] rounded-xl" />
                </>
              )
            ) : (
              (data.deliveryZones.length ? ["DELIVERY", "PICKUP"] : ["PICKUP"]).map((t) => {
              const selected = fulfillment === t;
              const Icon = t === "DELIVERY" ? Truck : Store;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFulfillment(t as "DELIVERY" | "PICKUP")}
                  aria-pressed={selected}
                  className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-start transition-colors ${
                    selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <Icon className={`size-5 shrink-0 ${selected ? "text-accent-foreground" : "text-muted-foreground"}`} aria-hidden="true" />
                  <div>
                    <div className="text-sm font-semibold">{FULFILLMENT_AR[t as "DELIVERY" | "PICKUP"]}</div>
                    {t === "DELIVERY" && <div className="text-[11px] text-muted-foreground mt-0.5">حسب منطقتك</div>}
                  </div>
                </button>
              );
              })
            )}
          </div>
        </section>

        {/* Customer info */}
        <section className="mt-3 rounded-xl border border-border bg-card p-4 space-y-3.5">
          <h2 className="font-semibold text-sm">بياناتك</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="c-name" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <User className="size-3" aria-hidden="true" />
                الاسم الكامل *
              </label>
              <Input
                id="c-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((x) => ({ ...x, name: undefined }));
                }}
                autoComplete="name"
                maxLength={80}
                placeholder="اسمك"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "c-name-error" : undefined}
              />
              {errors.name && <FieldError id="c-name-error">{errors.name}</FieldError>}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="c-phone" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Phone className="size-3" aria-hidden="true" />
                رقم الهاتف *
              </label>
              <Input
                id="c-phone"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errors.phone) setErrors((x) => ({ ...x, phone: undefined }));
                }}
                autoComplete="tel"
                inputMode="tel"
                dir="ltr"
                maxLength={20}
                placeholder="0912345678"
                className="text-start tabular-nums"
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "c-phone-error" : undefined}
              />
              {errors.phone && <FieldError id="c-phone-error">{errors.phone}</FieldError>}
            </div>
          </div>
        </section>

        {/* Delivery details */}
        {fulfillment === "DELIVERY" && (
          <section className="mt-3 rounded-xl border border-border bg-card p-4 space-y-3.5">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <MapPin className="size-4 text-accent-foreground" aria-hidden="true" />
              عنوان التوصيل
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="c-city" className="text-xs font-medium text-muted-foreground">المدينة *</label>
                <select
                  id="c-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full h-11 rounded-md border border-input bg-background px-4 text-base transition-[color,box-shadow,border-color] duration-(--t-fast) outline-none focus-visible:border-primary focus-visible:shadow-(--state-input-focus-halo)"
                >
                  {LIBYA_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="c-area2" className="text-xs font-medium text-muted-foreground">المنطقة</label>
                <Input
                  id="c-area2"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  maxLength={60}
                  placeholder="مثال: تاجوراء"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">منطقة التوصيل *</label>
              <div
                id="c-zone-grid"
                role="group"
                aria-label="منطقة التوصيل"
                tabIndex={-1}
                aria-describedby={errors.zone ? "c-zone-error" : undefined}
                className="grid grid-cols-2 sm:grid-cols-3 gap-2 focus-visible:outline-none"
              >
                {!data ? (
                  !loadError && (
                    <>
                      <Skeleton className="h-[76px] rounded-xl" />
                      <Skeleton className="h-[76px] rounded-xl" />
                      <Skeleton className="h-[76px] rounded-xl" />
                    </>
                  )
                ) : (
                  data.deliveryZones.map((z) => {
                  const selected = zoneId === z.id;
                  return (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => {
                        setZoneId(z.id);
                        if (errors.zone) setErrors((x) => ({ ...x, zone: undefined }));
                      }}
                      aria-pressed={selected}
                      className={`rounded-xl border p-2.5 text-center transition-colors ${
                        selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="text-xs font-semibold truncate">{z.name}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                        {z.fee === 0 ? "مجاناً" : formatLyd(z.fee)}
                      </div>
                      {z.minOrder > 0 && (
                        <div className="text-[11px] text-muted-foreground tabular-nums">حد أدنى {formatLyd(z.minOrder)}</div>
                      )}
                    </button>
                  );
                  })
                )}
              </div>
              {errors.zone && <FieldError id="c-zone-error">{errors.zone}</FieldError>}
              {minOrderUnmet && (
                <p className="text-xs text-destructive-ink rounded-lg bg-destructive/10 border border-destructive/25 px-3 py-2">
                  الحد الأدنى للطلب في {zone?.name} هو {formatLyd(zone!.minOrder)} — أضف منتجات بقيمة{" "}
                  <span className="font-bold tabular-nums">{formatLyd(zone!.minOrder - subtotal)}</span> أخرى
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="c-address" className="text-xs font-medium text-muted-foreground">العنوان بالتفصيل *</label>
              <textarea
                id="c-address"
                value={addressLine}
                onChange={(e) => {
                  setAddressLine(e.target.value);
                  if (errors.address) setErrors((x) => ({ ...x, address: undefined }));
                }}
                rows={2}
                maxLength={200}
                placeholder="الشارع، أقرب معلم، رقم المنزل…"
                aria-invalid={!!errors.address}
                aria-describedby={errors.address ? "c-address-error" : undefined}
                className="w-full min-h-11 rounded-md border border-input bg-background px-4 py-2.5 text-base transition-[color,box-shadow,border-color] duration-(--t-fast) outline-none placeholder:text-placeholder-text focus-visible:border-primary focus-visible:shadow-(--state-input-focus-halo) aria-invalid:border-destructive aria-invalid:shadow-(--state-input-error-halo)"
              />
              {errors.address && <FieldError id="c-address-error">{errors.address}</FieldError>}
            </div>
          </section>
        )}

        {/* Payment — family ProviderPicker geometry: icon+label tiles.
            r131-F2 (P1-5): the ONE selection grammar — accent border + soft
            accent wash (border-primary bg-primary/10), identical to the
            fulfillment/zone/variant tiles; the old border-orange split is
            retired (--orange ≡ --primary in both themes). */}
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
                  المبالغ فوق 99 د.ل لا تُدعم عبر رمز التحويل السريع — حوّل المبلغ يدوياً إلى الرقم أعلاه
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

        {/* Note */}
        <section className="mt-3 rounded-xl border border-border bg-card p-4 space-y-1.5">
          <label htmlFor="c-note" className="font-semibold text-sm">ملاحظة للطلب</label>
          <textarea
            id="c-note"
            value={customerNote}
            onChange={(e) => setCustomerNote(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="أي تفاصيل إضافية تريد إخبار المتجر بها…"
            className="w-full min-h-11 rounded-md border border-input bg-transparent px-4 py-2.5 text-base transition-[color,box-shadow,border-color] duration-(--t-fast) outline-none placeholder:text-placeholder-text focus-visible:border-primary focus-visible:shadow-(--state-input-focus-halo)"
          />
        </section>
        </form>

        {/* Items summary */}
        <section className="mt-3 rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold text-sm mb-3">
            ملخص السلة <span className="text-muted-foreground font-normal tabular-nums">({items.length} عنصر)</span>
          </h2>
          <ul className="space-y-2.5">
            {items.map((i) => (
              <li key={i.key} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <span className="tabular-nums text-muted-foreground">{i.quantity}×</span>{" "}
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
                </div>
                <span className="tabular-nums font-medium shrink-0">{formatLyd(i.unitPrice * i.quantity)}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      {/* Sticky total bar */}
      <div className="fixed bottom-0 inset-x-0 z-(--z-dropdown) border-t border-border bg-background/95 backdrop-blur-md safe-bottom">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            {deliveryFee > 0 && (
              <div className="text-[11px] text-muted-foreground tabular-nums truncate">
                المنتجات {formatLyd(subtotal)} + توصيل {formatLyd(deliveryFee)}
              </div>
            )}
            <div className="font-heading font-bold text-lg tabular-nums">{formatLyd(total)}</div>
          </div>
          {/* r131-F2 (P0-1): type=submit + form= — the sticky bar stays
              outside <main> yet submits the real checkout form (Enter works
              from every field). size=lg is the canonical 44px money CTA
              (13/600 label canon; the h-12/text-base/font-bold override is
              retired). */}
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
    </div>
  );
}
