"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { useBusiness } from "@/components/dashboard/shell";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/shared/status-badges";
import { EmptyState, ErrorState } from "@/components/shared/states";
import {
  ToolbarSkeleton,
  TableSkeleton,
  CardListSkeleton,
} from "@/components/dashboard/skeletons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/dashboard/page-header";
import { UnderlineTabs } from "@/components/dashboard/underline-tabs";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { formatLyd } from "@/lib/money";
import { formatArabicDateTime } from "@/lib/arabic";
import {
  ORDER_STATUSES,
  ORDER_STATUS_AR,
  FULFILLMENT_AR,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/constants";
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
  /* r132 (A2 F12): 300ms debounce — the twin the customers list got in
     r131 (customers/page.tsx). Every keystroke used to fire a full
     GET /api/orders (25-row pages + joins) and flicker meta.total
     through stale values; the term now settles before it reaches the
     fetch deps, and the page resets with the settled term. */
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [meta, setMeta] = React.useState({ total: 0, totalPages: 1 });
  /* r131 (F3, A5 P1-2 / A11 SO-1): the old retry passed
 setPage((p) => p) — a same-value setState bail-out that never
 re-fired the fetch effect, so the retry button did nothing.
 reloadKey is consumed by the effect deps: bumping it refetches. */
  const [reloadKey, setReloadKey] = React.useState(0);
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);
  React.useEffect(() => {
    setPage(1);
  }, [debouncedQ]);

  React.useEffect(() => {
    if (!businessId) return;
    setError(false);
    const sp = new URLSearchParams({
      businessId,
      page: String(page),
      pageSize: "25",
    });
    if (status !== "ALL") sp.set("status", status);
    if (payment !== "ALL") sp.set("paymentStatus", payment);
    if (fulfillment !== "ALL") sp.set("fulfillment", fulfillment);
    if (debouncedQ.trim()) sp.set("q", debouncedQ.trim());
    api
      .get<OrderRow[]>(`/api/orders?${sp.toString()}`)
      .then((r) => {
        setOrders(r.data);
        setMeta(
          (r.meta as { total: number; totalPages: number }) ?? {
            total: r.data.length,
            totalPages: 1,
          },
        );
      })
      .catch(() => setError(true));
  }, [businessId, status, payment, fulfillment, debouncedQ, page, reloadKey]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="الطلبات"
        subtitle={<span className="tabular-nums">{meta.total} طلب</span>}
        actions={
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
        }
      />

      {/* Filters — canonical underline tabs (status) + toolbar */}
      <div className="flex flex-col gap-3">
        <UnderlineTabs
          label="فلترة حالة الطلب"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          items={STATUS_TABS}
        />
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-44 max-w-72">
            <Search
              className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder="رقم الطلب، اسم أو هاتف العميل..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="ps-9 bg-card"
              aria-label="بحث في الطلبات"
            />
          </div>
          <Select
            value={payment}
            onValueChange={(v) => {
              setPayment(v);
              setPage(1);
            }}
          >
            <SelectTrigger
              className="w-36 bg-card"
              aria-label="فلترة حالة الدفع"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">كل حالات الدفع</SelectItem>
              <SelectItem value="UNPAID">غير مدفوع</SelectItem>
              <SelectItem value="PAID">مدفوع</SelectItem>
              <SelectItem value="REFUNDED">مسترجع</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={fulfillment}
            onValueChange={(v) => {
              setFulfillment(v);
              setPage(1);
            }}
          >
            <SelectTrigger
              className="w-36 bg-card"
              aria-label="فلترة نوع الطلب"
            >
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
        <ErrorState retry={() => setReloadKey((k) => k + 1)} />
      ) : orders === null ? (
        /* r131 (F3, A5 P2-7): shape-matched — toolbar + table shell
 (desktop) + card list (mobile), not generic h-16 bars. */
        <div role="status" aria-live="polite" aria-busy="true">
          <span className="sr-only">جارٍ تحميل الطلبات...</span>
          <ToolbarSkeleton />
          <div className="mt-5">
            <TableSkeleton rows={6} />
            <CardListSkeleton rows={4} />
          </div>
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="لا توجد طلبات مطابقة"
          description={
            status !== "ALL"
              ? "جرّب تغيير الفلاتر أو اعرض كل الطلبات"
              : "سيظهر هنا كل طلب يستلمه متجرك"
          }
          action={
            status !== "ALL" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatus("ALL");
                  setPage(1);
                }}
              >
                عرض كل الطلبات
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop table — canonical: 11px muted headers on
 surface-2, 13px cells, quiet zebra wash + hidden row-actions
 reveal + 2px first-cell accent dot on hover (Madarek §3.5).
 r131 (F3, A7): scope=col on every column header + sr-only
 caption (screen-reader table semantics); uppercase dropped
 (no-op on Arabic, banned by the family type laws). */}
          <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-[13px]">
              <caption className="sr-only">
                طلبات المتجر حسب الفلاتر المحددة
              </caption>
              <thead>
                <tr className="border-b border-border bg-muted text-muted-foreground text-[11px] font-semibold">
                  <th
                    scope="col"
                    className="text-start font-semibold px-4 py-3"
                  >
                    رقم الطلب
                  </th>
                  <th
                    scope="col"
                    className="text-start font-semibold px-4 py-3"
                  >
                    العميل
                  </th>
                  <th
                    scope="col"
                    className="text-start font-semibold px-4 py-3"
                  >
                    النوع
                  </th>
                  <th
                    scope="col"
                    className="text-start font-semibold px-4 py-3"
                  >
                    الحالة
                  </th>
                  <th
                    scope="col"
                    className="text-start font-semibold px-4 py-3"
                  >
                    الدفع
                  </th>
                  <th
                    scope="col"
                    className="text-start font-semibold px-4 py-3"
                  >
                    الإجمالي
                  </th>
                  <th
                    scope="col"
                    className="text-start font-semibold px-4 py-3"
                  >
                    التاريخ
                  </th>
                  <th scope="col" className="w-10" aria-label="تفاصيل" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    className="group/row transition-colors hover:bg-muted/40"
                  >
                    <td className="relative px-4 py-3 font-semibold tabular-nums before:pointer-events-none before:absolute before:start-0 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:origin-center before:scale-y-0 before:rounded-e-sm before:bg-primary before:transition-transform before:duration-(--t-slow) before:ease-spring-soft group-hover/row:before:scale-y-100">
                      <Link
                        href={`/dashboard/orders/${o.id}`}
                        className="hover:text-accent-foreground"
                      >
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="truncate max-w-36">{o.customerName}</div>
                      <div
                        className="text-xs text-muted-foreground tabular-nums"
                        dir="ltr"
                      >
                        {o.customerPhone}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {FULFILLMENT_AR[o.fulfillmentType]}
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3">
                      <PaymentStatusBadge status={o.paymentStatus} />
                    </td>
                    <td className="px-4 py-3 font-bold tabular-nums">
                      {formatLyd(o.total)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatArabicDateTime(o.createdAt)}
                    </td>
                    <td className="px-2 opacity-0 transition-opacity duration-(--t-fast) group-hover/row:opacity-100 focus-within:opacity-100">
                      <Link
                        href={`/dashboard/orders/${o.id}`}
                        aria-label={`تفاصيل الطلب ${o.orderNumber}`}
                      >
                        <ArrowLeft
                          className="size-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePagination
              page={page}
              totalPages={meta.totalPages}
              total={meta.total}
              unitLabel="طلب"
              onPageChange={setPage}
            />
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
                    <span className="font-semibold tabular-nums">
                      {o.orderNumber}
                    </span>
                    <OrderStatusBadge status={o.status} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground truncate">
                      {o.customerName}
                    </span>
                    <span className="font-bold tabular-nums">
                      {formatLyd(o.total)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{FULFILLMENT_AR[o.fulfillmentType]}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {formatArabicDateTime(o.createdAt)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Mobile pagination */}
          {meta.totalPages > 1 && (
            <TablePagination
              className="md:hidden rounded-xl border border-border bg-card"
              page={page}
              totalPages={meta.totalPages}
              total={meta.total}
              unitLabel="طلب"
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
