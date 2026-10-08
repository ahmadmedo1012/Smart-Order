"use client";

import * as React from "react";
import { api } from "@/lib/client";
import { useBusiness } from "@/components/dashboard/shell";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/dashboard/page-header";
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
import { UserCog, Plus, Trash2, Loader2, ShieldCheck, X } from "lucide-react";

interface StaffRow {
  id: string;
  role: Role;
  extraPerms: string;
  createdAt: string;
  user: { id: string; email: string; name: string; phone: string | null; createdAt: string };
}

export default function StaffPage() {
  const { businessId } = useBusiness();
  const [staff, setStaff] = React.useState<StaffRow[] | null>(null);
  const [error, setError] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

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
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24" />
      </div>
    );
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
            <li key={s.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-accent-foreground text-sm font-bold shrink-0" aria-hidden="true">
                  {s.user.name.slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{s.user.name}</div>
                  <div className="text-xs text-muted-foreground truncate" dir="ltr">{s.user.email}</div>
                </div>
                {s.role === "OWNER" ? (
                  <span className="inline-flex items-center rounded-full bg-(--c-copper-bg) px-2.5 py-1 text-[11px] font-semibold text-(--c-copper-deep) shrink-0">
                    {ROLE_AR[s.role]}
                  </span>
                ) : (
                  <select
                    value={s.role}
                    onChange={async (e) => {
                      try {
                        await api.patch(`/api/staff/${s.id}`, { businessId, role: e.target.value });
                        toast.success("تم تحديث الدور");
                        load();
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "تعذر التحديث");
                      }
                    }}
                    className="rounded-lg border border-input bg-card h-8 px-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-orange"
                    aria-label={`دور ${s.user.name}`}
                  >
                    {ROLES.filter((r) => r !== "OWNER").map((r) => (
                      <option key={r} value={r}>{ROLE_AR[r]}</option>
                    ))}
                  </select>
                )}
                {s.role !== "OWNER" && (
                  <button
                    onClick={async () => {
                      if (!confirm(`إزالة ${s.user.name} من الفريق؟`)) return;
                      try {
                        await api.delete(`/api/staff/${s.id}?businessId=${businessId}`);
                        toast.success("تمت الإزالة");
                        load();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "تعذرت الإزالة");
                      }
                    }}
                    className="rounded-lg p-2 hover:bg-destructive/10 transition-colors shrink-0"
                    aria-label={`إزالة ${s.user.name}`}
                  >
                    <Trash2 className="size-4 text-destructive-ink" aria-hidden="true" />
                  </button>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                {(ROLE_PERMISSIONS[s.role] as readonly string[]).slice(0, 4).join(" · ")}
                {ROLE_PERMISSIONS[s.role].length > 4 && " …"}
                <span className="ms-auto tabular">انضم {formatArabicDate(s.createdAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-border/70 bg-muted/40 p-4 text-xs text-muted-foreground leading-relaxed">
        <strong className="text-foreground">الأدوار:</strong> المالك — كل الصلاحيات · المدير — كل شيء عدا الفريق والإعدادات ·
        الموظف — متابعة الطلبات وتحديث حالاتها فقط. الصلاحيات تُطبق على الخادم وليس على الواجهة فقط.
      </div>

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

function StaffDialog({ businessId, onClose }: { businessId: string; onClose: (changed: boolean) => void }) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<Role>("STAFF");
  const [saving, setSaving] = React.useState(false);

  async function save() {
    if (!name.trim() || !email.trim() || password.length < 8) {
      toast.error("أكمل الحقول — كلمة المرور 8 أحرف على الأقل");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/staff", { businessId, name: name.trim(), email: email.trim().toLowerCase(), password, role });
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
            <DialogTitle className="font-heading text-lg font-semibold text-foreground">عضو فريق جديد</DialogTitle>
            <DialogDescription className="mt-1 text-[13px] text-muted-foreground">
              أنشئ حساباً لموظفك — يملك صلاحيات دوره فقط
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
            <label htmlFor="s-name" className="text-sm font-medium">الاسم *</label>
            <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </div>
          <div className="space-y-2">
            <label htmlFor="s-email" className="text-sm font-medium">البريد الإلكتروني *</label>
            <Input id="s-email" type="email" dir="ltr" className="text-start" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label htmlFor="s-pass" className="text-sm font-medium">كلمة المرور المؤقتة *</label>
            <Input id="s-pass" type="text" dir="ltr" className="text-start" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 أحرف على الأقل" />
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium" id="s-role-label">الدور</span>
            <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="s-role-label">
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
          <Button onClick={save} disabled={saving} className="inline-flex items-center gap-2">
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            إضافة
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
