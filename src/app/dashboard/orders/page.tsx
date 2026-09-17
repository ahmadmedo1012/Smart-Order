"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { useBusiness } from "@/components/dashboard/shell";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badges";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatLyd } from "@/lib/money";
import { formatArabicDateTime } from "@/lib/arabic";
import { ORDER_STATUSES, ORDER_STATUS_AR, FULFILLMENT_AR, type OrderStatus, type PaymentStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ClipboardList, Search, ArrowLeft, RotateCcw } from "lucide-react";

interface OrderRow {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  fulfillmentType: "DELIVERY" | "PICKUP";
  total: number;
  paymentStatus: PaymentStatus;
  paymentType: string | null;
  customerName: string;
  customerPhone: string;
  city: string | null;
  area: string | null;
  createdAt: string;
  _count: { items: number };
}

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "الكل" },
  ...ORDER_STATUSES.map((s) => ({ value: s, label: ORDER_STATUS_AR[s] })),
];

export default function OrdersPage() {
  const { businessId } = useBusiness();
  const params = useSearchParams();
  const [orders, setOrders] = React.useState<OrderRow[] | null>(null);
  const [error, setError] = React.useState(false);
  const [status, setStatus] = React.useState(params.get("status") ?? "ALL");
  const [payment, setPayment] = React.useState("ALL");
  const [fulfillment, setFulfillment] = React.useState("ALL");
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [meta, setMeta] = React.useState({ total: 0, totalPages: 1 });

  React.useEffect(() => {
    if (!businessId) return;
    setError(false);
    const sp = new URLSearchParams({ businessId, page: String(page), pageSize: "25" });
    if (status !== "ALL") sp.set("status", status);
    if (payment !== "ALL") sp.set("paymentStatus", payment);
    if (fulfillment !== "ALL") sp.set("fulfillment", fulfillment);
    if (q.trim()) sp.set("q", q.trim());
    api
      .get<OrderRow[]>(`/api/orders?${sp.toString()}`)
      .then((r) => {
        setOrders(r.data);
        setMeta((r.meta as { total: number; totalPages: number }) ?? { total: r.data.length, totalPages: 1 });
      })
      .catch(() => setError(true));
  }, [businessId, status, payment, fulfillment, q, page]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">الطلبات</h1>
          <p className="text-sm text-muted-foreground mt-1 tabular">{meta.total} طلب</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setStatus("ALL");
            setPayment("ALL");
            setFulfillment("ALL");
            setQ("");
            setPage(1);
          }}
        >
          <RotateCcw className="size-4 me-1.5" aria-hidden="true" />
          تصفير الفلاتر
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <Tabs value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
            {STATUS_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="text-xs sm:text-sm h-8 px-3">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-44 max-w-72">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="رقم الطلب، اسم أو هاتف العميل..."
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              className="ps-9 bg-card"
              aria-label="بحث في الطلبات"
            />
          </div>
          <Select value={payment} onValueChange={(v) => { setPayment(v); setPage(1); }}>
            <SelectTrigger className="w-36 bg-card" aria-label="فلترة حالة الدفع">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">كل حالات الدفع</SelectItem>
              <SelectItem value="UNPAID">غير مدفوع</SelectItem>
              <SelectItem value="PAID">مدفوع</SelectItem>
              <SelectItem value="REFUNDED">مسترجع</SelectItem>
            </SelectContent>
          </Select>
          <Select value={fulfillment} onValueChange={(v) => { setFulfillment(v); setPage(1); }}>
            <SelectTrigger className="w-36 bg-card" aria-label="فلترة نوع الطلب">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">توصيل واستلام</SelectItem>
              <SelectItem value="DELIVERY">توصيل</SelectItem>
              <SelectItem value="PICKUP">استلام</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List */}
      {error ? (
        <ErrorState retry={() => setPage((p) => p)} />
      ) : orders === null ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="لا توجد طلبات مطابقة"
          description={status !== "ALL" ? "جرّب تغيير الفلاتر أو اعرض كل الطلبات" : "سيظهر هنا كل طلب يستلمه متجرك"}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground text-xs">
                  <th className="text-start font-medium px-4 py-3">رقم الطلب</th>
                  <th className="text-start font-medium px-4 py-3">العميل</th>
                  <th className="text-start font-medium px-4 py-3">النوع</th>
                  <th className="text-start font-medium px-4 py-3">الحالة</th>
                  <th className="text-start font-medium px-4 py-3">الدفع</th>
                  <th className="text-start font-medium px-4 py-3">الإجمالي</th>
                  <th className="text-start font-medium px-4 py-3">التاريخ</th>
                  <th className="w-10" aria-label="تفاصيل" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-semibold tabular">
                      <Link href={`/dashboard/orders/${o.id}`} className="hover:text-primary">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="truncate max-w-36">{o.customerName}</div>
                      <div className="text-xs text-muted-foreground tabular" dir="ltr">{o.customerPhone}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{FULFILLMENT_AR[o.fulfillmentType]}</td>
                    <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                    <td className="px-4 py-3"><PaymentStatusBadge status={o.paymentStatus} /></td>
                    <td className="px-4 py-3 font-bold tabular nums">{formatLyd(o.total)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatArabicDateTime(o.createdAt)}</td>
                    <td className="px-2">
                      <Link href={`/dashboard/orders/${o.id}`} aria-label={`تفاصيل الطلب ${o.orderNumber}`}>
                        <ArrowLeft className="size-4 text-muted-foreground" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="md:hidden space-y-2.5">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/dashboard/orders/${o.id}`}
                  className="block rounded-xl border border-border bg-card p-4 active:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold tabular">{o.orderNumber}</span>
                    <OrderStatusBadge status={o.status} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground truncate">{o.customerName}</span>
                    <span className="font-bold tabular nums">{formatLyd(o.total)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{FULFILLMENT_AR[o.fulfillmentType]}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular">{formatArabicDateTime(o.createdAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                السابق
              </Button>
              <span className="text-sm text-muted-foreground tabular">
                صفحة {page} من {meta.totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                التالي
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
