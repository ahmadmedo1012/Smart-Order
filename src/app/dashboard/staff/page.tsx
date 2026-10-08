"use client";

import * as React from "react";
import { api } from "@/lib/client";
import { useBusiness } from "@/components/dashboard/shell";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/dashboard/page-header";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { FieldError } from "@/components/dashboard/form-field";
import { StaffSkeleton } from "@/components/dashboard/skeletons";
import { pillClasses } from "@/components/dashboard/filter-pills";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ROLE_AR, ROLES, ROLE_PERMISSIONS, type Role } from "@/lib/constants";
import { formatArabicDate } from "@/lib/arabic";
import { toast } from "sonner";
import { UserCog, Plus, Trash2, ShieldCheck, X } from "lucide-react";

interface StaffRow {
  id: string;
  role: Role;
  extraPerms: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    createdAt: string;
  };
}

export default function StaffPage() {
  const { businessId } = useBusiness();
  const [staff, setStaff] = React.useState<StaffRow[] | null>(null);
  const [error, setError] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  /* r131 (F3, A5 P2-5): destructive confirm via the shared Radix
     ConfirmDialog (was a native window.confirm). */
  const [removing, setRemoving] = React.useState<StaffRow | null>(null);
  const [removeBusy, setRemoveBusy] = React.useState(false);

  const load = React.useCallback(() => {
    if (!businessId) return;
    setError(false);
    api
      .get<{ staff: StaffRow[] }>(`/api/staff?businessId=${businessId}`)
      .then((r) => setStaff(r.data.staff))
      .catch(() => setError(true));
  }, [businessId]);

  React.useEffect(load, [load]);

  if (error) return <ErrorState retry={load} />;
  if (staff === null) {
    /* r131 (F3, A5 P2-7): shape-matched rows skeleton. */
    return <StaffSkeleton />;
  }

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title="فريق العمل"
        subtitle="أضف حسابات لموظفيك بصلاحيات محددة"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4.5" aria-hidden="true" />
            عضو جديد
          </Button>
        }
      />

      {staff.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="لا أعضاء"
          description="أضف موظفين ليتابعوا الطلبات والمنتجات بصلاحيات محددة"
          action={
            <Button variant="outline" onClick={() => setCreating(true)}>
              <Plus className="size-4.5" aria-hidden="true" />
              أضف أول عضو
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {staff.map((s) => (
            <li
              key={s.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-accent-foreground text-sm font-bold shrink-0"
                  aria-hidden="true"
                >
                  {s.user.name.slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">
                    {s.user.name}
                  </div>
                  <div
                    className="text-xs text-muted-foreground truncate"
                    dir="ltr"
                  >
                    {s.user.email}
                  </div>
                </div>
                {/* r131 (F3, A5 P1-1): role select rides the canonical
                    ui/select primitive (sm rung, halo focus) — was a
                    raw native h-8 select with the retired ring recipe. */}
                {s.role === "OWNER" ? (
                  <span className="inline-flex items-center rounded-full bg-(--c-copper-bg) px-2.5 py-1 text-[11px] font-semibold text-(--c-copper-deep) shrink-0">
                    {ROLE_AR[s.role]}
                  </span>
                ) : (
                  <Select
                    value={s.role}
                    onValueChange={async (role) => {
                      try {
                        await api.patch(`/api/staff/${s.id}`, {
                          businessId,
                          role,
                        });
                        toast.success("تم تحديث الدور");
                        load();
                      } catch (err) {
                        toast.error(
                          err instanceof Error ? err.message : "تعذر التحديث",
                        );
                      }
                    }}
                  >
                    <SelectTrigger
                      size="sm"
                      aria-label={`دور ${s.user.name}`}
                      className="shrink-0"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.filter((r) => r !== "OWNER").map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_AR[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {s.role !== "OWNER" && (
                  <button
                    onClick={() => setRemoving(s)}
                    className="rounded-lg p-2 hover:bg-destructive/10 transition-colors shrink-0"
                    aria-label={`إزالة ${s.user.name}`}
                  >
                    <Trash2
                      className="size-4 text-destructive-ink"
                      aria-hidden="true"
                    />
                  </button>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                {(ROLE_PERMISSIONS[s.role] as readonly string[])
                  .slice(0, 4)
                  .join(" · ")}
                {ROLE_PERMISSIONS[s.role].length > 4 && " …"}
                <span className="ms-auto tabular-nums">
                  انضم {formatArabicDate(s.createdAt)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-border/70 bg-muted/40 p-4 text-xs text-muted-foreground leading-relaxed">
        <strong className="text-foreground">الأدوار:</strong> المالك — كل
        الصلاحيات · المدير — كل شيء عدا الفريق والإعدادات · الموظف — متابعة
        الطلبات وتحديث حالاتها فقط. الصلاحيات تُطبق على الخادم وليس على الواجهة
        فقط.
      </div>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(v) => !v && setRemoving(null)}
        title={`إزالة ${removing?.user.name ?? ""} من الفريق؟`}
        description="يفقد العضو صلاحياته على هذا العمل فوراً، ويمكن إضافته مجدداً لاحقاً."
        confirmLabel="إزالة"
        busy={removeBusy}
        onConfirm={async () => {
          if (!removing) return;
          setRemoveBusy(true);
          try {
            await api.delete(
              `/api/staff/${removing.id}?businessId=${businessId}`,
            );
            toast.success("تمت الإزالة");
            setRemoving(null);
            load();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "تعذرت الإزالة");
          } finally {
            setRemoveBusy(false);
          }
        }}
      />

      {creating && (
        <StaffDialog
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

function StaffDialog({
  businessId,
  onClose,
}: {
  businessId: string;
  onClose: (changed: boolean) => void;
}) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  /* r131 (F3, A5 P1-6): field-level validation (aria-invalid recipe
     + inline messages), not a single toast. */
  const [errors, setErrors] = React.useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});
  const [role, setRole] = React.useState<Role>("STAFF");
  const [saving, setSaving] = React.useState(false);

  async function save() {
    const e: { name?: string; email?: string; password?: string } = {};
    if (!name.trim()) e.name = "أدخل الاسم";
    if (!email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()))
      e.email = "أدخل بريداً إلكترونياً صحيحاً";
    if (password.length < 8) e.password = "كلمة المرور 8 أحرف على الأقل";
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setSaving(true);
    try {
      await api.post("/api/staff", {
        businessId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });
      toast.success("تمت إضافة العضو — يمكنه تسجيل الدخول الآن");
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
            <DialogTitle className="font-heading text-lg font-semibold text-foreground">
              عضو فريق جديد
            </DialogTitle>
            <DialogDescription className="mt-1 text-[13px] text-muted-foreground">
              أنشئ حساباً لموظفك — يملك صلاحيات دوره فقط
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
            <Label htmlFor="s-name">الاسم *</Label>
            <Input
              id="s-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((x) => ({ ...x, name: undefined }));
              }}
              maxLength={80}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "s-name-error" : undefined}
            />
            {errors.name && (
              <FieldError id="s-name-error">{errors.name}</FieldError>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-email">البريد الإلكتروني *</Label>
            <Input
              id="s-email"
              type="email"
              dir="ltr"
              className="text-start"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email)
                  setErrors((x) => ({ ...x, email: undefined }));
              }}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "s-email-error" : undefined}
            />
            {errors.email && (
              <FieldError id="s-email-error">{errors.email}</FieldError>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-pass">كلمة المرور المؤقتة *</Label>
            <Input
              id="s-pass"
              type="text"
              dir="ltr"
              className="text-start"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password)
                  setErrors((x) => ({ ...x, password: undefined }));
              }}
              placeholder="8 أحرف على الأقل"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "s-pass-error" : undefined}
            />
            {errors.password && (
              <FieldError id="s-pass-error">{errors.password}</FieldError>
            )}
          </div>
          <div className="space-y-2">
            <Label id="s-role-label">الدور</Label>
            <div
              className="grid grid-cols-2 gap-2"
              role="group"
              aria-labelledby="s-role-label"
            >
              {ROLES.filter((r) => r !== "OWNER").map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  aria-pressed={role === r}
                  className={pillClasses(role === r, "h-10")}
                >
                  {ROLE_AR[r]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border/60 p-4">
          <DialogClose asChild>
            <Button variant="outline">إلغاء</Button>
          </DialogClose>
          <Button onClick={save} disabled={saving} loading={saving}>
            إضافة
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
