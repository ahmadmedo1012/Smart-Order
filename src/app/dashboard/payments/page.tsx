"use client";

import * as React from "react";
import { api } from "@/lib/client";
import { useBusiness } from "@/components/dashboard/shell";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/dashboard/page-header";
import { pillClasses } from "@/components/dashboard/filter-pills";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { PAYMENT_TYPES, PAYMENT_TYPE_AR, PAYMENT_TYPE_DESCRIPTIONS, type PaymentType } from "@/lib/constants";
import { toast } from "sonner";
import { CreditCard, Plus, Trash2, Loader2, Phone, X } from "lucide-react";

interface Method {
  id: string;
  type: PaymentType;
  name: string;
  instructions: string | null;
  config: string | null;
  isActive: boolean;
  sortOrder: number;
}

const NEEDS_NUMBER: PaymentType[] = ["MADAR", "LIBYANA", "MANUAL", "WHATSAPP"];

export default function PaymentsPage() {
  const { businessId } = useBusiness();
  const [methods, setMethods] = React.useState<Method[] | null>(null);
  const [error, setError] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  const load = React.useCallback(() => {
    if (!businessId) return;
    setError(false);
    api
      .get<{ methods: Method[] }>(`/api/payment-methods?businessId=${businessId}`)
      .then((r) => setMethods(r.data.methods))
      .catch(() => setError(true));
  }, [businessId]);

  React.useEffect(load, [load]);

  if (error) return <ErrorState retry={load} />;
  if (methods === null) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  const available = PAYMENT_TYPES.filter((t) => !methods.some((m) => m.type === t));

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title="طرق الدفع"
        subtitle="اختر ما يظهر للعملاء في صفحة الدفع. طرق التحويل تحتاج رقم الهاتف الذي يستقبل الحوالات."
      />

      {methods.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="لا طرق دفع مفعّلة"
          description="أضف طريقة واحدة على الأقل ليتمكن العملاء من إتمام الطلب"
          action={
            available.length > 0 ? (
              <Button variant="outline" onClick={() => setCreating(true)}>
                <Plus className="size-4.5" aria-hidden="true" />
                إضافة طريقة دفع
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {methods.map((m) => {
            const config = m.config ? (JSON.parse(m.config) as { number?: string }) : null;
            return (
              <li key={m.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-accent-foreground shrink-0">
                    <CreditCard className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm flex items-center gap-2 flex-wrap">
                      {m.name}
                      <span className="inline-flex items-center rounded-full bg-(--c-grey-bg) px-2.5 py-1 text-[11px] font-semibold text-(--c-grey-deep)">
                        {PAYMENT_TYPE_AR[m.type]}
                      </span>
                      {!m.isActive && (
                        <span className="inline-flex items-center rounded-full bg-(--c-grey-bg) px-2.5 py-1 text-[11px] font-semibold text-(--c-grey-deep)">معطلة</span>
                      )}
                    </div>
                    {config?.number && (
                      <div className="text-xs text-muted-foreground mt-1 tabular flex items-center gap-1.5" dir="ltr">
                        <Phone className="size-3" aria-hidden="true" />
                        {config.number}
                      </div>
                    )}
                    {m.instructions && <p className="text-xs text-muted-foreground mt-1 truncate">{m.instructions}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={async () => {
                        try {
                          await api.patch(`/api/payment-methods/${m.id}`, { businessId, isActive: !m.isActive });
                          load();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "تعذر التحديث");
                        }
                      }}
                      className={`inline-flex h-8 items-center rounded-full border border-transparent px-3 text-xs font-semibold transition-colors duration-(--t-fast) active:scale-[0.97] ${
                        m.isActive
                          ? "bg-(--c-mint-bg) text-(--c-mint-deep)"
                          : "bg-(--c-grey-bg) text-(--c-grey-deep)"
                      }`}
                    >
                      {m.isActive ? "مفعّلة" : "معطلة"}
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`حذف "${m.name}"؟`)) return;
                        try {
                          await api.delete(`/api/payment-methods/${m.id}?businessId=${businessId}`);
                          toast.success("تم الحذف");
                          load();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "تعذر الحذف");
                        }
                      }}
                      className="rounded-lg p-2 hover:bg-destructive/10 transition-colors"
                      aria-label={`حذف ${m.name}`}
                    >
                      <Trash2 className="size-4 text-destructive-ink" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {available.length > 0 && (
        <button
          onClick={() => setCreating(true)}
          className="w-full rounded-xl border border-dashed border-border bg-card h-11 text-sm font-semibold text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-accent-foreground transition-[color,border-color,background-color] duration-(--t-fast) inline-flex items-center justify-center gap-2 active:scale-[0.995]"
        >
          <Plus className="size-4.5" aria-hidden="true" />
          إضافة طريقة دفع (<span className="tabular nums">{available.length}</span> متاحة)
        </button>
      )}

      <div className="rounded-xl border border-border/70 bg-muted/40 p-4 text-xs text-muted-foreground leading-relaxed">
        <strong className="text-foreground">ملاحظة أمانة:</strong> طرق الدفع هنا يدوية بالكامل — لا يوجد تحقق آلي من الحوالات.
        عند اختيار العميل لطريقة تحويل، تصل الطلب بحالة «غير مدفوع» وتؤكد أنت الاستلام يدوياً من صفحة الطلب بعد وصول المبلغ.
        بنية النظام جاهزة لربط بوابة دفع إلكترونية مستقبلاً عند توفّر مزود خدمة في ليبيا.
      </div>

      {creating && (
        <MethodDialog
          available={available}
          businessId={businessId}
          onClose={(changed) => {
            setCreating(false);
            if (changed) load();
          }}
        />
      )}
    </div>
  );
}

function MethodDialog({
  available,
  businessId,
  onClose,
}: {
  available: PaymentType[];
  businessId: string;
  onClose: (changed: boolean) => void;
}) {
  const [type, setType] = React.useState<PaymentType>(available[0]);
  const [name, setName] = React.useState(PAYMENT_TYPE_AR[available[0]]);
  const [instructions, setInstructions] = React.useState("");
  const [number, setNumber] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  function onTypeChange(t: PaymentType) {
    setType(t);
    setName(PAYMENT_TYPE_AR[t]);
    setInstructions("");
  }

  async function save() {
    if (!name.trim()) {
      toast.error("أدخل الاسم الظاهر للعملاء");
      return;
    }
    if (NEEDS_NUMBER.includes(type) && !number.trim()) {
      toast.error("أدخل رقم الهاتف المستقبل للحواليات");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/payment-methods", {
        businessId,
        type,
        name: name.trim(),
        instructions: instructions.trim() || PAYMENT_TYPE_DESCRIPTIONS[type],
        number: number.trim(),
      });
      toast.success("تمت إضافة طريقة الدفع");
      onClose(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose(false)}>
      <DialogContent
        dir="rtl"
        showCloseButton={false}
        className="max-w-sm gap-0 overflow-hidden rounded-xl border-border bg-card p-0 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/60 p-5">
          <div>
            <DialogTitle className="font-heading text-lg font-semibold text-foreground">طريقة دفع جديدة</DialogTitle>
            <DialogDescription className="mt-1 text-[13px] text-muted-foreground">
              تظهر للعميل في صفحة الدفع
            </DialogDescription>
          </div>
          <DialogClose
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            aria-label="إغلاق"
          >
            <X className="size-4.5" aria-hidden="true" />
          </DialogClose>
        </div>
        <div className="space-y-4 p-5">
          <div className="space-y-2">
            <span className="text-sm font-medium" id="m-type-label">النوع</span>
            <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="m-type-label">
              {available.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onTypeChange(t)}
                  aria-pressed={type === t}
                  className={pillClasses(type === t, "h-10")}
                >
                  {PAYMENT_TYPE_AR[t]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="m-name" className="text-sm font-medium">الاسم الظاهر للعملاء *</label>
            <Input
              id="m-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
            />
          </div>
          {NEEDS_NUMBER.includes(type) && (
            <div className="space-y-2">
              <label htmlFor="m-number" className="text-sm font-medium">رقم الهاتف المستقبل *</label>
              <Input
                id="m-number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="0912345678"
                inputMode="tel"
                dir="ltr"
                className="text-start tabular"
              />
              <p className="text-[11px] text-muted-foreground">
                {type === "MADAR" ? "مثال لأرقام مدار: 091 / 093" : type === "LIBYANA" ? "مثال لأرقام ليبيانا: 092 / 094" : "يظهر للعميل ليرسل إليه التحويل"}
              </p>
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="m-inst" className="text-sm font-medium">تعليمات تظهر للعميل</label>
            <Textarea
              id="m-inst"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={PAYMENT_TYPE_DESCRIPTIONS[type]}
              rows={2}
              maxLength={300}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border/60 p-4">
          <DialogClose asChild>
            <Button variant="outline">إلغاء</Button>
          </DialogClose>
          <Button onClick={save} disabled={saving} className="inline-flex items-center gap-2">
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            إضافة
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
