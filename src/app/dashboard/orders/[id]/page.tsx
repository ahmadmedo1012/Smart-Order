"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/client";
import { useBusiness } from "@/components/dashboard/shell";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badges";
import { ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
import { waLink, buildCustomerConfirmationMessage, buildStatusUpdateMessage } from "@/lib/whatsapp";
import { getAllowedTransitions } from "@/lib/order-machine";
import {
  FULFILLMENT_AR,
  PAYMENT_TYPE_AR,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/constants";
import { toast } from "sonner";
import {
  ArrowRight,
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
  customer: { id: string; name: string; phone: string; notes: string | null } | null;
  business: { id: string; name: string; slug: string; whatsappNumber: string | null; phone: string | null };
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { businessId } = useBusiness();
  const [order, setOrder] = React.useState<OrderDetail | null>(null);
  const [error, setError] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [confirmAction, setConfirmAction] = React.useState<{ to: OrderStatus; label: string } | null>(null);
  const [actionNote, setActionNote] = React.useState("");
  const [internalNote, setInternalNote] = React.useState("");

  const load = React.useCallback(() => {
    if (!id) return;
    setError(false);
    api
      .get<{ order: OrderDetail }>(`/api/orders/${id}?businessId=${businessId}`)
      .then((r) => {
        setOrder(r.data.order);
        setInternalNote(r.data.order.internalNote ?? "");
      })
      .catch(() => setError(true));
  }, [id, businessId]);

  React.useEffect(load, [load]);

  async function transition(to: OrderStatus, note?: string) {
    setBusy(true);
    try {
      await api.patch(`/api/orders/${id}`, { businessId, status: to, statusNote: note || undefined });
      toast.success("تم تحديث حالة الطلب");
      setConfirmAction(null);
      setActionNote("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر تحديث الحالة");
    } finally {
      setBusy(false);
    }
  }

  async function setPaymentStatus(ps: PaymentStatus) {
    setBusy(true);
    try {
      await api.patch(`/api/orders/${id}`, { businessId, paymentStatus: ps });
      toast.success("تم تحديث حالة الدفع");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر التحديث");
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
      toast.error(e instanceof Error ? e.message : "تعذر الحفظ");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorState retry={load} />;
  if (!order) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const transitions = getAllowedTransitions(order.status, order.fulfillmentType);
  const customerWa = waLink(toE164(order.customerPhone), buildCustomerConfirmationMessage(
    {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      items: order.items.map((i) => ({ productName: i.productName, variantName: i.variantName, quantity: i.quantity, lineTotal: i.lineTotal })),
      fulfillmentType: order.fulfillmentType,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      total: order.total,
    },
    order.business.name
  ));

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="size-4" aria-hidden="true" />
            العودة للطلبات
          </Link>
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <h1 className="font-heading text-2xl font-bold tabular">{order.orderNumber}</h1>
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden="true" />
            {formatArabicDateTime(order.createdAt)}
          </p>
        </div>

        <div className="flex items-center gap-2 no-print">
          {/* Context-aware actions */}
          {transitions.length > 0 && (
            <>
              {/* Primary: first non-destructive */}
              {(() => {
                const primary = transitions.find((t) => !t.destructive);
                const destructive = transitions.filter((t) => t.destructive);
                return (
                  <>
                    {primary && (
                      <Button
                        onClick={() => setConfirmAction({ to: primary.to, label: primary.label })}
                        disabled={busy}
                        className="font-semibold"
                      >
                        {primary.label}
                        <ChevronDown className="size-4" aria-hidden="true" />
                      </Button>
                    )}
                    {destructive.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" aria-label="إجراءات أخرى">
                            <MoreHorizontal className="size-4.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {destructive.map((t) => (
                            <DropdownMenuItem
                              key={t.to}
                              onClick={() => setConfirmAction({ to: t.to, label: t.label })}
                              className="text-destructive focus:text-destructive"
                            >
                              <Ban className="size-4 me-2" aria-hidden="true" />
                              {t.label}
                            </DropdownMenuItem>
                          ))}
                          {order.paymentStatus !== "PAID" && order.status !== "CANCELLED" && order.status !== "REJECTED" && (
                            <DropdownMenuItem onClick={() => setPaymentStatus("PAID")}>
                              <Check className="size-4 me-2" aria-hidden="true" />
                              تأكيد استلام الدفع
                            </DropdownMenuItem>
                          )}
                          {order.paymentStatus === "PAID" && (
                            <DropdownMenuItem onClick={() => setPaymentStatus("REFUNDED")}>
                              <Check className="size-4 me-2" aria-hidden="true" />
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
                  <DropdownMenuItem onClick={() => setPaymentStatus("REFUNDED")}>
                    تسجيل استرجاع المبلغ
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button variant="outline" size="icon" onClick={() => window.print()} aria-label="طباعة الطلب">
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
                const options: Array<{ name: string }> = item.optionsJson ? JSON.parse(item.optionsJson) : [];
                return (
                  <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">
                          <span className="tabular text-muted-foreground">{item.quantity}×</span>{" "}
                          {item.productName}
                          {item.variantName && (
                            <span className="text-muted-foreground"> — {item.variantName}</span>
                          )}
                        </div>
                        {options.length > 0 && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            إضافات: {options.map((o) => o.name).join("، ")}
                          </div>
                        )}
                        {item.note && (
                          <div className="mt-1 text-xs text-warning-foreground flex items-center gap-1">
                            <StickyNote className="size-3" aria-hidden="true" />
                            {item.note}
                          </div>
                        )}
                      </div>
                      <div className="text-end shrink-0">
                        <div className="font-semibold tabular nums">{formatLyd(item.lineTotal)}</div>
                        <div className="text-[11px] text-muted-foreground tabular nums">
                          {formatLyd(item.unitPrice)} × {item.quantity}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 pt-4 border-t space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>المجموع الفرعي</span>
                <span className="tabular nums">{formatLyd(order.subtotal)}</span>
              </div>
              {order.deliveryFee > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>رسوم التوصيل</span>
                  <span className="tabular nums">{formatLyd(order.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1 border-t">
                <span>الإجمالي</span>
                <span className="tabular nums text-primary">{formatLyd(order.total)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Customer + delivery + payment */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/80 bg-card rounded-xl p-5">
            <h2 className="font-heading font-semibold">العميل</h2>
            <div className="mt-3.5 space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">الاسم</span>
                {order.customer ? (
                  <Link href={`/dashboard/customers/${order.customer.id}`} className="font-medium hover:text-primary truncate">
                    {order.customerName}
                  </Link>
                ) : (
                  <span className="font-medium truncate">{order.customerName}</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">الهاتف</span>
                <a href={`tel:${order.customerPhone}`} className="font-medium tabular hover:text-primary" dir="ltr">
                  {formatPhoneDisplay(order.customerPhone)}
                </a>
              </div>
              {order.fulfillmentType === "DELIVERY" && (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">العنوان</span>
                    <span className="text-end">
                      {[order.city, order.area].filter(Boolean).join(" — ") || "—"}
                    </span>
                  </div>
                  {order.addressLine && (
                    <div className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
                      <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{order.addressLine}</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex items-center justify-between gap-2">
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
              <Button asChild size="sm" className="whatsapp-btn flex-1 border-0 hover:bg-[#1fc15a]">
                <a href={customerWa} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-4" aria-hidden="true" />
                  واتساب
                </a>
              </Button>
            </div>
          </Card>

          <Card className="border-border/80 bg-card rounded-xl p-5">
            <h2 className="font-heading font-semibold">الدفع</h2>
            <div className="mt-3.5 space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">الطريقة</span>
                <span className="font-medium">
                  {order.paymentType ? PAYMENT_TYPE_AR[order.paymentType as keyof typeof PAYMENT_TYPE_AR] ?? order.paymentMethodName : order.paymentMethodName ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">الحالة</span>
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
            </div>
            {order.paymentStatus !== "PAID" && order.status !== "CANCELLED" && order.status !== "REJECTED" && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full text-success border-success/40 hover:bg-success/10"
                onClick={() => setPaymentStatus("PAID")}
                disabled={busy}
              >
                <Check className="size-4" aria-hidden="true" />
                تأكيد استلام الدفع
              </Button>
            )}
          </Card>

          {/* Customer note */}
          {order.customerNote && (
            <Card className="border-warning/30 bg-warning/5 rounded-xl p-5">
              <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
                <StickyNote className="size-4 text-warning-foreground" aria-hidden="true" />
                ملاحظة العميل
              </h2>
              <p className="mt-2 text-sm leading-relaxed">{order.customerNote}</p>
            </Card>
          )}

          {/* Internal note */}
          <Card className="border-border/80 bg-card rounded-xl p-5 no-print">
            <h2 className="font-heading font-semibold text-sm">ملاحظة داخلية</h2>
            <Textarea
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              placeholder="ملاحظة لفريقك فقط — لا يراها العميل"
              className="mt-2.5 bg-muted/50 min-h-20"
              maxLength={500}
            />
            <Button variant="outline" size="sm" className="mt-2.5" onClick={saveInternalNote} disabled={busy}>
              حفظ الملاحظة
            </Button>
          </Card>
        </div>
      </div>

      {/* Timeline */}
      <Card className="border-border/80 bg-card rounded-xl p-5">
        <h2 className="font-heading font-semibold">سجل الطلب</h2>
        <ol className="mt-4 space-y-0 relative">
          <span className="absolute top-2 bottom-2 start-[7px] w-px bg-border" aria-hidden="true" />
          {order.history.map((h, i) => (
            <li key={h.id} className="relative ps-7 pb-5 last:pb-0">
              <span
                className={`absolute start-0 top-1 size-3.5 rounded-full border-2 border-background ${
                  i === order.history.length - 1 ? "bg-primary" : "bg-muted-foreground/50"
                }`}
                aria-hidden="true"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">
                  {h.note?.startsWith("تم") || h.toStatus === "NEW" ? h.note ?? "استُقبل الطلب" : `الحالة: ${h.toStatus}`}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground flex gap-2 flex-wrap">
                <span className="tabular">{formatArabicDateTime(h.createdAt)}</span>
                {h.changedByName && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{h.changedByName}</span>
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {/* Confirm destructive / status dialog */}
      <Dialog open={!!confirmAction} onOpenChange={(v) => !v && setConfirmAction(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{confirmAction?.label}</DialogTitle>
            <DialogDescription>
              الطلب {order.orderNumber} — الإجراء: {confirmAction?.label}. هذا الإجراء يُسجل في سجل الطلب.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={actionNote}
            onChange={(e) => setActionNote(e.target.value)}
            placeholder="سبب اختياري (مثال: نفدت المكونات) — يظهر في السجل"
            maxLength={300}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              إلغاء
            </Button>
            <Button
              variant={confirmAction && ["CANCELLED", "REJECTED"].includes(confirmAction.to) ? "destructive" : "default"}
              disabled={busy}
              onClick={() => confirmAction && transition(confirmAction.to, actionNote)}
            >
              {busy ? "جارٍ التنفيذ..." : "تأكيد"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

