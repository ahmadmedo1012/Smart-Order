"use client";

import * as React from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { useBusiness } from "@/components/dashboard/shell";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { formatLyd } from "@/lib/money";
import { timeAgoAr } from "@/lib/arabic";
import { formatPhoneDisplay } from "@/lib/phone";
import { Users, Search, MessageCircle, ArrowLeft } from "lucide-react";
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

export default function CustomersPage() {
  const { businessId } = useBusiness();
  const [customers, setCustomers] = React.useState<CustomerRow[] | null>(null);
  const [error, setError] = React.useState(false);
  const [q, setQ] = React.useState("");

  const load = React.useCallback(() => {
    if (!businessId) return;
    setError(false);
    api
      .get<CustomerRow[]>(`/api/customers?businessId=${businessId}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}`)
      .then((r) => setCustomers(r.data))
      .catch(() => setError(true));
  }, [businessId, q]);

  React.useEffect(load, [load]);

  if (error) return <ErrorState retry={load} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">العملاء</h1>
        <p className="text-sm text-muted-foreground mt-1 tabular">
          {customers?.length ?? "…"} عميل — يُنشؤون تلقائياً مع أول طلب
        </p>
      </div>

      <div className="relative max-w-72">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="اسم أو رقم هاتف..."
          aria-label="بحث في العملاء"
          className="w-full h-10 rounded-lg border border-input bg-card ps-9 pe-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {customers === null ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q ? "لا نتائج" : "لا عملاء بعد"}
          description={q ? "جرّب كلمة بحث مختلفة" : "مع أول طلب من متجرك، يُنشأ ملف العميل تلقائياً مع سجل طلباته"}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Desktop */}
          <table className="hidden md:table w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground text-xs">
                <th className="text-start font-medium px-4 py-3">العميل</th>
                <th className="text-start font-medium px-4 py-3">الطلبات</th>
                <th className="text-start font-medium px-4 py-3">إجمالي الشراء</th>
                <th className="text-start font-medium px-4 py-3">متوسط الطلب</th>
                <th className="text-start font-medium px-4 py-3">آخر طلب</th>
                <th className="w-24" aria-label="إجراءات" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/customers/${c.id}`} className="font-medium hover:text-primary">
                      {c.name}
                    </Link>
                    <div className="text-xs text-muted-foreground tabular" dir="ltr">{formatPhoneDisplay(c.phone)}</div>
                  </td>
                  <td className="px-4 py-3 tabular">{c.orderCount}</td>
                  <td className="px-4 py-3 font-semibold tabular nums">{formatLyd(c.totalSpent)}</td>
                  <td className="px-4 py-3 text-muted-foreground tabular nums">{formatLyd(c.avgOrder)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{c.lastOrderAt ? timeAgoAr(c.lastOrderAt) : "—"}</td>
                  <td className="px-3 py-3">
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

          {/* Mobile */}
          <ul className="md:hidden divide-y divide-border/60">
            {customers.map((c) => (
              <li key={c.id}>
                <Link href={`/dashboard/customers/${c.id}`} className="flex items-center gap-3 p-4 active:bg-muted/50">
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0" aria-hidden="true">
                    {c.name.slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground tabular" dir="ltr">{formatPhoneDisplay(c.phone)}</div>
                  </div>
                  <div className="text-end shrink-0">
                    <div className="text-sm font-semibold tabular nums">{formatLyd(c.totalSpent)}</div>
                    <div className="text-[11px] text-muted-foreground tabular">{c.orderCount} طلب</div>
                  </div>
                  <ArrowLeft className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
