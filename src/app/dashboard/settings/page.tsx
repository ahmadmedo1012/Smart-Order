"use client";

import * as React from "react";
import { api } from "@/lib/client";
import { useBusiness } from "@/components/dashboard/shell";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/states";
import { compressImage } from "@/lib/compress";
import { LIBYA_CITIES } from "@/lib/constants";
import { toast } from "sonner";
import { Loader2, Save, Globe, ImagePlus, X, Copy, Check, ExternalLink } from "lucide-react";

interface BusinessSettings {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  city: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  address: string | null;
  receiptFooter: string | null;
  isPublished: boolean;
  onboardingStep: number;
}

export default function SettingsPage() {
  const { businessId, business } = useBusiness();
  const [settings, setSettings] = React.useState<BusinessSettings | null>(null);
  const [error, setError] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const [form, setForm] = React.useState({
    name: "",
    description: "",
    city: "طرابلس",
    phone: "",
    whatsappNumber: "",
    address: "",
    receiptFooter: "",
    logoUrl: "",
  });

  const load = React.useCallback(() => {
    if (!businessId) return;
    setError(false);
    api
      .get<{ business: BusinessSettings }>(`/api/business?businessId=${businessId}`)
      .then((r) => {
        setSettings(r.data.business);
        setForm({
          name: r.data.business.name,
          description: r.data.business.description ?? "",
          city: r.data.business.city ?? "طرابلس",
          phone: r.data.business.phone ?? "",
          whatsappNumber: r.data.business.whatsappNumber ?? "",
          address: r.data.business.address ?? "",
          receiptFooter: r.data.business.receiptFooter ?? "",
          logoUrl: r.data.business.logoUrl ?? "",
        });
      })
      .catch(() => setError(true));
  }, [businessId]);

  React.useEffect(load, [load]);

  async function save(publish?: boolean) {
    setSaving(true);
    try {
      await api.patch("/api/business", {
        businessId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        city: form.city,
        phone: form.phone.trim() || null,
        whatsappNumber: form.whatsappNumber.trim() || null,
        address: form.address.trim() || null,
        receiptFooter: form.receiptFooter.trim() || null,
        logoUrl: form.logoUrl || null,
        ...(publish !== undefined ? { isPublished: publish } : {}),
      });
      toast.success("تم حفظ الإعدادات");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { dataUrl } = await compressImage(file, { maxDimension: 400, quality: 0.85 });
      const r = await api.post<{ url: string }>("/api/media", { businessId, data: dataUrl });
      setForm((f) => ({ ...f, logoUrl: r.data.url }));
      toast.success("تم رفع الشعار");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر رفع الشعار");
    } finally {
      setUploadingLogo(false);
    }
  }

  if (error) return <ErrorState retry={load} />;
  if (!settings) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const storeUrl = typeof window !== "undefined" ? `${window.location.origin}/store/${settings.slug}` : `/store/${settings.slug}`;

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">إعدادات المتجر</h1>
        <p className="text-sm text-muted-foreground mt-1">بيانات عملك كما تظهر للعملاء</p>
      </div>

      {/* Store link + publish */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Globe className="size-4 text-primary" aria-hidden="true" />
              رابط متجرك
            </div>
            <div className="mt-2 flex items-center gap-2">
              <code className="rounded-lg bg-muted px-3 py-1.5 text-xs truncate max-w-64 sm:max-w-96" dir="ltr">
                {storeUrl}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(storeUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"
                aria-label="نسخ الرابط"
              >
                {copied ? <Check className="size-3.5 text-success" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
              </button>
              <a
                href={`/store/${settings.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"
                aria-label="فتح المتجر"
              >
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${settings.isPublished ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
              {settings.isPublished ? "المتجر منشور ومتاح للعملاء" : "المتجر مسودة — غير منشور"}
            </span>
            <button
              onClick={() => save(!settings.isPublished)}
              disabled={saving}
              className={`rounded-lg h-9 px-4 text-sm font-semibold transition-colors disabled:opacity-50 ${
                settings.isPublished
                  ? "border border-border text-muted-foreground hover:bg-muted"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {settings.isPublished ? "إلغاء النشر" : "نشر المتجر"}
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-5">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <div className="relative size-20 rounded-2xl border border-dashed border-border bg-muted/50 overflow-hidden shrink-0">
            {form.logoUrl ? (
              <>
                { }
                <img src={form.logoUrl} alt="شعار المتجر" className="size-full object-cover" />
                <button type="button" onClick={() => setForm((f) => ({ ...f, logoUrl: "" }))} className="absolute top-1 end-1 rounded-full bg-background/90 shadow p-1" aria-label="إزالة الشعار">
                  <X className="size-3" aria-hidden="true" />
                </button>
              </>
            ) : (
              <label className="size-full flex items-center justify-center text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                {uploadingLogo ? <Loader2 className="size-6 animate-spin" aria-hidden="true" /> : <ImagePlus className="size-6" aria-hidden="true" />}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onLogo} disabled={uploadingLogo} />
              </label>
            )}
          </div>
          <div>
            <div className="text-sm font-medium">شعار المتجر</div>
            <p className="text-xs text-muted-foreground mt-1">يظهر أعلى المتجر وفي رسائل واتساب</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="b-name" className="text-sm font-medium">اسم العمل *</label>
            <input id="b-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={100} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-orange" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="b-desc" className="text-sm font-medium">وصف المتجر</label>
            <textarea id="b-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} maxLength={300} placeholder="يظهر في أعلى متجرك وفي نتائج البحث" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-orange" />
          </div>
          <div className="space-y-2">
            <label htmlFor="b-city" className="text-sm font-medium">المدينة</label>
            <select id="b-city" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-orange">
              {LIBYA_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="b-phone" className="text-sm font-medium">هاتف العمل</label>
            <input id="b-phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} inputMode="tel" dir="ltr" placeholder="0912345678" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-start tabular focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-orange" />
          </div>
          <div className="space-y-2">
            <label htmlFor="b-wa" className="text-sm font-medium">رقم واتساب لاستقبال الطلبات</label>
            <input id="b-wa" value={form.whatsappNumber} onChange={(e) => setForm((f) => ({ ...f, whatsappNumber: e.target.value }))} inputMode="tel" dir="ltr" placeholder="0912345678" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-start tabular focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-orange" />
            <p className="text-[11px] text-muted-foreground">يظهر كزر «إرسال الطلب عبر واتساب» بعد كل طلب</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="b-address" className="text-sm font-medium">عنوان الفرع</label>
            <input id="b-address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} maxLength={200} placeholder="الشارع، المعلم القريب..." className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-orange" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="b-footer" className="text-sm font-medium">تذييل صفحة الطلب</label>
            <input id="b-footer" value={form.receiptFooter} onChange={(e) => setForm((f) => ({ ...f, receiptFooter: e.target.value }))} maxLength={200} placeholder="مثال: شكراً لثقتكم — نتشرف بخدمتكم" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-orange" />
          </div>
        </div>

        <button
          onClick={() => save()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground h-10 px-6 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
          حفظ الإعدادات
        </button>
      </div>
    </div>
  );
}
