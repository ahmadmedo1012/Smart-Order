"use client";

import * as React from "react";
import Image from "next/image";
import { api } from "@/lib/client";
import { useBusiness } from "@/components/dashboard/shell";
import { ErrorState } from "@/components/shared/states";
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
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/dashboard/page-header";
import { FieldError } from "@/components/dashboard/form-field";
import { SettingsSkeleton } from "@/components/dashboard/skeletons";
import { compressImage } from "@/lib/compress";
import { LIBYA_CITIES } from "@/lib/constants";
import { toast } from "sonner";
import {
  Save,
  Globe,
  ImagePlus,
  X,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

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
  const { businessId } = useBusiness();
  const [settings, setSettings] = React.useState<BusinessSettings | null>(null);
  const [error, setError] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  /* r131 (F3, A5 P1-6): field-level validation — the required business
     name gets the aria-invalid recipe + inline message. */
  const [nameError, setNameError] = React.useState<string | null>(null);
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
      .get<{ business: BusinessSettings }>(
        `/api/business?businessId=${businessId}`,
      )
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
    if (!form.name.trim()) {
      setNameError("أدخل اسم العمل");
      return;
    }
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
      const { dataUrl } = await compressImage(file, {
        maxDimension: 400,
        quality: 0.85,
      });
      const r = await api.post<{ url: string }>("/api/media", {
        businessId,
        data: dataUrl,
      });
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
    /* r131 (F3, A5 P2-7): shape-matched settings skeleton. */
    return <SettingsSkeleton />;
  }

  const storeUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/store/${settings.slug}`
      : `/store/${settings.slug}`;

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title="إعدادات المتجر"
        subtitle="بيانات عملك كما تظهر للعملاء"
      />

      {/* Store link + publish */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Globe
                className="size-4 text-accent-foreground"
                aria-hidden="true"
              />
              رابط متجرك
            </div>
            <div className="mt-2 flex items-center gap-2">
              <code
                className="rounded-lg bg-muted px-3 py-1.5 text-xs truncate max-w-64 sm:max-w-96"
                dir="ltr"
              >
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
                {copied ? (
                  <Check
                    className="size-3.5 text-success-ink"
                    aria-hidden="true"
                  />
                ) : (
                  <Copy className="size-3.5" aria-hidden="true" />
                )}
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
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                settings.isPublished
                  ? "bg-(--c-mint-bg) text-(--c-mint-deep)"
                  : "bg-(--c-grey-bg) text-(--c-grey-deep)"
              }`}
            >
              {settings.isPublished
                ? "المتجر منشور ومتاح للعملاء"
                : "المتجر مسودة — غير منشور"}
            </span>
            <Button
              variant={settings.isPublished ? "outline" : "default"}
              size="sm"
              onClick={() => save(!settings.isPublished)}
              disabled={saving}
            >
              {settings.isPublished ? "إلغاء النشر" : "نشر المتجر"}
            </Button>
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
                <Image
                  src={form.logoUrl}
                  alt="شعار المتجر"
                  fill
                  sizes="80px"
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, logoUrl: "" }))}
                  className="absolute top-1 end-1 rounded-full bg-background/90 shadow p-1"
                  aria-label="إزالة الشعار"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </>
            ) : (
              <label className="size-full flex items-center justify-center text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                {uploadingLogo ? (
                  <span
                    className="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-accent-foreground"
                    aria-hidden="true"
                  />
                ) : (
                  <ImagePlus className="size-6" aria-hidden="true" />
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={onLogo}
                  disabled={uploadingLogo}
                />
              </label>
            )}
          </div>
          <div>
            <div className="text-sm font-medium">شعار المتجر</div>
            <p className="text-xs text-muted-foreground mt-1">
              يظهر أعلى المتجر وفي رسائل واتساب
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="b-name">اسم العمل *</Label>
            <Input
              id="b-name"
              value={form.name}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }));
                if (nameError) setNameError(null);
              }}
              maxLength={100}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "b-name-error" : undefined}
            />
            {nameError && (
              <FieldError id="b-name-error">{nameError}</FieldError>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="b-desc">وصف المتجر</Label>
            <Textarea
              id="b-desc"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={2}
              maxLength={300}
              placeholder="يظهر في أعلى متجرك وفي نتائج البحث"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-city">المدينة</Label>
            {/* r131 (F3, A5 P1-1 / A11 SO-4): the city select was the
                worst of the 5 raw natives — h-12, md:text-sm (14px,
                re-triggers the iOS zoom) + the retired ring-2 recipe.
                Now the canonical ui/select primitive: 44px trigger,
                16px floor at every breakpoint, accent border + halo. */}
            <Select
              value={form.city}
              onValueChange={(city) => setForm((f) => ({ ...f, city }))}
            >
              <SelectTrigger id="b-city" className="w-full bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIBYA_CITIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-phone">هاتف العمل</Label>
            <Input
              id="b-phone"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
              inputMode="tel"
              dir="ltr"
              placeholder="0912345678"
              className="text-start tabular-nums"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-wa">رقم واتساب لاستقبال الطلبات</Label>
            <Input
              id="b-wa"
              value={form.whatsappNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, whatsappNumber: e.target.value }))
              }
              inputMode="tel"
              dir="ltr"
              placeholder="0912345678"
              className="text-start tabular-nums"
            />
            <p className="text-[11px] text-muted-foreground">
              يظهر كزر «إرسال الطلب عبر واتساب» بعد كل طلب
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-address">عنوان الفرع</Label>
            <Input
              id="b-address"
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
              maxLength={200}
              placeholder="الشارع، المعلم القريب..."
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="b-footer">تذييل صفحة الطلب</Label>
            <Input
              id="b-footer"
              value={form.receiptFooter}
              onChange={(e) =>
                setForm((f) => ({ ...f, receiptFooter: e.target.value }))
              }
              maxLength={200}
              placeholder="مثال: شكراً لثقتكم — نتشرف بخدمتكم"
            />
          </div>
        </div>

        <Button onClick={() => save()} disabled={saving} loading={saving}>
          <Save className="size-4" aria-hidden="true" />
          حفظ الإعدادات
        </Button>
      </div>
    </div>
  );
}
