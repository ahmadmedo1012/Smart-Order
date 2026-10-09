"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaymentDialog } from "@/components/payment/payment-dialog";
import { StepIndicator, type WizardStep } from "@/components/register/step-indicator";
import { PlanSelector } from "@/components/register/plan-selector";
import { FieldError } from "@/components/dashboard/form-field";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { api, ApiError } from "@/lib/client";
import { cn } from "@/lib/utils";
import { normalizeLibyanPhone } from "@/lib/phone";
import { LIBYA_CITIES } from "@/lib/constants";
import type { Plan } from "@/lib/plan-types";
import { toArabicNumber } from "@/lib/plan-types";
import { toast } from "sonner";
import { Loader2, Rocket, Sparkles, Star, Crown, Building2, Flame } from "lucide-react";

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

/* The auth-card input well (r131-F2) + the aria-invalid destructive
   treatment from the r131 input recipe: these register inputs draw their
   border on the WRAPPER (Input rides border-0), so the error border +
   3px/22% destructive halo land on the wrapper — the same visual contract
   ui/input.tsx gives plain inputs (error halo persists until focused;
   focus then shows the accent halo, the inline FieldError stays). */
const fieldWell = (invalid: boolean) =>
  cn(
    "rounded-xl border border-border/50 bg-secondary/40 shadow-xs transition-[border-color,box-shadow] duration-(--t-fast) focus-within:border-primary focus-within:shadow-(--state-input-focus-halo)",
    invalid && "border-destructive shadow-(--state-input-error-halo)",
  );

function RegisterWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = React.useState(true);
  /* r132 (A2 F8): plan-catalog fetch failure used to be a dead end —
     toast (auto-fades) + empty grid + no way forward. plansError keeps
     the step actionable: canonical ErrorState with a retry that re-runs
     the catalog load. */
  const [plansError, setPlansError] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<Plan | null>(null);
  /* r132 (A2 F15): dead ternary removed — both branches were "plan";
     the ?plan= deep link preselects (below) without advancing the step. */
  const [step, setStep] = React.useState<WizardStep>("plan");
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
  /* r132 (A2 F4): field-level validation — the r131 recipe (already the
     reference in the dashboard forms: product-editor, delivery, staff,
     settings) reaches the account-acquisition funnel. Each input carries
     aria-invalid + aria-describedby → inline FieldError (role=alert), and
     the error clears on first keystroke in that field. */
  const [errors, setErrors] = React.useState<{
    businessName?: string;
    name?: string;
    phone?: string;
    email?: string;
    password?: string;
    confirm?: string;
  }>({});

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    /* r133 (A2 §2-2): city has no FieldError — only the six keys the
       errors record owns can be cleared (noImplicitAny narrowing). */
    if (key !== "city" && errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
  };

  /* Client-side mirror of the server Zod contract
     (api/auth/register/route.ts) — same Arabic messages, no round-trip. */
  function validateFields() {
    const e: typeof errors = {};
    if (form.businessName.trim().length < 2) e.businessName = "أدخل اسم العمل";
    if (form.name.trim().length < 2) e.name = "أدخل اسمك الكامل";
    if (form.phone.trim() && !normalizeLibyanPhone(form.phone))
      e.phone = "رقم الهاتف الليبي غير صحيح (مثال: 0912345678)";
    if (!form.email.trim()) e.email = "أدخل البريد الإلكتروني";
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim()))
      e.email = "البريد الإلكتروني غير صحيح";
    if (!form.password) e.password = "أدخل كلمة المرور";
    else if (form.password.length < 8)
      e.password = "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
    if (!form.confirm) e.confirm = "أعد كتابة كلمة المرور";
    else if (form.confirm !== form.password)
      e.confirm = "كلمتا المرور غير متطابقتين";
    return e;
  }

  // Load plan catalog (deep-link ?plan= preselects) — retryable (F8).
  // r133 (A2 §2-3): rides lib/client.ts api.get (envelope unwrap +
  // res.ok gate + Arabic network errors) — the raw fetch answered a
  // 500 {success:false} with plans=[] and error=null.
  const loadPlans = React.useCallback(
    async (signal?: { cancelled: boolean }) => {
      setPlansError(false);
      setPlansLoading(true);
      try {
        const r = await api.get<Plan[]>("/api/plans");
        const list: Plan[] = r.data ?? [];
        if (signal?.cancelled) return;
        setPlans(list);
        const pre = searchParams.get("plan");
        if (pre) {
          const found =
            list.find((p) => p.id === pre) ??
            list.find((p) => p.name.toLowerCase() === pre.toLowerCase());
          if (found) setSelectedPlan(found);
        }
      } catch {
        if (!signal?.cancelled) {
          setPlansError(true);
          toast.error("تعذّر تحميل الباقات");
        }
      } finally {
        if (!signal?.cancelled) setPlansLoading(false);
      }
    },
    [searchParams],
  );

  React.useEffect(() => {
    const signal = { cancelled: false };
    loadPlans(signal);
    return () => {
      signal.cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fieldErrs = validateFields();
    setErrors(fieldErrs);
    const firstInvalid = (
      ["businessName", "name", "phone", "email", "password", "confirm"] as const
    ).find((k) => fieldErrs[k]);
    if (firstInvalid) {
      /* focus the first invalid field — the banner-free funnel needs a
         visible anchor next to the inline error (keyboard/SR path). */
      document.getElementById(firstInvalid)?.focus();
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
      toast.success("تم إنشاء متجرك! أكمل الدفع لتفعيل الباقة");
      setPaymentOpen(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذّر إنشاء الحساب، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  const isPaid = !!selectedPlan && selectedPlan.price > 0;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-background">
      {/* r128-F8 (B19): flame radial corners retired (§7 no-glow) — the calm
          grain veil keeps the auth atmosphere. */}
      <div className="grain-overlay" aria-hidden="true" />

      {/* Back to home + ThemeToggle (family fixed corner cluster) */}
      <div className="fixed start-4 top-4 z-(--z-dropdown) flex items-center gap-2">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground/80 hover:text-foreground">
            العودة للرئيسية
          </Button>
        </Link>
        <ThemeToggle />
      </div>

      {/* Top accent bar (r128-F8/B19: de-gradient — flat token fill) */}
      <div className="fixed inset-x-0 top-0 z-10 h-1 bg-orange" />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-4 pb-16 pt-24 sm:px-6">
        {/* Logo + title */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-10 w-10 items-center justify-center">
            <Image src="/brand-icon.png" alt="الربط الذكي" width={160} height={160} className="h-full w-full object-contain" priority />
          </div>
          <h1 className="mt-4 font-heading text-[clamp(1.75rem,3.6vw,2.5rem)] leading-[1.2] font-bold">
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
            ) : plansError ? (
              /* r133 (A1 S2): the copy promised "متابعة بدون باقة" but the
                 only action was retry — StepIndicator blocks forward nav,
                 so the planless path needs its own affordance (the app
                 supports planless signup: onSubmit treats !selectedPlan
                 as the free path). */
              <div className="space-y-2">
                <ErrorState
                  title="تعذّر تحميل الباقات"
                  description="تحقّق من اتصالك وأعد المحاولة — يمكنك المتابعة أيضاً بدون باقة (مجانية للأبد)."
                  retry={() => loadPlans()}
                />
                <div className="flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedPlan(null);
                      setStep("account");
                    }}
                  >
                    المتابعة بدون باقة
                  </Button>
                </div>
              </div>
            ) : plans.length === 0 ? (
              /* r133 (A1 S1): /api/plans converts its own DB failure into
                 a 200 {success:true, data:[]} — the empty four-column
                 grid with a dead CTA was the REACHABLE failure mode; the
                 empty branch now offers retry + the planless path. */
              <EmptyState
                icon={Sparkles}
                title="لا توجد باقات متاحة الآن"
                description="تعذّر جلب قائمة الباقات — أعد المحاولة، أو تابع التسجيل بدون باقة وابدأ مجاناً."
                action={
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => loadPlans()}>
                      إعادة المحاولة
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedPlan(null);
                        setStep("account");
                      }}
                    >
                      متابعة بدون باقة
                    </Button>
                  </div>
                }
              />
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
              <Link href="/login" className="font-medium text-accent-foreground hover:underline">
                سجّل الدخول
              </Link>
            </p>
          </div>
        ) : (
          <div className="w-full max-w-lg">
            {/* Selected plan chip (family summary) */}
            {selectedPlan && (
              <div className="mb-5 flex items-center justify-between rounded-xl border border-border bg-(--c-copper-bg) p-4">
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
                    <div className="text-sm font-bold">باقة {selectedPlan.nameAr}</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedPlan.price === 0 ? "مجانية للأبد" : `${toArabicNumber(selectedPlan.price)} د.ل / شهرياً`}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("plan")}
                  className="text-xs font-medium text-accent-foreground underline-offset-4 hover:underline"
                >
                  تغيير الباقة
                </button>
              </div>
            )}

            {/* r131-F2 (P1-6/P1-7): the canonical auth-card signatures — 2px
                copper top hairline (inset-inline 30%) + clamp(32px,4vw,48px)
                padding; radius already the unified 16px rung, and the input
                wells below carry the ONE 3px/22% focus halo. */}
            <div className="animate-scale-in relative rounded-xl border border-border/50 bg-card p-[clamp(2rem,4vw,3rem)] shadow-sm">
              {/* canonical .auth-card::before — the short copper hairline */}
              <span
                aria-hidden="true"
                className="absolute inset-x-[30%] top-0 h-0.5 rounded-b-[2px] bg-[linear-gradient(90deg,transparent,var(--primary),transparent)]"
              />
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="businessName">اسم العمل / المتجر *</Label>
                    <div className={fieldWell(!!errors.businessName)}>
                      <Input
                        id="businessName"
                        placeholder="مثال: مطعم الأصيل"
                        required
                        maxLength={100}
                        value={form.businessName}
                        onChange={set("businessName")}
                        aria-invalid={!!errors.businessName}
                        aria-describedby={
                          errors.businessName ? "r-businessName-error" : undefined
                        }
                        className="border-0 bg-transparent focus-visible:ring-0"
                      />
                    </div>
                    {errors.businessName && (
                      <FieldError id="r-businessName-error">
                        {errors.businessName}
                      </FieldError>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">اسمك *</Label>
                    <div className={fieldWell(!!errors.name)}>
                      <Input
                        id="name"
                        placeholder="اسمك الكامل"
                        required
                        maxLength={80}
                        value={form.name}
                        onChange={set("name")}
                        aria-invalid={!!errors.name}
                        aria-describedby={
                          errors.name ? "r-name-error" : undefined
                        }
                        className="border-0 bg-transparent focus-visible:ring-0"
                      />
                    </div>
                    {errors.name && (
                      <FieldError id="r-name-error">{errors.name}</FieldError>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الهاتف</Label>
                    <div className={fieldWell(!!errors.phone)}>
                      <Input
                        id="phone"
                        type="tel"
                        dir="ltr"
                        className="border-0 bg-transparent text-start focus-visible:ring-0"
                        inputMode="tel"
                        placeholder="0912345678"
                        maxLength={20}
                        value={form.phone}
                        onChange={set("phone")}
                        aria-invalid={!!errors.phone}
                        aria-describedby={
                          errors.phone ? "r-phone-error" : undefined
                        }
                      />
                    </div>
                    {errors.phone && (
                      <FieldError id="r-phone-error">{errors.phone}</FieldError>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني *</Label>
                    <div className={fieldWell(!!errors.email)}>
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
                        aria-invalid={!!errors.email}
                        aria-describedby={
                          errors.email ? "r-email-error" : undefined
                        }
                      />
                    </div>
                    {errors.email && (
                      <FieldError id="r-email-error">{errors.email}</FieldError>
                    )}
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
                    <div className={fieldWell(!!errors.password)}>
                      <Input
                        id="password"
                        type="password"
                        placeholder="8 أحرف على الأقل"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        maxLength={100}
                        value={form.password}
                        onChange={set("password")}
                        aria-invalid={!!errors.password}
                        aria-describedby={
                          errors.password ? "r-password-error" : undefined
                        }
                        className="border-0 bg-transparent focus-visible:ring-0"
                      />
                    </div>
                    {errors.password && (
                      <FieldError id="r-password-error">
                        {errors.password}
                      </FieldError>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm">تأكيد كلمة المرور *</Label>
                    <div className={fieldWell(!!errors.confirm)}>
                      <Input
                        id="confirm"
                        type="password"
                        placeholder="أعد كتابة كلمة المرور"
                        autoComplete="new-password"
                        required
                        maxLength={100}
                        value={form.confirm}
                        onChange={set("confirm")}
                        aria-invalid={!!errors.confirm}
                        aria-describedby={
                          errors.confirm ? "r-confirm-error" : undefined
                        }
                        className="border-0 bg-transparent focus-visible:ring-0"
                      />
                    </div>
                    {errors.confirm && (
                      <FieldError id="r-confirm-error">{errors.confirm}</FieldError>
                    )}
                  </div>
                </div>

                {error && (
                  <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive-ink">
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
                  {loading ? "جارٍ إنشاء المتجر…" : isPaid ? "إنشاء المتجر والدفع" : "إنشاء المتجر"}
                </Button>

                {isPaid && (
                  <p className="text-center text-[11px] text-muted-foreground">
                    يُنشأ متجرك فوراً ويعمل بحدود الباقة المجانية حتى تفعيل الدفع — لن تفقد أي شيء
                  </p>
                )}
              </form>
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              لديك حساب؟{" "}
              <Link href="/login" className="font-medium text-accent-foreground hover:underline">
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
