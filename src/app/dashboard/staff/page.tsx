"use client";

import * as React from "react";
import { api } from "@/lib/client";
import { useBusiness } from "@/components/dashboard/shell";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE_AR, ROLES, ROLE_PERMISSIONS, type Role } from "@/lib/constants";
import { formatArabicDate } from "@/lib/arabic";
import { toast } from "sonner";
import { UserCog, Plus, Trash2, Loader2, ShieldCheck } from "lucide-react";

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">فريق العمل</h1>
          <p className="text-sm text-muted-foreground mt-1">أضف حسابات لموظفيك بصلاحيات محددة</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground h-10 px-4 text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4.5" aria-hidden="true" />
          عضو جديد
        </button>
      </div>

      {staff.length === 0 ? (
        <EmptyState icon={UserCog} title="لا أعضاء" description="أضف موظفين ليتابعوا الطلبات والمنتجات بصلاحيات محددة" />
      ) : (
        <ul className="space-y-2.5">
          {staff.map((s) => (
            <li key={s.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0" aria-hidden="true">
                  {s.user.name.slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{s.user.name}</div>
                  <div className="text-xs text-muted-foreground truncate" dir="ltr">{s.user.email}</div>
                </div>
                {s.role === "OWNER" ? (
                  <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold shrink-0">
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
                    <Trash2 className="size-4 text-destructive" aria-hidden="true" />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="عضو جديد">
      <div className="absolute inset-0 bg-black/50" onClick={() => onClose(false)} aria-hidden="true" />
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl p-5">
        <h2 className="font-heading font-semibold text-lg">عضو فريق جديد</h2>
        <p className="text-xs text-muted-foreground mt-1">أنشئ حساباً لموظفك — يملك صلاحيات دوره فقط</p>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <label htmlFor="s-name" className="text-sm font-medium">الاسم *</label>
            <input id="s-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-orange" />
          </div>
          <div className="space-y-2">
            <label htmlFor="s-email" className="text-sm font-medium">البريد الإلكتروني *</label>
            <input id="s-email" type="email" dir="ltr" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-start focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-orange" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label htmlFor="s-pass" className="text-sm font-medium">كلمة المرور المؤقتة *</label>
            <input id="s-pass" type="text" dir="ltr" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-start focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-orange" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 أحرف على الأقل" />
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium">الدور</span>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.filter((r) => r !== "OWNER").map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`rounded-lg border h-10 text-xs font-medium transition-colors ${
                    role === r ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                  }`}
                >
                  {ROLE_AR[r]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5 flex gap-2 justify-end">
          <button onClick={() => onClose(false)} className="h-9 px-4 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">إلغاء</button>
          <button onClick={save} disabled={saving} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center gap-2">
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            إضافة
          </button>
        </div>
      </div>
    </div>
  );
}
