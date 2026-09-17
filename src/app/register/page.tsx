"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, ApiError } from "@/lib/client";
import { LIBYA_CITIES } from "@/lib/constants";
import { toast } from "sonner";
import { Loader2, Store, Rocket } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = React.useState({
    businessName: "",
    name: "",
    email: "",
    phone: "",
    city: "طرابلس",
    password: "",
    confirm: "",
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirm) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/register", {
        businessName: form.businessName,
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        city: form.city,
        password: form.password,
      });
      toast.success("تم إنشاء متجرك! لنكمل الإعداد");
      router.push("/dashboard/onboarding");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذر إنشاء الحساب، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <header className="safe-top">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" aria-label="العودة للرئيسية">
            <BrandLogo />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="rounded-2xl border border-border bg-card shadow-xl shadow-black/5 p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Store className="size-5.5" aria-hidden="true" />
              </span>
              <div>
                <h1 className="font-heading text-2xl font-bold">أنشئ متجرك</h1>
                <p className="text-sm text-muted-foreground mt-0.5">أقل من دقيقتين — بدون بطاقة ائتمانية</p>
              </div>
            </div>

            <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="businessName">اسم العمل / المتجر *</Label>
                  <Input
                    id="businessName"
                    placeholder="مثال: مطعم الأصيل"
                    required
                    value={form.businessName}
                    onChange={set("businessName")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">اسمك *</Label>
                  <Input id="name" placeholder="اسمك الكامل" required value={form.name} onChange={set("name")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <Input
                    id="phone"
                    type="tel"
                    dir="ltr"
                    className="text-start"
                    inputMode="tel"
                    placeholder="0912345678"
                    value={form.phone}
                    onChange={set("phone")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني *</Label>
                  <Input
                    id="email"
                    type="email"
                    dir="ltr"
                    className="text-start"
                    inputMode="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={set("email")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">المدينة</Label>
                  <Select value={form.city} onValueChange={(v) => setForm((f) => ({ ...f, city: v }))}>
                    <SelectTrigger id="city">
                      <SelectValue placeholder="اختر المدينة" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {LIBYA_CITIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="8 أحرف على الأقل"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={form.password}
                    onChange={set("password")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">تأكيد كلمة المرور *</Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="أعد كتابة كلمة المرور"
                    autoComplete="new-password"
                    required
                    value={form.confirm}
                    onChange={set("confirm")}
                  />
                </div>
              </div>

              {error && (
                <p role="alert" className="rounded-lg bg-destructive/10 border border-destructive/25 px-4 py-3 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                {loading ? (
                  <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                ) : (
                  <Rocket className="size-5" aria-hidden="true" />
                )}
                {loading ? "جارٍ إنشاء المتجر..." : "إنشاء المتجر"}
              </Button>
            </form>

            <p className="mt-6 text-sm text-muted-foreground text-center">
              لديك حساب؟{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                سجّل الدخول
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
