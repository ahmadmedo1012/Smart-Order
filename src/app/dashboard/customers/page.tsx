"use client";

import * as React from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { useBusiness } from "@/components/dashboard/shell";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TableSkeleton,
  CardListSkeleton,
} from "@/components/dashboard/skeletons";
import { PageHeader } from "@/components/dashboard/page-header";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { formatLyd } from "@/lib/money";
import { timeAgoAr } from "@/lib/arabic";
import { formatPhoneDisplay } from "@/lib/phone";
import {
  Users,
  Search,
  MessageCircle,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { toE164 } from "@/lib/phone";
import { waLink } from "@/lib/whatsapp";

interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  notes: string | null;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
  avgOrder: number;
  lastOrderAt: string | null;
}

const PAGE_SIZE = 10;

export default function CustomersPage() {
  const { businessId, business } = useBusiness();
  const [customers, setCustomers] = React.useState<CustomerRow[] | null>(null);
  const [error, setError] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  /* r131 (F3, A5 P2-8): 300ms debounce — every keystroke used to fire a
     full GET + a setPage(1) re-render inside .then; the query now
     settles before it hits the fetch deps, and page resets with the
     settled term (no inside-.then side effect). */
  const [debouncedQ, setDebouncedQ] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);
  React.useEffect(() => {
    setPage(1);
  }, [debouncedQ]);

  const load = React.useCallback(() => {
    if (!businessId) return;
    setError(false);
    api
      .get<CustomerRow[]>(
        `/api/customers?businessId=${businessId}${debouncedQ.trim() ? `&q=${encodeURIComponent(debouncedQ.trim())}` : ""}`,
      )
      .then((r) => setCustomers(r.data))
      .catch(() => setError(true));
  }, [businessId, debouncedQ]);

  React.useEffect(load, [load]);

  if (error) return <ErrorState retry={load} />;

  const totalPages = customers
    ? Math.max(1, Math.ceil(customers.length / PAGE_SIZE))
    : 1;
  const safePage = Math.min(page, totalPages);
  const shown = (customers ?? []).slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="العملاء"
        subtitle={
          <span className="tabular-nums">
            {customers?.length ?? "…"} عميل — يُنشؤون تلقائياً مع أول طلب
          </span>
        }
      />

      <div className="relative max-w-72">
        <Search
          className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="اسم أو رقم هاتف..."
          aria-label="بحث في العملاء"
          className="ps-9 bg-card"
        />
      </div>

      {customers === null ? (
        /* r131 (F3, A5 P2-7): shape-matched table shell + mobile cards. */
        <div role="status" aria-live="polite" aria-busy="true">
          <span className="sr-only">جارٍ تحميل العملاء...</span>
          <TableSkeleton rows={5} />
          <div className="mt-2.5">
            <CardListSkeleton rows={4} className="md:hidden" />
          </div>
        </div>
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q ? "لا نتائج" : "لا عملاء بعد"}
          description={
            q
              ? "جرّب كلمة بحث مختلفة"
              : "مع أول طلب من متجرك، يُنشأ ملف العميل تلقائياً مع سجل طلباته"
          }
          action={
            business ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/store/${business.slug}`} target="_blank">
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  معاينة المتجر ومشاركته
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Desktop — canonical table grammar (11px muted headers on
              surface-2, 13px cells, hover wash + row-actions reveal).
              r131 (F3, A7): scope=col + sr-only caption; uppercase
              dropped (no-op on Arabic, banned by family type laws). */}
          <table className="hidden md:table w-full text-[13px]">
            <caption className="sr-only">عملاء المتجر</caption>
            <thead>
              <tr className="border-b border-border bg-muted text-muted-foreground text-[11px] font-semibold">
                <th scope="col" className="text-start font-semibold px-4 py-3">
                  العميل
                </th>
                <th scope="col" className="text-start font-semibold px-4 py-3">
                  الطلبات
                </th>
                <th scope="col" className="text-start font-semibold px-4 py-3">
                  إجمالي الشراء
                </th>
                <th scope="col" className="text-start font-semibold px-4 py-3">
                  متوسط الطلب
                </th>
                <th scope="col" className="text-start font-semibold px-4 py-3">
                  آخر طلب
                </th>
                <th scope="col" className="w-24" aria-label="إجراءات" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {shown.map((c) => (
                <tr
                  key={c.id}
                  className="group/row transition-colors hover:bg-muted/40"
                >
                  <td className="relative px-4 py-3 before:pointer-events-none before:absolute before:start-0 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:origin-center before:scale-y-0 before:rounded-e-sm before:bg-primary before:transition-transform before:duration-(--t-slow) before:ease-spring-soft group-hover/row:before:scale-y-100">
                    <Link
                      href={`/dashboard/customers/${c.id}`}
                      className="font-medium hover:text-accent-foreground"
                    >
                      {c.name}
                    </Link>
                    <div
                      className="text-xs text-muted-foreground tabular-nums"
                      dir="ltr"
                    >
                      {formatPhoneDisplay(c.phone)}
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{c.orderCount}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {formatLyd(c.totalSpent)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    {formatLyd(c.avgOrder)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.lastOrderAt ? timeAgoAr(c.lastOrderAt) : "—"}
                  </td>
                  <td className="px-3 py-3 opacity-100 transition-opacity duration-(--t-fast) md:opacity-0 md:group-hover/row:opacity-100 md:focus-within:opacity-100">
                    <a
                      href={waLink(toE164(c.phone))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="whatsapp-btn inline-flex items-center gap-1.5 rounded-lg h-8 px-3 text-xs font-semibold"
                      aria-label={`مراسلة ${c.name} عبر واتساب`}
                    >
                      <MessageCircle className="size-3.5" aria-hidden="true" />
                      واتساب
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <TablePagination
              className="hidden md:flex"
              page={safePage}
              totalPages={totalPages}
              total={customers.length}
              unitLabel="عميل"
              onPageChange={setPage}
            />
          )}

          {/* Mobile */}
          <ul className="md:hidden divide-y divide-border/60">
            {shown.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/dashboard/customers/${c.id}`}
                  className="flex items-center gap-3 p-4 active:bg-muted/50"
                >
                  <span
                    className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-accent-foreground text-sm font-bold shrink-0"
                    aria-hidden="true"
                  >
                    {c.name.slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{c.name}</div>
                    <div
                      className="text-xs text-muted-foreground tabular-nums"
                      dir="ltr"
                    >
                      {formatPhoneDisplay(c.phone)}
                    </div>
                  </div>
                  <div className="text-end shrink-0">
                    <div className="text-sm font-semibold tabular-nums">
                      {formatLyd(c.totalSpent)}
                    </div>
                    <div className="text-[11px] text-muted-foreground tabular-nums">
                      {c.orderCount} طلب
                    </div>
                  </div>
                  <ArrowLeft
                    className="size-4 text-muted-foreground shrink-0"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <TablePagination
              className="md:hidden"
              page={safePage}
              totalPages={totalPages}
              total={customers.length}
              unitLabel="عميل"
              onPageChange={setPage}
            />
          )}
        </div>
      )}
    </div>
  );
}
