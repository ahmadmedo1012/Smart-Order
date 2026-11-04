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
import { CouponsSkeleton } from "@/components/dashboard/skeletons";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatLyd, formatLydAmount } from "@/lib/money";
import { useDirtyClose } from "@/hooks/use-dirty-close";
import { toast } from "sonner";
import {
  COUPON_TYPES,
  COUPON_TYPE_AR,
  couponDescribeAr,
  type CouponType,
} from "@/lib/coupon";
import { cn } from "@/lib/utils";
import { TicketPercent, Plus, Pencil, Trash2, X, Infinity as InfinityIcon } from "lucide-react";

/**
 * P43 SO-2 — أكواد الخصم (merchant surface): create/edit/toggle/delete
 * coupons, list with usage stats. The redemption rules (window, minimum,
 * usage cap, the discount math itself) live server-side — this page only
 * edits the RULES; every order re-validates them inside its transaction.
 * No plan gate by documented decision (a feature added, not a tier
 * invented).
 */

interface CouponRow {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  minOrder: number;
  maxUses: number | null;
  usedCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
}

/* The status chip's honest vocabulary — computed at render from the
   row's own rules (a coupon the merchant stopped ≠ an expired one). */
function couponStatus(c: CouponRow, now: Date): { label: string; cls: string } {
  if (!c.isActive) return { label: "موقوف", cls: "border-(--c-grey-ink)/35 bg-(--c-grey-bg) text-(--c-grey-deep)" };
  if (c.startsAt && new Date(c.startsAt) > now) return { label: "لم يبدأ بعد", cls: "border-(--c-sky-ink)/35 bg-(--c-sky-bg) text-(--c-sky-ink)" };
  if (c.expiresAt && new Date(c.expiresAt) < now) return { label: "انتهت صلاحيته", cls: "border-(--c-grey-ink)/35 bg-(--c-grey-bg) text-(--c-grey-deep)" };
  if (c.maxUses !== null && c.usedCount >= c.maxUses) return { label: "نفدت استخداماته", cls: "border-(--c-yellow-ink)/40 bg-(--c-yellow-bg) text-(--c-yellow-deep)" };
  return { label: "فعّال", cls: "border-(--c-mint-ink)/35 bg-(--c-mint-bg) text-(--c-mint-deep)" };
}

/** ISO → datetime-local (the input's own format), null-safe. */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const EXAMPLES = [
  { code: "WELCOME10", type: "نسبة 10% على أول طلب" },
  { code: "FREE-SHIP", type: "توصيل مجاني" },
  { code: "RAMADAN5", type: "خصم 5 د.ل" },
];

