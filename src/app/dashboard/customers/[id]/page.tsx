"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/client";
import { useBusiness } from "@/components/dashboard/shell";
import { OrderStatusBadge } from "@/components/shared/status-badges";
import { ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { formatLyd } from "@/lib/money";
import { formatArabicDateTime } from "@/lib/arabic";
import { formatPhoneDisplay, toE164 } from "@/lib/phone";
import { waLink } from "@/lib/whatsapp";
import { type OrderStatus } from "@/lib/constants";
import { ArrowRight, MessageCircle, Phone, StickyNote, Save } from "lucide-react";
import { toast } from "sonner";

interface CustomerDetail {
  id: string;
  name: string;
  phone: string;
  notes: string | null;
  createdAt: string;
  addresses: Array<{ id: string; label: string | null; city: string; area: string | null; addressLine: string; isDefault: boolean }>;
  orders: Array<{
    id: string;
    orderNumber: string;
    status: OrderStatus;
    total: number;
    paymentStatus: string;
    fulfillmentType: string;
    createdAt: string;
  }>;
  stats: { orderCount: number; totalSpent: number; avgOrder: number };
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { businessId } = useBusiness();
  const [customer, setCustomer] = React.useState<CustomerDetail | null>(null);
  const [error, setError] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(() => {
    if (!id) return;
    setError(false);
    api
      .get<{ customer: CustomerDetail }>(`/api/customers/${id}?businessId=${businessId}`)
      .then((r) => {
        setCustomer(r.data.customer);
        setNotes(r.data.customer.notes ?? "");
      })
      .catch(() => setError(true));
  }, [id, businessId]);

  React.useEffect(load, [load]);

  async function saveNotes() {
    setSaving(true);
    try {
      await api.patch(`/api/customers/${id}`, { businessId, notes: notes.trim() || null });
      toast.success("حُفظت الملاحظة");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  if (error) return <ErrorState retry={load} />;
  if (!customer) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Link href="/dashboard/customers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowRight className="size-4" aria-hidden="true" />
        العودة للعملاء
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-bold" aria-hidden="true">
            {customer.name.slice(0, 2)}
          </span>
          <div>
            <h1 className="font-heading text-2xl font-bold">{customer.name}</h1>
            <p className="text-sm text-muted-foreground tabular mt-0.5" dir="ltr">{formatPhoneDisplay(customer.phone)}</p>
            <p className="text-xs text-muted-foreground mt-1">عميل منذ {formatArabicDateTime(customer.createdAt)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={`tel:${customer.phone}`}
            className="inline-flex items-center gap-2 rounded-lg border border-border h-10 px-4 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Phone className="size-4" aria-hidden="true" />
            اتصال
          </a>
          <a
            href={waLink(toE164(customer.phone))}
            target="_blank"
            rel="noopener noreferrer"
            className="whatsapp-btn inline-flex items-center gap-2 rounded-lg h-10 px-4 text-sm font-semibold"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            واتساب
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "الطلبات", value: String(customer.stats.orderCount) },
          { label: "إجمالي الشراء", value: formatLyd(customer.stats.totalSpent) },
          { label: "متوسط الطلب", value: formatLyd(customer.stats.avgOrder) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="mt-1.5 font-heading font-bold text-lg tabular nums">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Addresses */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-heading font-semibold text-sm">العناوين المحفوظة</h2>
          {customer.addresses.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">لا عناوين محفوظة بعد</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {customer.addresses.slice(0, 5).map((a) => (
                <li key={a.id} className="text-sm rounded-lg bg-muted/50 px-3 py-2.5">
                  <div className="text-xs text-muted-foreground">{[a.city, a.area].filter(Boolean).join(" — ")}</div>
                  <div className="mt-0.5">{a.addressLine}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
            <StickyNote className="size-4 text-muted-foreground" aria-hidden="true" />
            ملاحظات داخلية
          </h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ملاحظاتك عن هذا العميل (تفضيلات، تاريخ تعامل...)"
            maxLength={500}
            rows={4}
            className="mt-3 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-orange"
          />
          <button
            onClick={saveNotes}
            disabled={saving}
            className="mt-2 inline-flex items-center gap-2 rounded-lg border border-border h-9 px-4 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Save className="size-4" aria-hidden="true" />
            حفظ
          </button>
        </div>
      </div>

      {/* Order history */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-5 pb-3">
          <h2 className="font-heading font-semibold text-sm">سجل الطلبات</h2>
        </div>
        {customer.orders.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">لا طلبات بعد</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {customer.orders.map((o) => (
              <li key={o.id}>
                <Link href={`/dashboard/orders/${o.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm tabular">{o.orderNumber}</span>
                      <OrderStatusBadge status={o.status} />
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{formatArabicDateTime(o.createdAt)}</div>
                  </div>
                  <span className="font-bold text-sm tabular nums shrink-0">{formatLyd(o.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
