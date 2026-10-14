"use client";

import * as React from "react";
import Link from "next/link";
import { formatLyd } from "@/lib/money";
import { formatArabicDateTime } from "@/lib/arabic";
import { toE164 } from "@/lib/phone";
import { waLink, buildStatusUpdateMessage } from "@/lib/whatsapp";
import {
  ORDER_STATUS_AR,
  PAYMENT_STATUS_AR,
  FULFILLMENT_AR,
  TRACKING_FLOW,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { SkipLink } from "@/components/shared/skip-link";
import { ORDER_STATUS_CHIP } from "@/components/shared/status-badges";
import {
  ClipboardList,
  Check,
  Truck,
  Store,
  Phone,
  MessageCircle,
  Clock,
  CheckCircle2,
  Flag,
  PackageCheck,
  WifiOff,
} from "lucide-react";

interface TrackedOrder {
  orderNumber: string;
  status: OrderStatus;
  fulfillmentType: "DELIVERY" | "PICKUP";
  total: number;
  subtotal: number;
  deliveryFee: number;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  customerName: string;
  city: string | null;
  area: string | null;
  createdAt: string;
  items: Array<{ productName: string; variantName: string | null; quantity: number; lineTotal: number; options: string[] }>;
  business: { name: string; slug: string; phone: string | null; whatsappNumber: string | null; logoUrl: string | null };
}

const FLOW_AR: Record<string, { label: string; icon: React.ElementType }> = {
  NEW: { label: "استُقبل الطلب", icon: ClipboardList },
  CONFIRMED: { label: "تم التأكيد", icon: Check },
  PREPARING: { label: "قيد التحضير", icon: Clock },
  READY: { label: "جاهز", icon: CheckCircle2 },
  OUT_FOR_DELIVERY: { label: "في الطريق إليك", icon: Truck },
  DELIVERED: { label: "تم التسليم", icon: CheckCircle2 },
};

export function TrackingClient({
  order,
  placed = false,
  deliveredAt = null,
}: {
  order: TrackedOrder;
  placed?: boolean;
  /* P6-2-f3 (GROUP 2): the DELIVERED stamp's date — resolved server-side
     from the order's status history (the honest source; null when the
     order was delivered after this SSR snapshot — the stamp then renders
     without the date line, never a fabricated one). */
  deliveredAt?: string | null;
}) {
  // light polling for live updates — status AND paymentStatus (F13: the
  // receipt's "الدفع" line used to stay on its SSR snapshot forever)
  const [status, setStatus] = React.useState(order.status);
  const [paymentStatus, setPaymentStatus] = React.useState(order.paymentStatus);
  /* P6-2-f3 (GROUP 2): display-only sync health flag — set when a poll
     FAILS (offline), cleared on the next good poll. The 15s
     visibility-gated cadence itself is untouched (below); this only
     feeds the quiet «آخر تحديث معروف» hint + retry affordance. */
  const [syncFailed, setSyncFailed] = React.useState(false);

  const poll = React.useCallback(async () => {
    try {
      /* r140 (P3-5): الشرطة المائلة الذيلية كانت تنتج "" من split/pop
         فيستطلع /api/public/track/ (404 تبتلع بصمت) — تجريد الشرطات
         الذيلية قبل الانشقاق. */
      const token = window.location.pathname.replace(/\/+$/, "").split("/").pop();
      const res = await fetch(`/api/public/track/${token}`);
      const body = await res.json();
      if (body?.success) {
        setStatus(body.data.order.status);
        setPaymentStatus(body.data.order.paymentStatus);
        setSyncFailed(false);
      }
    } catch {
      /* offline — keep last known (P6-2-f3: and surface it via the
         quiet hint instead of failing silently forever) */
      setSyncFailed(true);
    }
  }, []);

  React.useEffect(() => {
    if (["DELIVERED", "CANCELLED", "REJECTED"].includes(status)) return;
    /* r132 (A2 F13): visibility-gated polling — the same gate the
       dashboard 20s poll got in r131 (dashboard/page.tsx): hidden tabs
       skip the 15s fetch entirely (no battery/network waste on a phone
       left open), and the first visibilitychange back to visible
       refreshes immediately. */
    const t = setInterval(() => {
      if (!document.hidden) poll();
    }, 15000);
    const onVisible = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status, poll]);

  const isCancelled = status === "CANCELLED" || status === "REJECTED";
  const currentIdx = TRACKING_FLOW.indexOf(status as (typeof TRACKING_FLOW)[number]);

  const flow = order.fulfillmentType === "PICKUP"
    ? TRACKING_FLOW.filter((s) => s !== "OUT_FOR_DELIVERY")
    : TRACKING_FLOW;

  const waNumber = order.business.whatsappNumber ? toE164(order.business.whatsappNumber) : null;

  return (
    <div className="min-h-screen bg-muted/30">
      <SkipLink />
      <header className="bg-background border-b border-border safe-top sticky top-0 z-(--z-dropdown)">
        <div className="mx-auto max-w-lg px-4 h-14 flex items-center gap-3">
          <Link href={`/store/${order.business.slug}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Store className="size-4" aria-hidden="true" />
            {order.business.name}
          </Link>
          <ThemeToggle className="ms-auto" />
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto max-w-lg px-4 py-6 space-y-4 focus:outline-none">
        {/* r133 (A1 F9): durable checkout confirmation — the success used
            to live only in checkout component state; ?placed=1 in the URL
            survives refresh/share. */}
        {placed && !isCancelled && (
          <div
            role="status"
            /* P6-2-f3 (GROUP 2): quiet stamp alignment — squared corners
               on the placed banner + its icon well (logic untouched). */
            className="flex items-center gap-3 rounded-sm border border-success/30 bg-success/10 p-4"
          >
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-success/20 text-success-ink"
              aria-hidden="true"
            >
              <CheckCircle2 className="size-5" aria-hidden="true" />
            </span>
            <div>
              <div className="text-sm font-bold text-success-ink">تم استلام طلبك!</div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                سنتبع حالة طلبك هنا — احفظ هذا الرابط للمتابعة لاحقاً.
              </p>
            </div>
          </div>
        )}

        {/* Order header */}
        <div className="rounded-xl border border-border bg-card p-5 text-center">
          {/* r128-F8 (B22): mono numerals — order number + receipt figures ride
              the mixed-script mono stack (Latin/digits mono, Arabic sans) */}
          <h1 className="text-xl font-bold tabular-nums font-mono">{order.orderNumber}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{formatArabicDateTime(order.createdAt)}</p>
          {isCancelled ? (
            /* P6-2-f3 (GROUP 2): quiet stamp alignment — the
               cancelled/rejected card squares to the family stamp
               (rose for rejection, grey for cancellation — the
               ORDER_STATUS_CHIP mapping); branches/logic untouched. */
            <div
              className={cn(
                "mt-4 flex items-start gap-3 rounded-sm border px-4 py-3 text-start",
                status === "REJECTED"
                  ? "border-(--c-rose-ink)/35 bg-(--c-rose-bg)"
                  : "border-(--c-grey-ink)/35 bg-(--c-grey-bg)"
              )}
            >
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  status === "REJECTED" ? "bg-(--c-rose-ink)" : "bg-(--c-grey-ink)"
                )}
                aria-hidden="true"
              />
              <div>
                <div
                  className={cn(
                    "font-bold",
                    status === "REJECTED" ? "text-(--c-rose-deep)" : "text-(--c-grey-deep)"
                  )}
                >
                  {status === "REJECTED" ? "لم يتم قبول الطلب" : "تم إلغاء الطلب"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">تواصل مع المتجر لمعرفة المزيد</p>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              {/* STATUS STAMP (r152): the shipping-stamp chip — squared
                  stamp corner + 1px family border over the solid family
                  ground (ORDER_STATUS_CHIP carries the family trio). */}
              <span
                /* r140 (P3-10): الحالة تتغير كل 15 ثانية بالاستطلاع — بلا
                   aria-live كان الانتقال صامتًا لقارئ الشاشة (لافتة
                   placed=1 عندها role=status منذ r133؛ الشريحة نفسها لم
                   تكن معلنة). */
                role="status"
                aria-live="polite"
                className={cn(
                  /* P10-1b: shadow-sm = --elev-1 — التوأم الليلي للتوهين؛
                     الحرفية السوداء 6% كانت تختفي على بطاقة الليل. */
                  "inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-semibold shadow-sm",
                  ORDER_STATUS_CHIP[status]
                )}
              >
                <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                {ORDER_STATUS_AR[status]}
              </span>
            </div>
          )}
          <div className="mt-3 text-xs text-muted-foreground">
            {order.customerName} · {FULFILLMENT_AR[order.fulfillmentType]}
            {order.fulfillmentType === "DELIVERY" && order.area ? ` · ${order.city ?? ""} ${order.area}` : ""}
          </div>
        </div>

        {/* Progress flow — the ROUTE & NODE visualization (r152): the
            six-stage TRACKING_FLOW backbone is the literal dashed
            dispatch road — 2px dashed route line threading circular
            station nodes. The STATE LOGIC is untouched: the same
            TRACKING_FLOW array, the same PICKUP filter, the same
            done/active/pending derivation (verified against
            lib/order-machine transitions — no invented states). */}
        {!isCancelled && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold text-sm mb-4">مسار الطلب</h2>
            <ol className="space-y-1">
              {flow.map((s, i) => {
                const meta = FLOW_AR[s];
                const Icon = meta.icon;
                const done = i < currentIdx;
                const active = i === currentIdx;
                return (
                  <li key={s} className="flex items-center gap-3.5 relative pb-4">
                    {/* P6-2-f3 (GROUP 2): EVERY station now draws its spine
                       (was i < flow.length - 1) — the last leg connects the
                       final station to the terminus ring below through the
                       same pb-4 overflow geometry. */}
                    {i < flow.length && (
                      /* r152: the dashed ROUTE segment — node-center →
                         next-node-center (station geometry: top 18px =
                         half the 36px node, h-full lands on the next
                         node's center through the pb-4 gap). Traveled
                         road = delivery orange at 50%; pending road =
                         the hairline. */
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute top-[18px] h-full w-0 start-[17px] border-s-2 border-dashed",
                          done || active ? "border-primary/50" : "border-border"
                        )}
                      />
                    )}
                    <span
                      className={cn(
                        "relative z-10 flex size-9 items-center justify-center rounded-full border-2 shrink-0",
                        done
                          ? "bg-primary border-primary text-primary-foreground"
                          : active
                            ? "bg-accent-soft border-primary text-accent-foreground animate-pulse-soft ring-4 ring-primary/10"
                            : "bg-muted border-border text-muted-foreground/60"
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <div className="flex-1">
                      <div className={cn("text-sm font-semibold", !done && !active && "text-muted-foreground")}>
                        {meta.label}
                      </div>
                      {active && (
                        <div className="text-[11px] text-accent-foreground mt-0.5">المرحلة الحالية</div>
                      )}
                    </div>
                    {done && <Check className="size-4 text-accent-foreground" aria-hidden="true" />}
                  </li>
                );
              })}
              {/* P6-2-f3 (GROUP 2): the DESTINATION TERMINUS — the ring
                  after the last station. DELIVERED = terminus reached →
                  CLOSED ring (solid border + quiet ring halo); pending →
                  OPEN dashed ring (the road still unbuilt). The previous
                  station's spine reaches into it through the same
                  pb-4 overflow geometry. */}
              <li className="flex items-center gap-3.5 relative">
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative z-10 flex size-9 items-center justify-center rounded-full border-2 shrink-0",
                    status === "DELIVERED"
                      ? "border-primary bg-primary/10 text-accent-foreground ring-2 ring-primary/15"
                      : "border-dashed border-border bg-card text-muted-foreground/60"
                  )}
                >
                  <Flag className="size-4" aria-hidden="true" />
                </span>
                <div className="flex-1">
                  <div
                    className={cn(
                      "text-sm font-semibold",
                      status !== "DELIVERED" && "text-muted-foreground"
                    )}
                  >
                    الوجهة
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {status === "DELIVERED" ? "تم الوصول — نهاية الطريق" : "نهاية الطريق بانتظار طلبك"}
                  </div>
                </div>
              </li>
            </ol>
            {status === "DELIVERED" && (
              /* P6-2-f3 (GROUP 2): the delivered moment — a composed
                 TERMINAL STAMP instead of just the final node: the big
                 squared mint-family franked block (2px dashed stamp
                 border + icon well) + the delivery date from the order's
                 status history (deliveredAt prop; absent → no date line,
                 never a fabricated date). */
              <div className="mt-5 flex items-center gap-3.5 rounded-sm border-2 border-dashed border-(--c-mint-ink)/45 bg-(--c-mint-bg) p-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-sm border border-(--c-mint-ink)/35 bg-card text-(--c-mint-deep)">
                  <PackageCheck className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="font-heading font-bold text-sm text-(--c-mint-deep)">تم التسليم</div>
                  {deliveredAt && (
                    <div className="mt-0.5 text-xs text-(--c-mint-deep)/80">
                      {formatArabicDateTime(deliveredAt)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Items */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold text-sm mb-3">تفاصيل الطلب</h2>
          <ul className="space-y-2.5">
            {order.items.map((item, i) => (
              <li key={i} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <span className="tabular-nums text-muted-foreground">{item.quantity}×</span>{" "}
                  <span className="font-medium">{item.productName}</span>
                  {item.variantName && <span className="text-muted-foreground text-xs"> — {item.variantName}</span>}
                  {item.options.length > 0 && (
                    <div className="text-[11px] text-muted-foreground mt-0.5">{item.options.join("، ")}</div>
                  )}
                </div>
                <span className="tabular-nums font-mono shrink-0">{formatLyd(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-3 border-t border-border/60 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>المجموع الفرعي</span>
              <span className="tabular-nums font-mono">{formatLyd(order.subtotal)}</span>
            </div>
            {order.deliveryFee > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>التوصيل</span>
                <span className="tabular-nums font-mono">{formatLyd(order.deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-1.5 border-t border-border/60">
              <span>الإجمالي</span>
              <span className="tabular-nums font-mono text-accent-foreground">{formatLyd(order.total)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground pt-1 text-xs">
              <span>الدفع</span>
              <span>
                {order.paymentMethod ?? "—"} · {PAYMENT_STATUS_AR[paymentStatus]}
              </span>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="flex gap-2">
          {order.business.phone && (
            <a
              href={`tel:${order.business.phone}`}
              className="flex-1 h-11 rounded-lg border border-border bg-card flex items-center justify-center gap-2 text-sm font-semibold hover:bg-muted transition-colors"
            >
              <Phone className="size-4" aria-hidden="true" />
              اتصال بالمتجر
            </a>
          )}
          {waNumber && (
            <a
              href={waLink(waNumber, buildStatusUpdateMessage(order.orderNumber, status, order.business.name))}
              target="_blank"
              rel="noopener noreferrer"
              className="whatsapp-btn flex-1 h-11 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-colors"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              واتساب المتجر
            </a>
          )}
        </div>

        {syncFailed && !isCancelled ? (
          /* P6-2-f3 (GROUP 2): poll-failure hint — the last known state
             stays on screen (the catch keeps it); this quiet muted line
             + manual retry replaces the 15s footnote while offline. The
             visibility-gated cadence above is untouched. */
          <div
            role="status"
            aria-live="polite"
            className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 pb-6 text-center"
          >
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <WifiOff className="size-3 shrink-0" aria-hidden="true" />
              آخر تحديث معروف — تعذّر الاتصال
            </p>
            <button
              type="button"
              onClick={poll}
              className="text-[11px] font-medium text-accent-foreground underline underline-offset-2 transition-colors hover:text-foreground"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <p className="text-center text-[11px] text-muted-foreground pb-6">
            تُحدَّث الحالة تلقائياً كل 15 ثانية
          </p>
        )}
      </main>
    </div>
  );
}
