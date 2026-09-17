"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { useCart, cartEstimatedSubtotal } from "@/hooks/use-cart";
import { formatLyd } from "@/lib/money";
import { normalizeLibyanPhone, formatPhoneDisplay, toE164 } from "@/lib/phone";
import { FULFILLMENT_AR, PAYMENT_TYPE_AR, LIBYA_CITIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { randomUUID } from "@/lib/uuid";
import {
  ArrowRight,
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
} from "lucide-react";

interface StoreData {
  deliveryZones: Array<{ id: string; name: string; fee: number; minOrder: number }>;
  paymentMethods: Array<{ id: string; type: string; name: string; instructions: string | null; config: string | null }>;
}

type Step = "form" | "success";

export function CheckoutClient({
  slug,
  business,
}: {
  slug: string;
  business: { name: string; logoUrl: string | null; whatsappNumber: string | null };
}) {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const clearCart = useCart((s) => s.clear);
  const [data, setData] = React.useState<StoreData | null>(null);
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

  React.useEffect(() => {
    api
      .get<StoreData>(`/api/public/store/${slug}`)
      .then((r) => {
        setData(r.data);
        if (r.data.deliveryZones.length > 0) setZoneId(r.data.deliveryZones[0].id);
        if (r.data.paymentMethods.length > 0) setPaymentMethodId(r.data.paymentMethods[0].id);
        if (r.data.deliveryZones.length === 0) setFulfillment("PICKUP");
      })
      .catch(() => toast.error("تعذر تحميل بيانات المتجر"));
  }, [slug]);

  const subtotal = cartEstimatedSubtotal(items);
  const zone = data?.deliveryZones.find((z) => z.id === zoneId) ?? null;
  const deliveryFee = fulfillment === "DELIVERY" ? (zone?.fee ?? 0) : 0;
  const total = subtotal + deliveryFee;
  const paymentMethod = data?.paymentMethods.find((p) => p.id === paymentMethodId) ?? null;
  const paymentConfig = paymentMethod?.config ? (JSON.parse(paymentMethod.config) as { number?: string }) : null;

  const minOrderUnmet: boolean =
    fulfillment === "DELIVERY" && !!zone && zone.minOrder > 0 && subtotal < zone.minOrder;

  async function submit() {
    // validation
    if (name.trim().length < 2) return toast.error("أدخل اسمك الكامل");
    if (!normalizeLibyanPhone(phone)) return toast.error("رقم الهاتف غير صحيح — مثال: 0912345678");
    if (fulfillment === "DELIVERY" && !zoneId) return toast.error("اختر منطقة التوصيل");
    if (fulfillment === "DELIVERY" && !addressLine.trim()) return toast.error("أدخل عنوانك بالتفصيل");
    if (minOrderUnmet) return toast.error(`الحد الأدنى للطلب في ${zone?.name} هو ${formatLyd(zone!.minOrder)}`);
    if (!paymentMethodId) return toast.error("اختر طريقة الدفع");
    if (items.length === 0) return toast.error("سلتك فارغة");

    setSubmitting(true);
    try {
      const idempotencyKey = randomUUID();
      const r = await api.post<{ order: { orderNumber: string; publicToken: string; total: number; replay?: boolean }; whatsapp: { number: string; message: string } | null }>(
        "/api/public/orders",
        {
          slug,
          idempotencyKey,
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
      setResult({ ...r.data.order, whatsapp: r.data.whatsapp });
      setStep("success");
      clearCart();
      window.scrollTo({ top: 0 });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر إرسال الطلب، حاول مرة أخرى");
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
          <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="size-10" aria-hidden="true" />
          </div>
          <h1 className="mt-6 font-heading text-2xl font-bold">تم استلام طلبك! 🎉</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            رقم طلبك هو
          </p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/25 px-5 py-2.5">
            <ClipboardList className="size-5 text-primary" aria-hidden="true" />
            <span className="font-heading font-bold text-lg text-primary tabular">{result.orderNumber}</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            الإجمالي: <span className="font-bold text-foreground tabular nums">{formatLyd(result.total)}</span>
          </p>

          <div className="mt-6 space-y-2.5">
            <Button asChild className="w-full h-12 font-bold text-base">
              <Link href={`/track/${result.publicToken}`}>
                تتبع حالة الطلب
                <ArrowRight className="size-5 ms-2 rotate-180" aria-hidden="true" />
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
            <span dir="ltr" className="tabular">{trackUrl}</span>
          </p>
        </div>
      </div>
    );
  }

  // ===== EMPTY CART =====
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-muted border border-border">
            <ShoppingBag className="size-7 text-muted-foreground" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-heading font-bold text-xl">سلتك فارغة</h1>
          <p className="mt-2 text-sm text-muted-foreground">أضف منتجات من المتجر لتتمكن من إتمام الطلب</p>
          <Button asChild className="mt-5 h-11 px-6 font-semibold">
            <Link href={`/store/${slug}`}>
              <ArrowRight className="size-4 me-2 rotate-180" aria-hidden="true" />
              العودة للمتجر
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // ===== CHECKOUT FORM =====
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b border-border safe-top sticky top-0 z-30">
        <div className="mx-auto max-w-2xl px-4 h-14 flex items-center gap-3">
          <Link href={`/store/${slug}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors" aria-label="العودة للمتجر">
            <ArrowRight className="size-4" aria-hidden="true" />
            العودة
          </Link>
          <div className="ms-auto font-heading font-bold text-sm">{business.name}</div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5 pb-32">
        <h1 className="font-heading text-xl font-bold">إتمام الطلب</h1>

        {/* Fulfillment */}
        <section className="mt-4 rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold text-sm mb-3">طريقة الاستلام</h2>
          <div className="grid grid-cols-2 gap-2">
            {(data?.deliveryZones.length ? ["DELIVERY", "PICKUP"] : ["PICKUP"]).map((t) => {
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
                  <Icon className={`size-5 shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
                  <div>
                    <div className="text-sm font-semibold">{FULFILLMENT_AR[t as "DELIVERY" | "PICKUP"]}</div>
                    {t === "DELIVERY" && <div className="text-[11px] text-muted-foreground mt-0.5">حسب منطقتك</div>}
                  </div>
                </button>
              );
            })}
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
              <input
                id="c-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                maxLength={80}
                placeholder="اسمك"
                className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="c-phone" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Phone className="size-3" aria-hidden="true" />
                رقم الهاتف *
              </label>
              <input
                id="c-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                inputMode="tel"
                dir="ltr"
                maxLength={20}
                placeholder="0912345678"
                className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm text-start tabular focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </section>

        {/* Delivery details */}
        {fulfillment === "DELIVERY" && (
          <section className="mt-3 rounded-xl border border-border bg-card p-4 space-y-3.5">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <MapPin className="size-4 text-primary" aria-hidden="true" />
              عنوان التوصيل
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="c-city" className="text-xs font-medium text-muted-foreground">المدينة *</label>
                <select
                  id="c-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {LIBYA_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="c-area2" className="text-xs font-medium text-muted-foreground">المنطقة</label>
                <input
                  id="c-area2"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  maxLength={60}
                  placeholder="مثال: تاجوراء"
                  className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">منطقة التوصيل *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {data?.deliveryZones.map((z) => {
                  const selected = zoneId === z.id;
                  return (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => setZoneId(z.id)}
                      aria-pressed={selected}
                      className={`rounded-xl border p-2.5 text-center transition-colors ${
                        selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="text-xs font-semibold truncate">{z.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 tabular nums">
                        {z.fee === 0 ? "مجاناً" : formatLyd(z.fee)}
                      </div>
                      {z.minOrder > 0 && (
                        <div className="text-[9px] text-muted-foreground/70 tabular nums">حد أدنى {formatLyd(z.minOrder)}</div>
                      )}
                    </button>
                  );
                })}
              </div>
              {minOrderUnmet && (
                <p className="text-xs text-destructive rounded-lg bg-destructive/10 border border-destructive/25 px-3 py-2">
                  الحد الأدنى للطلب في {zone?.name} هو {formatLyd(zone!.minOrder)} — أضف منتجات بقيمة{" "}
                  <span className="font-bold tabular">{formatLyd(zone!.minOrder - subtotal)}</span> أخرى
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="c-address" className="text-xs font-medium text-muted-foreground">العنوان بالتفصيل *</label>
              <textarea
                id="c-address"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                rows={2}
                maxLength={200}
                placeholder="الشارع، أقرب معلم، رقم المنزل..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </section>
        )}

        {/* Payment */}
        <section className="mt-3 rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Coins className="size-4 text-primary" aria-hidden="true" />
            طريقة الدفع
          </h2>
          <div className="space-y-2">
            {data?.paymentMethods.map((p) => {
              const selected = paymentMethodId === p.id;
              return (
                <div key={p.id}>
                  <button
                    type="button"
                    onClick={() => setPaymentMethodId(p.id)}
                    aria-pressed={selected}
                    className={`w-full flex items-center gap-3 rounded-xl border p-3.5 text-start transition-colors ${
                      selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <span className={`flex size-5 rounded-full border-2 shrink-0 items-center justify-center ${selected ? "border-primary" : "border-border"}`} aria-hidden="true">
                      {selected && <span className="size-2.5 rounded-full bg-primary" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{p.name}</div>
                      {p.instructions && (
                        <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{p.instructions}</div>
                      )}
                    </div>
                  </button>
                  {selected && paymentConfig?.number && (
                    <div className="mt-1.5 mx-1 rounded-lg bg-muted/60 border border-border/60 px-3.5 py-2.5 text-xs flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">حوّل إلى الرقم:</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(paymentConfig.number!);
                          toast.success("تم نسخ الرقم");
                        }}
                        className="font-bold tabular hover:text-primary transition-colors"
                        dir="ltr"
                      >
                        {formatPhoneDisplay(paymentConfig.number)}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
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
            placeholder="أي تفاصيل إضافية تريد إخبار المتجر بها..."
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </section>

        {/* Items summary */}
        <section className="mt-3 rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold text-sm mb-3">
            ملخص السلة <span className="text-muted-foreground font-normal tabular">({items.length} عنصر)</span>
          </h2>
          <ul className="space-y-2.5">
            {items.map((i) => (
              <li key={i.key} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <span className="tabular text-muted-foreground">{i.quantity}×</span>{" "}
                  <span className="font-medium">{i.productName}</span>
                  {i.variantName && <span className="text-muted-foreground text-xs"> — {i.variantName}</span>}
                  {i.options.length > 0 && (
                    <div className="text-[11px] text-muted-foreground mt-0.5">{i.options.map((o) => o.name).join("، ")}</div>
                  )}
                  {i.note && <div className="text-[11px] text-warning-foreground mt-0.5">📝 {i.note}</div>}
                </div>
                <span className="tabular nums font-medium shrink-0">{formatLyd(i.unitPrice * i.quantity)}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      {/* Sticky total bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur-md safe-bottom">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            {deliveryFee > 0 && (
              <div className="text-[11px] text-muted-foreground tabular nums truncate">
                المنتجات {formatLyd(subtotal)} + توصيل {formatLyd(deliveryFee)}
              </div>
            )}
            <div className="font-heading font-bold text-lg tabular nums">{formatLyd(total)}</div>
          </div>
          <Button onClick={submit} disabled={submitting || minOrderUnmet} className="h-12 px-8 text-base font-bold">
            {submitting ? (
              <>
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                جارٍ الإرسال...
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
