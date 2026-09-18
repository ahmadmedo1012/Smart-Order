"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaymentDialog } from "@/components/payment/payment-dialog";
import { StepIndicator, type WizardStep } from "@/components/register/step-indicator";
import { PlanSelector } from "@/components/register/plan-selector";
import { api, ApiError } from "@/lib/client";
import { LIBYA_CITIES } from "@/lib/constants";
import type { Plan } from "@/lib/plan-types";
import { toast } from "sonner";
import { Loader2, Rocket, Store, Sparkles, Star, Crown, Building2, Flame } from "lucide-react";

export default function RegisterPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-background">
          <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      }
    >
      <RegisterWizard />
    </React.Suspense>
  );
}

function RegisterWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = React.useState(true);
  const [selectedPlan, setSelectedPlan] = React.useState<Plan | null>(null);
  const [step, setStep] = React.useState<WizardStep>(searchParams.get("plan") ? "plan" : "plan");
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [createdBusinessId, setCreatedBusinessId] = React.useState<string | null>(null);

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

  // Load plan catalog (deep-link ?plan= preselects)
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetch("/api/plans").then((r) => r.json());
        const list: Plan[] = data.data ?? [];
        if (cancelled) return;
        setPlans(list);
        const pre = searchParams.get("plan");
        if (pre) {
          const found = list.find((p) => p.id === pre) ?? list.find((p) => p.name.toLowerCase() === pre.toLowerCase());
          if (found) setSelectedPlan(found);
        }
      } catch {
        if (!cancelled) toast.error("فشل تحميل الخطط");
      } finally {
        if (!cancelled) setPlansLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirm) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ business: { id: string; slug: string } }>("/api/auth/register", {
        businessName: form.businessName,
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        city: form.city,
        password: form.password,
        planId: selectedPlan && selectedPlan.price === 0 ? selectedPlan.id : undefined,
      });

      // Free plan (or none) → straight to onboarding
      if (!selectedPlan || selectedPlan.price === 0) {
        toast.success("تم إنشاء متجرك! لنكمل الإعداد");
        router.push("/dashboard/onboarding");
        router.refresh();
        return;
      }

      // Paid plan → account is live on free limits; payment activates the plan
      setCreatedBusinessId(res.data.business.id);
      toast.success("تم إنشاء متجرك! أكمل الدفع لتفعيل الخطة");
      setPaymentOpen(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذر إنشاء الحساب، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  const isPaid = !!selectedPlan && selectedPlan.price > 0;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-background">
      {/* Family flame background — two soft radial corners */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 78% 10%, color-mix(in oklab, var(--c-flame) 6%, transparent), transparent 30%), radial-gradient(circle at 14% 88%, color-mix(in oklab, var(--c-flame) 4%, transparent), transparent 26%)",
        }}
        aria-hidden="true"
      />
      <div className="grain-overlay" aria-hidden="true" />

      {/* Back to home + ThemeToggle (family fixed corner cluster) */}
      <div className="fixed start-4 top-4 z-50 flex items-center gap-2">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground/60 hover:text-foreground">
            العودة للرئيسية
          </Button>
        </Link>
        <ThemeToggle />
      </div>

      {/* Decorative top gradient bar (family login/register signature) */}
      <div className="fixed inset-x-0 top-0 z-10 h-1 bg-gradient-to-r from-orange via-orange/80 to-orange/60" />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-4 pb-16 pt-24 sm:px-6">
        {/* Logo + title */}
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandLogo size={40} />
          <h1 className="mt-4 font-heading text-2xl font-bold sm:text-3xl">
            {step === "plan" ? "أنشئ متجرك" : "بيانات الحساب"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            أقل من دقيقتين — بدون بطاقة ائتمانية، مجاناً للأبد
          </p>
        </div>

        {/* Wizard steps */}
        <StepIndicator current={step} onNavigate={(s) => setStep(s)} />

        {step === "plan" ? (
          <div className="w-full">
            {plansLoading ? (
              <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-2xl border border-border/50 p-5">
                    <div className="skeleton mb-3 size-10 rounded-xl" />
                    <div className="skeleton mb-3 h-6 w-2/3 rounded-sm" />
                    <div className="skeleton mb-4 h-4 w-1/2 rounded-sm" />
                    <div className="space-y-1.5">
                      {[...Array(4)].map((_, j) => (
                        <div key={j} className="skeleton h-3 w-4/5 rounded-sm" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <PlanSelector
                plans={plans}
                selectedPlan={selectedPlan}
                onSelect={(p) => setSelectedPlan(p)}
                onContinue={() => setStep("account")}
              />
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              لديك حساب؟{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                سجّل الدخول
              </Link>
            </p>
          </div>
        ) : (
          <div className="w-full max-w-lg">
            {/* Selected plan chip (family summary) */}
            {selectedPlan && (
              <div className="mb-5 flex items-center justify-between rounded-xl border border-orange/15 bg-orange/10 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-accent-foreground/10 text-accent-foreground">
                    {selectedPlan.name === "Free" ? (
                      <Sparkles className="size-5" aria-hidden="true" />
                    ) : selectedPlan.name === "Basic" ? (
                      <Star className="size-5" aria-hidden="true" />
                    ) : selectedPlan.name === "Premium" ? (
                      <Crown className="size-5" aria-hidden="true" />
                    ) : (
                      <Building2 className="size-5" aria-hidden="true" />
                    )}
                  </span>
                  <div>
                    <div className="text-sm font-bold">خطة {selectedPlan.nameAr}</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedPlan.price === 0 ? "مجانية للأبد" : `${selectedPlan.price} د.ل / شهرياً`}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("plan")}
                  className="text-xs font-medium text-accent-foreground underline-offset-4 hover:underline"
                >
                  تغيير الخطة
                </button>
              </div>
            )}

            <div className="animate-scale-in rounded-2xl border border-border/50 bg-card/90 p-6 shadow-lg shadow-black/20 backdrop-blur-xl sm:p-8">
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="businessName">اسم العمل / المتجر *</Label>
                    <div className="rounded-xl border border-border/50 bg-secondary/40 shadow-xs transition-[border-color,box-shadow] duration-200 focus-within:border-ring/50 focus-within:ring-2 focus-within:ring-ring/20">
                      <Input
                        id="businessName"
                        placeholder="مثال: مطعم الأصيل"
                        required
                        value={form.businessName}
                        onChange={set("businessName")}
                        className="border-0 bg-transparent focus-visible:ring-0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">اسمك *</Label>
                    <div className="rounded-xl border border-border/50 bg-secondary/40 shadow-xs transition-[border-color,box-shadow] duration-200 focus-within:border-ring/50 focus-within:ring-2 focus-within:ring-ring/20">
                      <Input
                        id="name"
                        placeholder="اسمك الكامل"
                        required
                        value={form.name}
                        onChange={set("name")}
                        className="border-0 bg-transparent focus-visible:ring-0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الهاتف</Label>
                    <div className="rounded-xl border border-border/50 bg-secondary/40 shadow-xs transition-[border-color,box-shadow] duration-200 focus-within:border-ring/50 focus-within:ring-2 focus-within:ring-ring/20">
                      <Input
                        id="phone"
                        type="tel"
                        dir="ltr"
                        className="border-0 bg-transparent text-start focus-visible:ring-0"
                        inputMode="tel"
                        placeholder="0912345678"
                        value={form.phone}
                        onChange={set("phone")}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني *</Label>
                    <div className="rounded-xl border border-border/50 bg-secondary/40 shadow-xs transition-[border-color,box-shadow] duration-200 focus-within:border-ring/50 focus-within:ring-2 focus-within:ring-ring/20">
                      <Input
                        id="email"
                        type="email"
                        dir="ltr"
                        className="border-0 bg-transparent text-start focus-visible:ring-0"
                        inputMode="email"
                        placeholder="name@example.com"
                        autoComplete="email"
                        required
                        value={form.email}
                        onChange={set("email")}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">المدينة</Label>
                    <Select value={form.city} onValueChange={(v) => setForm((f) => ({ ...f, city: v }))}>
                      <SelectTrigger id="city" className="bg-secondary/40">
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
                    <div className="rounded-xl border border-border/50 bg-secondary/40 shadow-xs transition-[border-color,box-shadow] duration-200 focus-within:border-ring/50 focus-within:ring-2 focus-within:ring-ring/20">
                      <Input
                        id="password"
                        type="password"
                        placeholder="8 أحرف على الأقل"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        value={form.password}
                        onChange={set("password")}
                        className="border-0 bg-transparent focus-visible:ring-0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm">تأكيد كلمة المرور *</Label>
                    <div className="rounded-xl border border-border/50 bg-secondary/40 shadow-xs transition-[border-color,box-shadow] duration-200 focus-within:border-ring/50 focus-within:ring-2 focus-within:ring-ring/20">
                      <Input
                        id="confirm"
                        type="password"
                        placeholder="أعد كتابة كلمة المرور"
                        autoComplete="new-password"
                        required
                        value={form.confirm}
                        onChange={set("confirm")}
                        className="border-0 bg-transparent focus-visible:ring-0"
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <Button type="submit" className="h-12 w-full font-semibold" disabled={loading}>
                  {loading ? (
                    <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                  ) : isPaid ? (
                    <Flame className="size-5" aria-hidden="true" />
                  ) : (
                    <Rocket className="size-5" aria-hidden="true" />
                  )}
                  {loading ? "جارٍ إنشاء المتجر..." : isPaid ? "إنشاء المتجر والدفع" : "إنشاء المتجر"}
                </Button>

                {isPaid && (
                  <p className="text-center text-[11px] text-muted-foreground">
                    يُنشأ متجرك فوراً ويعمل بحدود الخطة المجانية حتى تفعيل الدفع — لن تفقد أي شيء
                  </p>
                )}
              </form>
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              لديك حساب؟{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                سجّل الدخول
              </Link>
            </p>
          </div>
        )}
      </main>

      {/* Paid-plan payment flow — activates after account creation */}
      {selectedPlan && createdBusinessId && (
        <PaymentDialog
          open={paymentOpen}
          onOpenChange={(open) => {
            setPaymentOpen(open);
            if (!open) {
              // closed before approval — land in onboarding on free limits
              router.push("/dashboard/onboarding");
              router.refresh();
            }
          }}
          planId={selectedPlan.id}
          planNameAr={selectedPlan.nameAr}
          price={selectedPlan.price}
          businessId={createdBusinessId}
          onSuccess={() => {
            router.push("/dashboard/onboarding");
            router.refresh();
          }}
          onApproved={() => {
            toast.success("تم تفعيل خطتك — بالتوفيق!");
          }}
        />
      )}
    </div>
  );
}
