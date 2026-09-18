"use client";

import * as React from "react";
import { api } from "@/lib/client";
import { useBusiness } from "@/components/dashboard/shell";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { PAYMENT_TYPES, PAYMENT_TYPE_AR, PAYMENT_TYPE_DESCRIPTIONS, PAYMENT_TYPES as PT, type PaymentType } from "@/lib/constants";
import { toast } from "sonner";
import { CreditCard, Plus, Trash2, Loader2, Phone } from "lucide-react";

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
      <div>
        <h1 className="font-heading text-2xl font-bold">طرق الدفع</h1>
        <p className="text-sm text-muted-foreground mt-1">
          اختر ما يظهر للعملاء في صفحة الدفع. طرق التحويل تحتاج رقم الهاتف الذي يستقبل الحوالات.
        </p>
      </div>

      {methods.length === 0 ? (
        <EmptyState icon={CreditCard} title="لا طرق دفع مفعّلة" description="أضف طريقة واحدة على الأقل ليتمكن العملاء من إتمام الطلب" />
      ) : (
        <ul className="space-y-2.5">
          {methods.map((m) => {
            const config = m.config ? (JSON.parse(m.config) as { number?: string }) : null;
            return (
              <li key={m.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    <CreditCard className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm flex items-center gap-2 flex-wrap">
                      {m.name}
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {PAYMENT_TYPE_AR[m.type]}
                      </span>
                      {!m.isActive && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">معطلة</span>
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
                      className={`rounded-lg px-3 h-8 text-xs font-medium border transition-colors ${
                        m.isActive ? "border-success/40 text-success hover:bg-success/10" : "border-border text-muted-foreground hover:bg-muted"
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
                      <Trash2 className="size-4 text-destructive" aria-hidden="true" />
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
          className="w-full rounded-xl border border-dashed border-primary/40 bg-primary/5 h-11 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors inline-flex items-center justify-center gap-2"
        >
          <Plus className="size-4.5" aria-hidden="true" />
          إضافة طريقة دفع ({available.length} متاحة)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="طريقة دفع جديدة">
      <div className="absolute inset-0 bg-black/50" onClick={() => onClose(false)} aria-hidden="true" />
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl p-5">
        <h2 className="font-heading font-semibold text-lg">طريقة دفع جديدة</h2>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">النوع</label>
            <div className="grid grid-cols-2 gap-2">
              {available.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onTypeChange(t)}
                  className={`rounded-lg border h-10 text-xs font-medium transition-colors ${
                    type === t ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                  }`}
                >
                  {PAYMENT_TYPE_AR[t]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="m-name" className="text-sm font-medium">الاسم الظاهر للعملاء *</label>
            <input
              id="m-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-orange"
            />
          </div>
          {NEEDS_NUMBER.includes(type) && (
            <div className="space-y-2">
              <label htmlFor="m-number" className="text-sm font-medium">رقم الهاتف المستقبل *</label>
              <input
                id="m-number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="0912345678"
                inputMode="tel"
                dir="ltr"
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-start tabular focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-orange"
              />
              <p className="text-[11px] text-muted-foreground">
                {type === "MADAR" ? "مثال لأرقام مدار: 091 / 093" : type === "LIBYANA" ? "مثال لأرقام ليبيانا: 092 / 094" : "يظهر للعميل ليرسل إليه التحويل"}
              </p>
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="m-inst" className="text-sm font-medium">تعليمات تظهر للعميل</label>
            <textarea
              id="m-inst"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={PAYMENT_TYPE_DESCRIPTIONS[type]}
              rows={2}
              maxLength={300}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-orange"
            />
          </div>
        </div>
        <div className="mt-5 flex gap-2 justify-end">
          <button onClick={() => onClose(false)} className="h-9 px-4 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
            إلغاء
          </button>
          <button onClick={save} disabled={saving} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center gap-2">
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            إضافة
          </button>
        </div>
      </div>
    </div>
  );
}
