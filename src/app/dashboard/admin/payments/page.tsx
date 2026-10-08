"use client";

import * as React from "react";
import Image from "next/image";
import { api, ApiError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { PageHeader } from "@/components/dashboard/page-header";
import { FilterPills } from "@/components/dashboard/filter-pills";
import { toast } from "sonner";
import { timeAgoAr } from "@/lib/arabic";
import { CheckCircle2, XCircle, Smartphone, Landmark, Loader2, Receipt, RotateCcw } from "lucide-react";

interface Payment {
  id: string;
  planName: string;
  amount: number;
  provider: string;
  status: string;
  phone: string | null;
  senderAccountName: string | null;
  senderAccountNumber: string | null;
  receiptImageUrl: string | null;
  createdAt: string;
  reviewedAt: string | null;
  business: { id: string; name: string; slug: string } | null;
}

const PROVIDER_LABEL: Record<string, string> = {
  LIBYANA: "ليبيانا",
  MADAR: "مدار",
  BANK: "تحويل بنكي",
};

const PLAN_AR: Record<string, string> = {
  Free: "مجاني",
  Basic: "أساسي",
  Premium: "بريميوم",
  Pro: "احترافي",
};

/**
 * Admin subscription approvals — family twin (Smart Menu admin/subscriptions):
 * the PENDING payment queue with one-tap approve / reject-with-note,
 * receipt preview, and sender details.
 */
export default function AdminPaymentsPage() {
  const [payments, setPayments] = React.useState<Payment[] | null>(null);
  const [error, setError] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");

  const load = React.useCallback(() => {
    setError(false);
    api
      .get<{ payments: Payment[] }>(`/api/subscriptions/list?status=${tab}`)
      .then((r) => setPayments(r.data.payments))
      .catch(() => setError(true));
  }, [tab]);

  React.useEffect(load, [load]);

  async function review(id: string, action: "APPROVE" | "REJECT") {
    if (action === "REJECT") {
      const note = window.prompt("سبب الرفض (يظهر للعميل):", "");
      if (note === null) return; // cancelled
      return doReview(id, action, note || undefined);
    }
    return doReview(id, action);
  }

  async function doReview(id: string, action: "APPROVE" | "REJECT", note?: string) {
    setBusyId(id);
    try {
      await api.post(`/api/subscriptions/${id}/review`, { action, note });
      toast.success(action === "APPROVE" ? "تمت الموافقة وتفعيل الخطة" : "تم رفض الطلب");
      setPayments((p) => (p ? p.filter((x) => x.id !== id) : p));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "تعذر تنفيذ الإجراء");
    } finally {
      setBusyId(null);
    }
  }

  if (error) return <ErrorState retry={load} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="موافقات الاشتراكات"
        subtitle="طلبات الدفع بانتظار التحقق — بالتحويل المؤكد فقط"
      />

      {/* Status filter — canonical pill family (surface + hairline,
          .on = ink slab / gold + 4px accent halo; replaces the segmented
          pill-switch grammar). */}
      <FilterPills
        label="فلترة حالة الطلب"
        value={tab}
        onChange={(t) => setTab(t as typeof tab)}
        items={[
          { value: "PENDING", label: "بانتظار المراجعة" },
          { value: "APPROVED", label: "مقبولة" },
          { value: "REJECTED", label: "مرفوضة" },
        ]}
      />

      {!payments ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={tab === "PENDING" ? "لا طلبات بانتظار المراجعة" : "لا نتائج في هذه الحالة"}
          description={tab === "PENDING" ? "ستظهر طلبات دفع الاشتراك هنا فور وصولها" : ""}
          action={
            <Button variant="outline" size="sm" onClick={load}>
              <RotateCcw className="size-3.5" aria-hidden="true" />
              تحديث
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <div key={p.id} className="card-premium rounded-xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-accent-foreground/10 text-accent-foreground">
                      {p.provider === "BANK" ? <Landmark className="size-4" aria-hidden="true" /> : <Smartphone className="size-4" aria-hidden="true" />}
                    </span>
                    <div>
                      <div className="text-sm font-bold">
                        خطة {PLAN_AR[p.planName] ?? p.planName}
                        <span className="ms-2 text-accent-foreground tabular nums" dir="ltr">
                          {p.amount} د.ل
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {PROVIDER_LABEL[p.provider] ?? p.provider} · {timeAgoAr(new Date(p.createdAt))}
                      </div>
                    </div>
                  </div>

                  {/* Sender details */}
                  <div className="mt-3 grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                    {p.phone && (
                      <div>
                        هاتف المُرسِل: <span className="font-mono font-bold text-foreground" dir="ltr">{p.phone}</span>
                      </div>
                    )}
                    {p.senderAccountName && (
                      <div>
                        اسم صاحب الحساب: <span className="font-bold text-foreground">{p.senderAccountName}</span>
                      </div>
                    )}
                    {p.senderAccountNumber && (
                      <div>
                        رقم الحساب: <span className="font-mono font-bold text-foreground" dir="ltr">{p.senderAccountNumber}</span>
                      </div>
                    )}
                    {p.business && (
                      <div>
                        المتجر: <span className="font-bold text-foreground">{p.business.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Receipt thumbnail */}
                {p.receiptImageUrl && (
                  <a
                    href={p.receiptImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative size-20 shrink-0 overflow-hidden rounded-md border border-border/40 transition-transform hover:scale-105"
                    title="عرض صورة التحويل"
                  >
                    <Image src={p.receiptImageUrl} alt="صورة التحويل" fill sizes="80px" className="object-cover" />
                  </a>
                )}
              </div>

              {/* Actions */}
              {p.status === "PENDING" && (
                <div className="mt-4 flex gap-2">
                  <Button
                    className="flex-1 bg-success text-success-foreground hover:bg-success/90 sm:flex-none sm:px-8"
                    disabled={busyId === p.id}
                    onClick={() => review(p.id, "APPROVE")}
                  >
                    {busyId === p.id ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="size-4" aria-hidden="true" />}
                    موافقة وتفعيل
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-destructive/40 text-destructive-ink hover:bg-destructive/10 sm:flex-none sm:px-8"
                    disabled={busyId === p.id}
                    onClick={() => review(p.id, "REJECT")}
                  >
                    <XCircle className="size-4" aria-hidden="true" />
                    رفض
                  </Button>
                </div>
              )}
              {p.status !== "PENDING" && (
                <div className="mt-3 text-xs text-muted-foreground">
                  {p.status === "APPROVED" ? "تمت الموافقة" : "مرفوضة"}
                  {p.reviewedAt ? ` · ${timeAgoAr(new Date(p.reviewedAt))}` : ""}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
