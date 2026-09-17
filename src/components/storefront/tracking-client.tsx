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
import {
  ClipboardList,
  Check,
  Truck,
  Store,
  Phone,
  MessageCircle,
  Clock,
  CheckCircle2,
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

export function TrackingClient({ order }: { order: TrackedOrder }) {
  // light polling for live updates
  const [status, setStatus] = React.useState(order.status);
  React.useEffect(() => {
    if (["DELIVERED", "CANCELLED", "REJECTED"].includes(status)) return;
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/public/track/${window.location.pathname.split("/").pop()}`);
        const body = await res.json();
        if (body?.success) setStatus(body.data.order.status);
      } catch {
        /* offline — keep last known */
      }
    }, 15000);
    return () => clearInterval(t);
  }, [status]);

  const isCancelled = status === "CANCELLED" || status === "REJECTED";
  const currentIdx = TRACKING_FLOW.indexOf(status as (typeof TRACKING_FLOW)[number]);

  const flow = order.fulfillmentType === "PICKUP"
    ? TRACKING_FLOW.filter((s) => s !== "OUT_FOR_DELIVERY")
    : TRACKING_FLOW;

  const waNumber = order.business.whatsappNumber ? toE164(order.business.whatsappNumber) : null;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b border-border safe-top sticky top-0 z-20">
        <div className="mx-auto max-w-lg px-4 h-14 flex items-center gap-3">
          <Link href={`/store/${order.business.slug}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Store className="size-4" aria-hidden="true" />
            {order.business.name}
          </Link>
          <ThemeToggle className="ms-auto" />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 space-y-4">
        {/* Order header */}
        <div className="rounded-2xl border border-border bg-card p-5 text-center">
          <h1 className="font-heading text-xl font-bold tabular">{order.orderNumber}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{formatArabicDateTime(order.createdAt)}</p>
          {isCancelled ? (
            <div className="mt-4 rounded-xl bg-destructive/10 border border-destructive/25 px-4 py-3">
              <div className="font-bold text-destructive">
                {status === "REJECTED" ? "لم يتم قبول الطلب" : "تم إلغاء الطلب"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">تواصل مع المتجر لمعرفة المزيد</p>
            </div>
          ) : (
            <div className="mt-3">
              <span className="rounded-full bg-primary/10 text-primary px-4 py-1.5 text-sm font-bold">
                {ORDER_STATUS_AR[status]}
              </span>
            </div>
          )}
          <div className="mt-3 text-xs text-muted-foreground">
            {order.customerName} · {FULFILLMENT_AR[order.fulfillmentType]}
            {order.fulfillmentType === "DELIVERY" && order.area ? ` · ${order.city ?? ""} ${order.area}` : ""}
          </div>
        </div>

        {/* Progress flow */}
        {!isCancelled && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold text-sm mb-4">مسار الطلب</h2>
            <ol className="space-y-1">
              {flow.map((s, i) => {
                const meta = FLOW_AR[s];
                const Icon = meta.icon;
                const done = i < currentIdx;
                const active = i === currentIdx;
                return (
                  <li key={s} className="flex items-center gap-3.5 relative pb-4 last:pb-0">
                    {i < flow.length - 1 && (
                      <span
                        aria-hidden="true"
                        className={cn("absolute top-9 start-[17px] w-0.5 h-[calc(100%-1.75rem)]", done || active ? "bg-primary/40" : "bg-border")}
                      />
                    )}
                    <span
                      className={cn(
                        "relative z-10 flex size-9 items-center justify-center rounded-full border-2 shrink-0",
                        done
                          ? "bg-primary border-primary text-primary-foreground"
                          : active
                            ? "bg-primary/15 border-primary text-primary animate-pulse-soft"
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
                        <div className="text-[11px] text-primary mt-0.5">المرحلة الحالية</div>
                      )}
                    </div>
                    {done && <Check className="size-4 text-primary" aria-hidden="true" />}
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* Items */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold text-sm mb-3">تفاصيل الطلب</h2>
          <ul className="space-y-2.5">
            {order.items.map((item, i) => (
              <li key={i} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <span className="tabular text-muted-foreground">{item.quantity}×</span>{" "}
                  <span className="font-medium">{item.productName}</span>
                  {item.variantName && <span className="text-muted-foreground text-xs"> — {item.variantName}</span>}
                  {item.options.length > 0 && (
                    <div className="text-[11px] text-muted-foreground mt-0.5">{item.options.join("، ")}</div>
                  )}
                </div>
                <span className="tabular nums shrink-0">{formatLyd(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-3 border-t border-border/60 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>المجموع الفرعي</span>
              <span className="tabular nums">{formatLyd(order.subtotal)}</span>
            </div>
            {order.deliveryFee > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>التوصيل</span>
                <span className="tabular nums">{formatLyd(order.deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-1.5 border-t border-border/60">
              <span>الإجمالي</span>
              <span className="tabular nums text-primary">{formatLyd(order.total)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground pt-1 text-xs">
              <span>الدفع</span>
              <span>
                {order.paymentMethod ?? "—"} · {PAYMENT_STATUS_AR[order.paymentStatus]}
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

        <p className="text-center text-[11px] text-muted-foreground pb-6">
          تُحدَّث الحالة تلقائياً كل ١٥ ثانية
        </p>
      </main>
    </div>
  );
}
