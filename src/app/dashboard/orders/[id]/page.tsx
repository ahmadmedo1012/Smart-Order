"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/client";
import { m } from "motion/react";
import { useBusiness } from "@/components/dashboard/shell";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
  CustomerConfirmedBadge,
} from "@/components/shared/status-badges";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { pageTitleClass } from "@/components/dashboard/page-header";
import { OrderDetailSkeleton } from "@/components/dashboard/skeletons";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatLyd } from "@/lib/money";
import { formatArabicDateTime } from "@/lib/arabic";
import { formatPhoneDisplay, toE164 } from "@/lib/phone";
import { waLink, buildCustomerConfirmationMessage } from "@/lib/whatsapp";
import { getAllowedTransitions } from "@/lib/order-machine";
import {
  FULFILLMENT_AR,
  ORDER_STATUS_AR,
  PAYMENT_TYPE_AR,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/constants";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowLeft,
  MoreHorizontal,
  MessageCircle,
  Phone,
  MapPin,
  StickyNote,
  Clock,
  Check,
  Ban,
  Printer,
  ChevronDown,
  ClipboardList,
  CheckCircle2,
  ChefHat,
  Bell,
  Truck,
  PackageCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";

interface OrderDetail {
  id: string;
  orderNumber: string;
  publicToken: string;
  status: OrderStatus;
  fulfillmentType: "DELIVERY" | "PICKUP";
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paymentMethodId: string | null;
  paymentMethodName: string | null;
  paymentType: string | null;
  paymentStatus: PaymentStatus;
  /* W6-B7: the customer's one-tap «أؤكد طلبي» stamp from the public
     tracking page (null = not confirmed) — rendered as the «مؤكد من
     العميل» mint flag + the confirmation time line. */
  customerConfirmedAt: string | null;
  customerName: string;
  customerPhone: string;
  city: string | null;
  area: string | null;
  addressLine: string | null;
  customerNote: string | null;
  internalNote: string | null;
  source: string;
  createdAt: string;
  items: Array<{
    id: string;
    productName: string;
    variantName: string | null;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    note: string | null;
    optionsJson: string | null;
  }>;
  history: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    changedByName: string | null;
    createdAt: string;
  }>;
  customer: {
    id: string;
    name: string;
    phone: string;
    notes: string | null;
  } | null;
  business: {
    id: string;
    name: string;
    slug: string;
    whatsappNumber: string | null;
    phone: string | null;
  };
}

/* r131 (F3, A5 P2-3): order-status timeline rides the owner-timeline
 anatomy — 32px circular PASTEL icon nodes on the 9-family grounds
 (same status→family map as the chips), 12px row padding, 60ms
 stagger-in (RM-gated by the shell MotionConfig).
 Phase 6 (route grammar): the spine is now the DASHED ROUTE itself
 (globals.css .route-spine-segment — the same 2px dashed road as
 tracking/dividers), and TERMINAL states (DELIVERED/CANCELLED/
 REJECTED) render their label as a squared family STAMP (the
 end-of-route franking). */
const TIMELINE_NODE: Record<
  string,
  { icon: LucideIcon; classes: string; stamp?: string }