export default function CouponsPage() {
  const { businessId } = useBusiness();
  const [coupons, setCoupons] = React.useState<CouponRow[] | null>(null);
  const [error, setError] = React.useState(false);
  const [editing, setEditing] = React.useState<CouponRow | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleting, setDeleting] = React.useState<CouponRow | null>(null);
  const [deleteBusy, setDeleteBusy] = React.useState(false);

  const load = React.useCallback(() => {
    if (!businessId) return;
    api
      .get<{ coupons: CouponRow[] }>(`/api/coupons?businessId=${businessId}`)
      .then((r) => {
        setError(false);
        setCoupons(r.data.coupons);
      })
      .catch(() => setError(true));
  }, [businessId]);

  React.useEffect(load, [load]);

  async function toggleActive(c: CouponRow) {
    try {
      await api.patch(`/api/coupons/${c.id}`, {
        businessId,
        isActive: !c.isActive,
      });
      toast.success(!c.isActive ? `فُعّل الكود ${c.code}` : `أُوقِف الكود ${c.code}`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر التحديث");
    }
  }

  if (error) return <ErrorState retry={() => { setError(false); load(); }} />;
  if (coupons === null) return <CouponsSkeleton />;

  const activeCount = coupons.filter(
    (c) => couponStatus(c, new Date()).label === "فعّال",
  ).length;

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title="أكواد الخصم"
        subtitle="أصدر أكواداً يطبّقها العميل في صفحة الدفع — نسبة، مبلغاً ثابتاً، أو توصيلاً مجانياً. يتحقق الخادم من كل كود لحظة الطلب"
        meta={<span>{coupons.length} كود · {activeCount} فعّال</span>}
        divider
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4.5" aria-hidden="true" />
            كود جديد
          </Button>
        }
      />

      {coupons.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={TicketPercent}
            title="لم تُنشئ أكواد خصم بعد"
            description="شارك كوداً على واتساب أو انستغرام وتابع استخداماته من هنا. أمثلة:"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex.code}
                    onClick={() => setCreating(true)}
                    className="inline-flex h-8 items-center rounded-full border border-border bg-card px-3.5 text-xs font-semibold text-muted-foreground transition-[color,border-color,transform] duration-(--t-fast) hover:-translate-y-px hover:border-foreground/25 hover:text-foreground active:scale-[0.97]"
                  >
                    <span className="me-1.5 size-1.5 rounded-full border border-primary/55 bg-card" aria-hidden="true" />
                    <span className="font-mono" dir="ltr">{ex.code}</span>
                    <span className="ms-1 font-normal">— {ex.type}</span>
                  </button>
                ))}
              </div>
            }
          />
        </div>
      ) : (
        <ul className="space-y-2.5">
          {coupons.map((c) => {
            const status = couponStatus(c, new Date());
            return (
              <li
                key={c.id}
                className="rounded-xl border border-border bg-card p-4 flex items-center gap-3"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-accent-foreground">
                  <TicketPercent className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 font-semibold text-sm">
                    <span className="font-mono tracking-wide" dir="ltr">{c.code}</span>
                    <span
                      className={cn(
                        "rounded-sm border px-2 py-0.5 text-[11px] font-medium",
                        status.cls,
                      )}
                    >
                      {status.label}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {couponDescribeAr(c)}
                    {c.minOrder > 0 && (
                      <span className="font-mono tabular-nums"> · حد أدنى {formatLyd(c.minOrder)}</span>
                    )}
                    {c.startsAt && (
                      <span className="font-mono tabular-nums">
                        {" · من "}
                        {new Date(c.startsAt).toLocaleDateString("ar-LY")}
                      </span>
                    )}
                    {c.expiresAt && (
                      <span className="font-mono tabular-nums">
                        {" · حتى "}
                        {new Date(c.expiresAt).toLocaleDateString("ar-LY")}
                      </span>
                    )}
                  </div>
                  {/* usage — the merchant's own counter (redemptions are
                      written inside the order transaction, never here) */}
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono tabular-nums">
                    <span>
                      الاستخدام: {c.usedCount}
                      {c.maxUses === null ? (
                        <span className="ms-1 inline-flex items-center gap-0.5" title="بلا حد">
                          <InfinityIcon className="size-3" aria-hidden="true" />
                        </span>
                      ) : (
                        ` من ${c.maxUses}`
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <div className="flex items-center rounded-lg border border-border px-2 py-1.5 me-1">
                    <Switch
                      id={`coupon-active-${c.id}`}
                      checked={c.isActive}
                      onCheckedChange={() => toggleActive(c)}
                      aria-label={c.isActive ? `إيقاف الكود ${c.code}` : `تفعيل الكود ${c.code}`}
                    />
                  </div>
                  <button
                    onClick={() => setEditing(c)}
                    className="flex size-10 items-center justify-center rounded-lg hover:bg-muted transition-colors"
                    aria-label={`تعديل الكود ${c.code}`}
                  >
                    <Pencil className="size-4 text-muted-foreground" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => setDeleting(c)}
                    className="flex size-10 items-center justify-center rounded-lg hover:bg-destructive/10 transition-colors"
                    aria-label={`حذف الكود ${c.code}`}
                  >
                    <Trash2 className="size-4 text-destructive-ink" aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
        يُطبَّق الكود في صفحة الدفع ويُعاد التحقق منه في الخادم لحظة الطلب —
        الصلاحية والحد الأدنى وسقف الاستخدام كلها قرارات خادم، والمال
        بالدرهم الصحيح. الكود المستخدم لا يُحذف بل يُوقَّف (طلباته المسجلة
        تحتفظ بلقطته).
      </p>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={deleting && deleting.usedCount > 0 ? `إيقاف الكود "${deleting.code}"؟` : `حذف الكود "${deleting?.code}"؟`}
        description={
          deleting && deleting.usedCount > 0
            ? "استُخدم هذا الكود في طلبات فعلية، فلا يُحذف نهائياً — سيُوقَّف فقط ولن يقبل طلبات جديدة، مع بقاء سجله في التقارير."
            : "لم يُستخدم هذا الكود بعد — سيُحذف نهائياً ولن يستطيع أي عميل تطبيقه."
        }
        confirmLabel={deleting && deleting.usedCount > 0 ? "إيقاف" : "حذف"}
        busy={deleteBusy}
        onConfirm={async () => {
          if (!deleting) return;
          setDeleteBusy(true);
          try {
            const r = await api.delete<{ deleted: boolean; deactivated: boolean }>(
              `/api/coupons/${deleting.id}?businessId=${businessId}`,
            );
            toast.success(r.data.deactivated ? "أُوقِف الكود — سجله محفوظ" : "حُذف الكود");
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
        <CouponDialog
          coupon={editing}
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

/* ── The create/edit dialog (the ZoneDialog anatomy) ───────────────── */

function CouponDialog({
  coupon,
  businessId,
  onClose,
}: {
  coupon: CouponRow | null;
  businessId: string;
  onClose: (changed: boolean) => void;
}) {
  const [code, setCode] = React.useState(coupon?.code ?? "");
  const [type, setType] = React.useState<CouponType>(coupon?.type ?? "PERCENT");
  const [value, setValue] = React.useState(
    coupon ? (coupon.type === "FIXED" ? formatLydAmount(coupon.value) : String(coupon.value)) : "",
  );
  const [minOrder, setMinOrder] = React.useState(
    coupon && coupon.minOrder > 0 ? formatLydAmount(coupon.minOrder) : "",
  );
  const [maxUses, setMaxUses] = React.useState(
    coupon?.maxUses != null ? String(coupon.maxUses) : "",
  );
  const [startsAt, setStartsAt] = React.useState(isoToLocalInput(coupon?.startsAt ?? null));
  const [expiresAt, setExpiresAt] = React.useState(isoToLocalInput(coupon?.expiresAt ?? null));
  const [isActive, setIsActive] = React.useState(coupon?.isActive ?? true);
  const [errors, setErrors] = React.useState<{ code?: string; value?: string }>({});
  const [saving, setSaving] = React.useState(false);

  const pristine = {
    code: coupon?.code ?? "",
    type: coupon?.type ?? "PERCENT",
    value: coupon ? (coupon.type === "FIXED" ? formatLydAmount(coupon.value) : String(coupon.value)) : "",
    minOrder: coupon && coupon.minOrder > 0 ? formatLydAmount(coupon.minOrder) : "",
    maxUses: coupon?.maxUses != null ? String(coupon.maxUses) : "",
    startsAt: isoToLocalInput(coupon?.startsAt ?? null),
    expiresAt: isoToLocalInput(coupon?.expiresAt ?? null),
    isActive: coupon?.isActive ?? true,
  };
  const dirty =
    code !== pristine.code ||
    type !== pristine.type ||
    value !== pristine.value ||
    minOrder !== pristine.minOrder ||
    maxUses !== pristine.maxUses ||
    startsAt !== pristine.startsAt ||
    expiresAt !== pristine.expiresAt ||
    isActive !== pristine.isActive;
  const { requestClose, guard } = useDirtyClose({
    dirty,
    busy: saving,
    close: () => onClose(false),
    entityLabel: coupon ? "الكود" : "الكود الجديد",
  });

  async function save() {
    const e: { code?: string; value?: string } = {};
    if (!code.trim()) e.code = "أدخل كود الخصم";
    if (type !== "FREE_DELIVERY" && !value.trim()) e.value = "أدخل قيمة الخصم";
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setSaving(true);
    try {
      const body = {
        businessId,
        code: code.trim(),
        type,
        value: type === "FREE_DELIVERY" ? "0" : value.trim(),
        minOrder: minOrder || "0",
        maxUses: maxUses.trim() === "" ? null : maxUses.trim(),
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        isActive,
      };
      if (coupon) {
        await api.patch(`/api/coupons/${coupon.id}`, body);
        toast.success("تم تحديث الكود");
      } else {
        await api.post("/api/coupons", body);
        toast.success("أُنشئ الكود — شاركه مع عملائك");
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
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div>
            <DialogTitle className="font-heading text-lg font-semibold text-foreground">
              {coupon ? "تعديل كود الخصم" : "كود خصم جديد"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-[13px] text-muted-foreground">
              يتحقق منه الخادم لحظة كل طلب
            </DialogDescription>
          </div>
          <DialogClose
            className="flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="إغلاق"
          >
            <X className="size-4.5" aria-hidden="true" />
          </DialogClose>
        </div>
        <div className="max-h-[65vh] space-y-4 overflow-y-auto p-5">
          <div className="space-y-2">
            <Label htmlFor="cp-code">الكود *</Label>
            <Input
              id="cp-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (errors.code) setErrors((x) => ({ ...x, code: undefined }));
              }}
              placeholder="WELCOME10"
              maxLength={40}
              dir="ltr"
              className="font-mono text-start uppercase"
              aria-invalid={!!errors.code}
              aria-describedby={errors.code ? "cp-code-error" : undefined}
            />
            {errors.code && <FieldError id="cp-code-error">{errors.code}</FieldError>}
            <p className="text-[11px] text-muted-foreground">
              حروف وأرقام بلا فراغات — يقبلها العميل بأي حالة أحرف (SAVE10 = save10)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cp-type">نوع الخصم *</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                const next = v as CouponType;
                setType(next);
                /* the value's unit changes with the type — reset to the
                   type's natural seed instead of a misleading number */
                setValue(next === "PERCENT" ? "10" : next === "FIXED" ? "5" : "");
                if (errors.value) setErrors((x) => ({ ...x, value: undefined }));
              }}
            >
              <SelectTrigger id="cp-type" className="w-full bg-card" aria-label="نوع الخصم">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUPON_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {COUPON_TYPE_AR[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type !== "FREE_DELIVERY" && (
            <div className="space-y-2">
              <Label htmlFor="cp-value">
                {type === "PERCENT" ? "النسبة (%) *" : "قيمة الخصم (د.ل) *"}
              </Label>
              <Input
                id="cp-value"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (errors.value) setErrors((x) => ({ ...x, value: undefined }));
                }}
                inputMode={type === "PERCENT" ? "numeric" : "decimal"}
                placeholder={type === "PERCENT" ? "10" : "5"}
                dir="ltr"
                className="font-mono text-start tabular-nums"
                aria-invalid={!!errors.value}
                aria-describedby={errors.value ? "cp-value-error" : undefined}
              />
              {errors.value && <FieldError id="cp-value-error">{errors.value}</FieldError>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cp-min">حد أدنى للطلب (د.ل)</Label>
              <Input
                id="cp-min"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                inputMode="decimal"
                placeholder="اختياري"
                dir="ltr"
                className="font-mono text-start tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-uses">سقف الاستخدامات</Label>
              <Input
                id="cp-uses"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                inputMode="numeric"
                placeholder="بلا حد"
                dir="ltr"
                className="font-mono text-start tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cp-starts">يبدأ من</Label>
              <Input
                id="cp-starts"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                dir="ltr"
                className="font-mono text-start text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-expires">ينتهي في</Label>
              <Input
                id="cp-expires"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                dir="ltr"
                className="font-mono text-start text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-sm border px-4 py-3">
            <Label htmlFor="cp-active">الكود مفعّل</Label>
            <Switch id="cp-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>
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
