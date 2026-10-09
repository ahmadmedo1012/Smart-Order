"use client";

import * as React from "react";
import { api } from "@/lib/client";
import { useBusiness } from "@/components/dashboard/shell";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/dashboard/page-header";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { FieldError } from "@/components/dashboard/form-field";
import { DeliverySkeleton } from "@/components/dashboard/skeletons";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatLyd } from "@/lib/money";
import { useDirtyClose } from "@/hooks/use-dirty-close";
import { toast } from "sonner";
import { Truck, Plus, Pencil, Trash2, X } from "lucide-react";

interface Zone {
  id: string;
  name: string;
  fee: number;
  minOrder: number;
  isActive: boolean;
  sortOrder: number;
}

const EXAMPLES = [
  { name: "وسط المدينة", fee: "5" },
  { name: "تاجوراء", fee: "8" },
  { name: "جنزور", fee: "10" },
];

export default function DeliveryPage() {
  const { businessId } = useBusiness();
  const [zones, setZones] = React.useState<Zone[] | null>(null);
  const [error, setError] = React.useState(false);
  const [editing, setEditing] = React.useState<Zone | null>(null);
  const [creating, setCreating] = React.useState(false);
  /* r131 (F3, A5 P2-5): destructive confirm via the shared Radix
     ConfirmDialog (was a native window.confirm). */
  const [deleting, setDeleting] = React.useState<Zone | null>(null);
  const [deleteBusy, setDeleteBusy] = React.useState(false);

  const load = React.useCallback(() => {
    if (!businessId) return;
    setError(false);
    api
      .get<{ zones: Zone[] }>(`/api/delivery-zones?businessId=${businessId}`)
      .then((r) => setZones(r.data.zones))
      .catch(() => setError(true));
  }, [businessId]);

  React.useEffect(load, [load]);

  if (error) return <ErrorState retry={load} />;
  if (zones === null) {
    /* r131 (F3, A5 P2-7): shape-matched rows skeleton. */
    return <DeliverySkeleton />;
  }

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title="مناطق التوصيل"
        subtitle="حدد المناطق التي توصل إليها، ورسوم كل منطقة، والحد الأدنى للطلب"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4.5" aria-hidden="true" />
            منطقة جديدة
          </Button>
        }
      />

      {zones.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={Truck}
            title="لم تحدد مناطق توصيل بعد"
            description="بدون مناطق، يستطيع العملاء طلب الاستلام من الفرع فقط. أضف مناطق مثل:"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex.name}
                    onClick={() => setCreating(true)}
                    className="inline-flex h-8 items-center rounded-full border border-border bg-card px-3.5 text-xs font-semibold text-muted-foreground transition-[color,border-color,transform] duration-(--t-fast) hover:-translate-y-px hover:border-foreground/25 hover:text-foreground active:scale-[0.97]"
                  >
                    {ex.name} —{" "}
                    <span className="ms-1 tabular-nums">{ex.fee} د.ل</span>
                  </button>
                ))}
              </div>
            }
          />
        </div>
      ) : (
        <ul className="space-y-2.5">
          {zones.map((z) => (
            <li
              key={z.id}
              className="rounded-xl border border-border bg-card p-4 flex items-center gap-3"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-accent-foreground shrink-0">
                <Truck className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm flex items-center gap-2">
                  {z.name}
                  {!z.isActive && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      معطلة
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  <span className="tabular-nums">
                    التوصيل: {formatLyd(z.fee)}
                  </span>
                  {z.minOrder > 0 && (
                    <span className="tabular-nums">
                      {" "}
                      · الحد الأدنى: {formatLyd(z.minOrder)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setEditing(z)}
                  className="rounded-lg p-2 hover:bg-muted transition-colors"
                  aria-label={`تعديل ${z.name}`}
                >
                  <Pencil
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </button>
                <button
                  onClick={() => setDeleting(z)}
                  className="rounded-lg p-2 hover:bg-destructive/10 transition-colors"
                  aria-label={`حذف ${z.name}`}
                >
                  <Trash2
                    className="size-4 text-destructive-ink"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-4">
        تُطبق رسوم التوصيل تلقائياً في صفحة الدفع حسب المنطقة التي يختارها
        العميل، ويُرفض الطلب تلقائياً إذا لم يبلغ الحد الأدنى للمنطقة.
      </p>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`حذف منطقة "${deleting?.name}"؟`}
        description="لن يستطيع العملاء اختيار هذه المنطقة للتوصيل بعد الحذف."
        confirmLabel="حذف"
        busy={deleteBusy}
        onConfirm={async () => {
          if (!deleting) return;
          setDeleteBusy(true);
          try {
            await api.delete(
              `/api/delivery-zones/${deleting.id}?businessId=${businessId}`,
            );
            toast.success("تم حذف المنطقة");
            setDeleting(null);
            load();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "تعذّر الحذف");
          } finally {
            setDeleteBusy(false);
          }
        }}
      />

      {(creating || editing) && (
        <ZoneDialog
          zone={editing}
          businessId={businessId}
          onClose={(changed) => {
            setCreating(false);
            setEditing(null);
            if (changed) load();
          }}
        />
      )}
    </div>
  );
}

function ZoneDialog({
  zone,
  businessId,
  onClose,
}: {
  zone: Zone | null;
  businessId: string;
  onClose: (changed: boolean) => void;
}) {
  const [name, setName] = React.useState(zone?.name ?? "");
  const [errors, setErrors] = React.useState<{ name?: string; fee?: string }>(
    {},
  );
  const [fee, setFee] = React.useState(
    zone ? (zone.fee / 1000).toFixed(3).replace(/\.?0+$/, "") : "",
  );
  const [minOrder, setMinOrder] = React.useState(
    zone && zone.minOrder > 0
      ? (zone.minOrder / 1000).toFixed(3).replace(/\.?0+$/, "")
      : "",
  );
  const [isActive, setIsActive] = React.useState(zone?.isActive ?? true);
  const [saving, setSaving] = React.useState(false);

  /* r133 (A1 S6): dirty-draft guard (name/fee/min/active) — the same
     mapping that seeded the useState drafts, so toggles and typos all
     count as dirty (product-editor recipe via useDirtyClose). */
  const pristine = {
    name: zone?.name ?? "",
    fee: zone ? (zone.fee / 1000).toFixed(3).replace(/\.?0+$/, "") : "",
    minOrder:
      zone && zone.minOrder > 0
        ? (zone.minOrder / 1000).toFixed(3).replace(/\.?0+$/, "")
        : "",
    isActive: zone?.isActive ?? true,
  };
  const dirty =
    name !== pristine.name ||
    fee !== pristine.fee ||
    minOrder !== pristine.minOrder ||
    isActive !== pristine.isActive;
  const { requestClose, guard } = useDirtyClose({
    dirty,
    busy: saving,
    close: () => onClose(false),
    entityLabel: zone ? "المنطقة" : "المنطقة الجديدة",
  });

  async function save() {
    /* r131 (F3, A5 P1-6): field-level validation (aria-invalid recipe
       + inline messages), not toast-only. */
    const e: { name?: string; fee?: string } = {};
    if (!name.trim()) e.name = "أدخل اسم المنطقة";
    if (!fee.trim() || isNaN(parseFloat(fee))) e.fee = "أدخل رسوم توصيل صحيحة";
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setSaving(true);
    try {
      if (zone) {
        await api.patch(`/api/delivery-zones/${zone.id}`, {
          businessId,
          name: name.trim(),
          fee,
          minOrder: minOrder || "0",
          isActive,
        });
        toast.success("تم تحديث المنطقة");
      } else {
        await api.post("/api/delivery-zones", {
          businessId,
          name: name.trim(),
          fee,
          minOrder: minOrder || "0",
        });
        toast.success("تمت إضافة المنطقة");
      }
      onClose(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && requestClose()}>
      <DialogContent
        dir="rtl"
        showCloseButton={false}
        className="max-w-sm gap-0 overflow-hidden rounded-xl border-border bg-card p-0 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/60 p-5">
          <div>
            <DialogTitle className="font-heading text-lg font-semibold text-foreground">
              {zone ? "تعديل المنطقة" : "منطقة توصيل جديدة"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-[13px] text-muted-foreground">
              تُطبق الرسوم تلقائياً عند الدفع
            </DialogDescription>
          </div>
          <DialogClose
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="إغلاق"
          >
            <X className="size-4.5" aria-hidden="true" />
          </DialogClose>
        </div>
        <div className="space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="z-name">اسم المنطقة *</Label>
            <Input
              id="z-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((x) => ({ ...x, name: undefined }));
              }}
              placeholder="مثال: تاجوراء"
              maxLength={60}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "z-name-error" : undefined}
            />
            {errors.name && (
              <FieldError id="z-name-error">{errors.name}</FieldError>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="z-fee">رسوم التوصيل (د.ل) *</Label>
              <Input
                id="z-fee"
                value={fee}
                onChange={(e) => {
                  setFee(e.target.value);
                  if (errors.fee) setErrors((x) => ({ ...x, fee: undefined }));
                }}
                inputMode="decimal"
                placeholder="8"
                dir="ltr"
                className="text-start tabular-nums"
                aria-invalid={!!errors.fee}
                aria-describedby={errors.fee ? "z-fee-error" : undefined}
              />
              {errors.fee && (
                <FieldError id="z-fee-error">{errors.fee}</FieldError>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="z-min">حد أدنى (د.ل)</Label>
              <Input
                id="z-min"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                inputMode="decimal"
                placeholder="اختياري"
                dir="ltr"
                className="text-start tabular-nums"
              />
            </div>
          </div>
          {zone && (
            /* r131 (F3): raw accent checkbox → the Switch primitive. */
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <Label htmlFor="z-active">المنطقة مفعّلة</Label>
              <Switch
                id="z-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border/60 p-4">
          <DialogClose asChild>
            <Button variant="outline">إلغاء</Button>
          </DialogClose>
          <Button onClick={save} disabled={saving} loading={saving}>
            حفظ
          </Button>
        </div>
      </DialogContent>
      {guard}
    </Dialog>
  );
}