> = {
  NEW: {
    icon: ClipboardList,
    classes: "bg-(--c-copper-bg) text-(--c-copper-ink)",
  },
  CONFIRMED: {
    icon: CheckCircle2,
    classes: "bg-(--c-sky-bg) text-(--c-sky-ink)",
  },
  PREPARING: {
    icon: ChefHat,
    classes: "bg-(--c-yellow-bg) text-(--c-yellow-ink)",
  },
  READY: { icon: Bell, classes: "bg-(--c-copper-bg) text-(--c-copper-ink)" },
  OUT_FOR_DELIVERY: {
    icon: Truck,
    classes: "bg-(--c-sky-bg) text-(--c-sky-ink)",
  },
  DELIVERED: {
    icon: PackageCheck,
    classes: "bg-(--c-mint-bg) text-(--c-mint-ink)",
    stamp: "border-(--c-mint-ink)/35 bg-(--c-mint-bg) text-(--c-mint-deep)",
  },
  CANCELLED: {
    icon: Ban,
    classes: "bg-(--c-grey-bg) text-(--c-grey-ink)",
    stamp: "border-(--c-grey-ink)/35 bg-(--c-grey-bg) text-(--c-grey-deep)",
  },
  REJECTED: {
    icon: XCircle,
    classes: "bg-(--c-rose-bg) text-(--c-rose-ink)",
    stamp: "border-(--c-rose-ink)/35 bg-(--c-rose-bg) text-(--c-rose-deep)",
  },
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { businessId, perms } = useBusiness();
  const [order, setOrder] = React.useState<OrderDetail | null>(null);
  const [error, setError] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [confirmAction, setConfirmAction] = React.useState<{
    to: OrderStatus;
    label: string;
  } | null>(null);
  /* r133 (A1 F7): PAID/REFUNDED are money mutations — REFUNDED is
     irreversible (no UNPAID restore path anywhere), so both ride the
     same in-app ConfirmDialog grammar as destructive transitions
     instead of firing directly from the dropdown/card button. */
  const [confirmPayment, setConfirmPayment] = React.useState<{
    ps: PaymentStatus;
    label: string;
  } | null>(null);
  const [actionNote, setActionNote] = React.useState("");
  const [internalNote, setInternalNote] = React.useState("");

  const load = React.useCallback(() => {
    if (!id) return;
    api
      .get<{ order: OrderDetail }>(`/api/orders/${id}?businessId=${businessId}`)
      .then((r) => {
        setError(false);
        setOrder(r.data.order);
        setInternalNote(r.data.order.internalNote ?? "");
      })
      .catch(() => setError(true));
  }, [id, businessId]);

  React.useEffect(load, [load]);

  async function transition(to: OrderStatus, note?: string) {
    setBusy(true);
    try {
      await api.patch(`/api/orders/${id}`, {
        businessId,
        status: to,
        statusNote: note || undefined,
      });
      toast.success("تم تحديث حالة الطلب");
      setConfirmAction(null);
      setActionNote("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر تحديث الحالة");
    } finally {
      setBusy(false);
    }
  }

  async function setPaymentStatus(ps: PaymentStatus) {
    setBusy(true);
    try {
      await api.patch(`/api/orders/${id}`, { businessId, paymentStatus: ps });
      toast.success("تم تحديث حالة الدفع");
      setConfirmPayment(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر التحديث");
    } finally {
      setBusy(false);
    }
  }

  async function saveInternalNote() {
    setBusy(true);
    try {
      await api.patch(`/api/orders/${id}`, { businessId, internalNote });
      toast.success("حُفظت الملاحظة الداخلية");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر الحفظ");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorState retry={() => { setError(false); load(); }} />;
  if (!order) {
    /* r131 (F3, A5 P2-7): shape-matched detail skeleton (back chip +
       hero row + KPI tiles + cards), not generic bars. */
    return <OrderDetailSkeleton />;
  }

  const transitions = getAllowedTransitions(
    order.status,
    order.fulfillmentType,
  );
  /* r134 (V2 P3): the API enforces orders.cancel on CANCELLED/REJECTED
     (this round); gate the UI too so STAFF never sees dead destructive
     buttons that 403 on click. Owner/Admin keep everything. */
  const canCancel = perms.includes("orders.cancel");
  const visibleTransitions = canCancel
    ? transitions
    : transitions.filter(
        (t) => t.to !== "CANCELLED" && t.to !== "REJECTED",
      );
  const customerWa = waLink(
    toE164(order.customerPhone),
    buildCustomerConfirmationMessage(
      {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        items: order.items.map((i) => ({
          productName: i.productName,
          variantName: i.variantName,
          quantity: i.quantity,
          lineTotal: i.lineTotal,
        })),
        fulfillmentType: order.fulfillmentType,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        total: order.total,
      },
      order.business.name,
      /* (phase4 W1-SO): رابط التتبع المباشر يُشارك مع العميل فعليًا —
         publicToken كان يصل من الـAPI بلا مستهلك والـFAQ يعدّ بالمشاركة.
         النافذة الحالية هي أصل الرابط (اللوحة تُخدم من نطاق المنتج نفسه). */
      { trackUrl: `${window.location.origin}/track/${order.publicToken}` },
    ),
  );

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          {/* Canonical back chip (training.css:218-242): r150 §8 —
 the 44px touch floor (was the 40px hit), r-sm, negative
 inline-start inset, hover surface-2. */}
          <Link
            href="/dashboard/orders"
            className="-ms-2 inline-flex h-11 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowRight className="size-4" aria-hidden="true" />
            العودة للطلبات
          </Link>
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <h1 className={`${pageTitleClass} tabular-nums font-mono`}>
              {order.orderNumber}
            </h1>
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
            {/* W6-B7: the COD-confirmation flag — the customer's own tap,
                never an operator action (the history row says who). */}
            {order.customerConfirmedAt && (
              <CustomerConfirmedBadge confirmedAt={order.customerConfirmedAt} />
            )}
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground flex items-center gap-1.5 font-mono tabular-nums">
            <Clock className="size-3.5" aria-hidden="true" />
            {formatArabicDateTime(order.createdAt)}
            {/* W6-B7: the confirmation stamp rides the same mono fact
                voice as the order's own clock — a real timestamp from the
                server, never fabricated. */}
            {order.customerConfirmedAt && (
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true">·</span>
                <CheckCircle2 className="size-3.5 text-(--c-mint-deep)" aria-hidden="true" />
                <span className="text-(--c-mint-deep)">
                  مؤكد من العميل — {formatArabicDateTime(order.customerConfirmedAt)}
                </span>
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 no-print">
          {/* Context-aware actions */}
          {visibleTransitions.length > 0 && (
            <>
              {/* Primary: first non-destructive */}
              {(() => {
                const primary = visibleTransitions.find((t) => !t.destructive);
                const destructive = visibleTransitions.filter((t) => t.destructive);
                return (
                  <>
                    {primary && (
                      <Button
                        onClick={() =>
                          setConfirmAction({
                            to: primary.to,
                            label: primary.label,
                          })
                        }
                        disabled={busy}
                        className="font-semibold"
                      >
                        {primary.label}
                        {/* r150: honest affordance — the action opens the
                            transition-confirm dialog, not a dropdown; the
                            ChevronDown arrow was a misleading affordance. */}
                        <ArrowLeft className="size-4" aria-hidden="true" />
                      </Button>
                    )}
                    {destructive.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label="إجراءات أخرى"
                          >
                            <MoreHorizontal className="size-4.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {destructive.map((t) => (
                            <DropdownMenuItem
                              key={t.to}
                              onClick={() =>
                                setConfirmAction({ to: t.to, label: t.label })
                              }
                              className="text-destructive-ink focus:text-destructive-ink"
                            >
                              <Ban className="size-4 me-2" aria-hidden="true" />
                              {t.label}
                            </DropdownMenuItem>
                          ))}
                          {order.paymentStatus !== "PAID" &&
                            order.status !== "CANCELLED" &&
                            order.status !== "REJECTED" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setConfirmPayment({
                                    ps: "PAID",
                                    label: "تأكيد استلام الدفع",
                                  })
                                }
                              >
                                <Check
                                  className="size-4 me-2"
                                  aria-hidden="true"
                                />
                                تأكيد استلام الدفع
                              </DropdownMenuItem>
                            )}
                          {order.paymentStatus === "PAID" && (
                            <DropdownMenuItem
                              onClick={() =>
                                setConfirmPayment({
                                  ps: "REFUNDED",
                                  label: "تسجيل استرجاع المبلغ",
                                })
                              }
                            >
                              <Check
                                className="size-4 me-2"
                                aria-hidden="true"
                              />
                              تسجيل استرجاع المبلغ
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </>
                );
              })()}
            </>
          )}
          {transitions.length === 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={busy}>
                  طلب منتهٍ
                  <ChevronDown className="size-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {order.paymentStatus === "PAID" && (
                  <DropdownMenuItem
                    onClick={() =>
                      setConfirmPayment({
                        ps: "REFUNDED",
                        label: "تسجيل استرجاع المبلغ",
                      })
                    }
                  >
                    تسجيل استرجاع المبلغ
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={() => window.print()}
            aria-label="طباعة الطلب"
          >
            <Printer className="size-4.5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Items + totals */}
        <Card className="lg:col-span-3 border-border/80 bg-card rounded-xl">
          <div className="p-5">
            <h2 className="font-heading font-semibold">تفاصيل الطلب</h2>
            <ul className="mt-4 divide-y divide-border/60">
              {order.items.map((item) => {
                const options: Array<{ name: string }> = item.optionsJson
                  ? JSON.parse(item.optionsJson)
                  : [];
                return (
                  <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">
                          <span className="tabular-nums text-muted-foreground">
                            {item.quantity}×
                          </span>{" "}
                          {item.productName}
                          {item.variantName && (
                            <span className="text-muted-foreground">
                              {" "}
                              — {item.variantName}
                            </span>
                          )}
                        </div>
                        {options.length > 0 && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            إضافات: {options.map((o) => o.name).join("، ")}
                          </div>
                        )}
                        {item.note && (
                          <div className="mt-1 text-xs text-warning-ink flex items-center gap-1">
                            <StickyNote className="size-3" aria-hidden="true" />
                            {item.note}
                          </div>
                        )}
                      </div>
                      <div className="text-end shrink-0">
                        {/* Phase 6: money figures ride IBM Plex Mono —
                            the operational code voice (the order number
                            already speaks it since r152). */}
                        <div className="font-semibold font-mono tabular-nums">
                          {formatLyd(item.lineTotal)}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
                          {formatLyd(item.unitPrice)} × {item.quantity}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 pt-4 border-t space-y-2 text-sm">
              {/* Phase 6: the totals ledger rides IBM Plex Mono. */}
              <div className="flex justify-between text-muted-foreground">
                <span>المجموع الفرعي</span>
                <span className="font-mono tabular-nums">
                  {formatLyd(order.subtotal)}
                </span>
              </div>
              {order.deliveryFee > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>رسوم التوصيل</span>
                  <span className="font-mono tabular-nums">
                    {formatLyd(order.deliveryFee)}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1 border-t">
                <span>الإجمالي</span>
                <span className="font-mono tabular-nums text-accent-foreground">
                  {formatLyd(order.total)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Customer + delivery + payment */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/80 bg-card rounded-xl p-5">
            <h2 className="font-heading font-semibold">العميل</h2>
            {/* r131 (F3, A5 P2-12): kv-row hairline rhythm (owner.css:271-281)
 — 10px vertical padding + 1px hairline separators; phones
 stay dir=ltr and ride tnum digits. */}
            <div className="mt-1 text-sm">
              <div className="flex items-center justify-between gap-2 border-b border-border py-2.5">
                <span className="text-muted-foreground">الاسم</span>
                {order.customer ? (
                  <Link
                    href={`/dashboard/customers/${order.customer.id}`}
                    className="font-medium hover:text-accent-foreground truncate"
                  >
                    {order.customerName}
                  </Link>
                ) : (
                  <span className="font-medium truncate">
                    {order.customerName}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 border-b border-border py-2.5">
                <span className="text-muted-foreground">الهاتف</span>
                <a
                  href={`tel:${order.customerPhone}`}
                  className="font-medium font-mono tabular-nums hover:text-accent-foreground"
                  dir="ltr"
                >
                  <bdi>{formatPhoneDisplay(order.customerPhone)}</bdi>
                </a>
              </div>
              {order.fulfillmentType === "DELIVERY" && (
                <>
                  <div className="flex items-start justify-between gap-2 border-b border-border py-2.5">
                    <span className="text-muted-foreground shrink-0">
                      العنوان
                    </span>
                    <span className="text-end">
                      {[order.city, order.area].filter(Boolean).join(" — ") ||
                        "—"}
                    </span>
                  </div>
                  {order.addressLine && (
                    <div className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-sm mt-2.5">
                      <MapPin
                        className="size-4 text-muted-foreground shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span>{order.addressLine}</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex items-center justify-between gap-2 py-2.5">
                <span className="text-muted-foreground">النوع</span>
                <span>{FULFILLMENT_AR[order.fulfillmentType]}</span>
              </div>
            </div>
            <div className="mt-4 flex gap-2 no-print">
              <Button asChild variant="outline" size="sm" className="flex-1">
                <a href={`tel:${order.customerPhone}`}>
                  <Phone className="size-4" aria-hidden="true" />
                  اتصال
                </a>
              </Button>
              <Button
                asChild
                size="sm"
                className="whatsapp-btn flex-1 border-0 hover:bg-whatsapp-deep"
              >
                <a href={customerWa} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-4" aria-hidden="true" />
                  واتساب
                </a>
              </Button>
            </div>
          </Card>

          <Card className="border-border/80 bg-card rounded-xl p-5">
            <h2 className="font-heading font-semibold">الدفع</h2>
            <div className="mt-1 text-sm">
              <div className="flex items-center justify-between gap-2 border-b border-border py-2.5">
                <span className="text-muted-foreground">الطريقة</span>
                <span className="font-medium">
                  {order.paymentType
                    ? (PAYMENT_TYPE_AR[
                        order.paymentType as keyof typeof PAYMENT_TYPE_AR
                      ] ?? order.paymentMethodName)
                    : (order.paymentMethodName ?? "—")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 py-2.5">
                <span className="text-muted-foreground">الحالة</span>
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
            </div>
            {order.paymentStatus !== "PAID" &&
              order.status !== "CANCELLED" &&
              order.status !== "REJECTED" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full text-success-ink border-success/40 hover:bg-success/10"
                  onClick={() =>
                    setConfirmPayment({
                      ps: "PAID",
                      label: "تأكيد استلام الدفع",
                    })
                  }
                  disabled={busy}
                >
                  <Check className="size-4" aria-hidden="true" />
                  تأكيد استلام الدفع
                </Button>
              )}
          </Card>

          {/* Customer note — canonical quiet alert: surface ground + hairline
 + 8px pastel status dot inline-start (no tinted lift). */}
          {order.customerNote && (
            <Card className="rounded-xl border-border/80 bg-card p-5">
              <h2 className="font-heading font-semibold text-sm flex items-center gap-2.5">
                <span
                  className="size-2 shrink-0 rounded-full bg-warning"
                  aria-hidden="true"
                />
                ملاحظة العميل
              </h2>
              <p className="mt-2 text-sm leading-relaxed">
                {order.customerNote}
              </p>
            </Card>
          )}

          {/* Internal note */}
          <Card className="border-border/80 bg-card rounded-xl p-5 no-print">
            <h2 className="font-heading font-semibold text-sm">
              ملاحظة داخلية
            </h2>
            <Textarea
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              placeholder="ملاحظة لفريقك فقط — لا يراها العميل"
              className="mt-2.5 bg-muted/50 min-h-20"
              maxLength={500}
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-2.5"
              onClick={saveInternalNote}
              disabled={busy}
            >
              حفظ الملاحظة
            </Button>
          </Card>
        </div>
      </div>

      {/* Timeline — owner-timeline anatomy (r131 F3): Phase 6 re-bases
 spine + nodes on the DASHED ROUTE (.route-spine-segment, its first
 consumer) — the solid tinted bar is retired; pastel icon nodes,
 hairline row separators and the 60ms stagger stay. */}
      <Card className="border-border/80 bg-card rounded-xl p-5">
        <h2 className="font-heading font-semibold">سجل الطلب</h2>
        <ol className="mt-2 relative">
          <span
            className="route-spine-segment absolute top-4 bottom-4 start-[15px]"
            aria-hidden="true"
          />
          {order.history.map((h, i) => {
            const node = TIMELINE_NODE[h.toStatus] ?? TIMELINE_NODE.NEW;
            const NodeIcon = node.icon;
            return (
              <m.li
                key={h.id}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.24,
                  ease: [0.16, 1, 0.3, 1],
                  delay: i * 0.06,
                }}
                className="relative ps-14 py-3 border-b border-border last:border-b-0"
              >
                <span
                  className={`absolute start-0 top-1.5 flex size-8 items-center justify-center rounded-full ${node.classes}`}
                  aria-hidden="true"
                >
                  <NodeIcon className="size-4" />
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Phase 6: TERMINAL states get the stamp treatment —
                      the end-of-route franking (squared family border
                      over the pastel ground, deep ink); live states keep
                      the plain text label. */}
                  {node.stamp ? (
                    <span
                      className={`inline-flex items-center rounded-sm border px-2.5 py-1 text-[11px] font-semibold ${node.stamp}`}
                    >
                      {`الحالة: ${ORDER_STATUS_AR[h.toStatus as keyof typeof ORDER_STATUS_AR] ?? h.toStatus}`}
                    </span>
                  ) : (
                    <span className="text-sm font-medium">
                      {h.toStatus === "NEW"
                        ? (h.note ?? "استُقبل الطلب")
                        : `الحالة: ${ORDER_STATUS_AR[h.toStatus as keyof typeof ORDER_STATUS_AR] ?? h.toStatus}`}
                    </span>
                  )}
                </div>
                {/* r132 (A2 F6): the operator's note is the whole point of
                    the "يظهر في السجل" promise — the old startsWith("تم")
                    heuristic silently REPLACED any custom reason (e.g.
                    "نفدت المكونات") with the generic status label. Now the
                    status name and the note are shown together; system
                    payment notes ("تم تأكيد استلام الدفع") render the same
                    way — status + what happened, no string sniffing. */}
                {h.note && h.toStatus !== "NEW" && (
                  <p className="mt-0.5 text-[13px] leading-6 text-muted-foreground">
                    {h.note}
                  </p>
                )}
                <div className="mt-0.5 text-xs text-muted-foreground flex gap-2 flex-wrap">
                  <span className="tabular-nums">
                    {formatArabicDateTime(h.createdAt)}
                  </span>
                  {h.changedByName && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{h.changedByName}</span>
                    </>
                  )}
                </div>
              </m.li>
            );
          })}
        </ol>
      </Card>

      {/* Confirm destructive / status dialog */}
      <Dialog
        open={!!confirmAction}
        onOpenChange={(v) => !v && setConfirmAction(null)}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{confirmAction?.label}</DialogTitle>
            <DialogDescription>
              الطلب {order.orderNumber} — الإجراء: {confirmAction?.label}. هذا
              الإجراء يُسجل في سجل الطلب.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={actionNote}
            onChange={(e) => setActionNote(e.target.value)}
            placeholder="سبب اختياري (مثال: نفدت المكونات) — يظهر في السجل"
            maxLength={300}
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              إلغاء
            </Button>
            <Button
              variant={
                confirmAction &&
                ["CANCELLED", "REJECTED"].includes(confirmAction.to)
                  ? "destructive"
                  : "default"
              }
              disabled={busy}
              loading={busy}
              onClick={() =>
                confirmAction && transition(confirmAction.to, actionNote)
              }
            >
              تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* r133 (A1 F7): money-mutation confirm — REFUNDED is destructive
          (irreversible, no UNPAID restore), PAID changes the money story. */}
      <ConfirmDialog
        open={!!confirmPayment}
        onOpenChange={(v) => !v && setConfirmPayment(null)}
        title={confirmPayment?.label ?? ""}
        description={
          confirmPayment?.ps === "REFUNDED" ? (
            <>
              سيتم تسجيل استرجاع المبلغ للطلب {order.orderNumber}. لا يمكن
              التراجع عن هذا الإجراء لاحقاً، وسيُسجل في سجل الطلب.
            </>
          ) : (
            <>
              سيتم تسجيل استلام الدفع للطلب {order.orderNumber}. سيُسجل
              التغيير في سجل الطلب.
            </>
          )
        }
        confirmLabel={confirmPayment?.label ?? "تأكيد"}
        destructive={confirmPayment?.ps === "REFUNDED"}
        busy={busy}
        onConfirm={() => {
          if (confirmPayment) setPaymentStatus(confirmPayment.ps);
        }}
      />
    </div>
  );
}
