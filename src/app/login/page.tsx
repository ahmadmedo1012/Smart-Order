"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnimatedEye, AnimatedEyeOff, AnimatedMessageCircle } from "@/components/ui/animated-icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, ApiError } from "@/lib/client";
import { toast } from "sonner";
import { Loader2, LogIn } from "lucide-react";

const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "218910089975";

function FloatingShapes() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Family calm register/login atmosphere — one soft orange glow only */}
      <div className="absolute -end-28 -top-24 size-[18rem] rounded-full bg-orange/5 blur-[120px] dark:bg-orange/5" />
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showForgot, setShowForgot] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/auth/login", { email, password });
      toast.success("تم تسجيل الدخول بنجاح");
      // window.location.replace avoids router.push + router.refresh race
      // (family lesson: prevents blank screen in App Router rehydration)
      setTimeout(() => window.location.replace("/dashboard"), 150);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "تعذر تسجيل الدخول، حاول مرة أخرى";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4 py-20 sm:px-6">
      {/* Family flame corners background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 78% 10%, color-mix(in oklab, var(--c-flame) 6%, transparent), transparent 30%), radial-gradient(circle at 14% 88%, color-mix(in oklab, var(--c-flame) 4%, transparent), transparent 26%)",
        }}
        aria-hidden="true"
      />
      <div className="grain-overlay" aria-hidden="true" />
      <FloatingShapes />

      {/* Back to home + ThemeToggle (family fixed corner cluster) */}
      <div className="fixed start-4 top-4 z-50 flex items-center gap-2">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground/60 hover:text-foreground">
            العودة للرئيسية
          </Button>
        </Link>
        <ThemeToggle />
      </div>

      {/* Decorative top gradient bar (family auth signature) */}
      <div className="fixed inset-x-0 top-0 z-10 h-1 bg-gradient-to-r from-orange via-orange/80 to-orange/60" />

      {/* Family login card — glass card w/ elevated shadow */}
      <div className="animate-scale-in relative z-10 w-full max-w-sm rounded-2xl border-border/50 bg-card/90 shadow-lg shadow-black/20 backdrop-blur-xl sm:max-w-md">
        {/* Logo area */}
        <div className="pb-2 pt-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
            <Image
              src="/brand-icon.png"
              alt="الربط الذكي"
              width={160}
              height={160}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <h1 className="font-heading text-2xl font-bold leading-snug">الربط الذكي</h1>
          <p className="mt-1 text-base text-muted-foreground/80">لوحة تحكم المتاجر</p>
        </div>

        <div className="px-6 pb-8 pt-4 sm:px-8">
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              {/* Family SmartBot input — bg-secondary/40 + flame focus ring */}
              <div className="rounded-xl border border-border/50 bg-secondary/40 shadow-xs transition-[border-color,box-shadow] duration-200 focus-within:border-ring/50 focus-within:ring-2 focus-within:ring-ring/20">
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  dir="ltr"
                  className="border-0 bg-transparent text-start focus-visible:ring-0"
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!error}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <div className="relative rounded-xl border border-border/50 bg-secondary/40 shadow-xs transition-[border-color,box-shadow] duration-200 focus-within:border-ring/50 focus-within:ring-2 focus-within:ring-ring/20">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="border-0 bg-transparent pe-11 focus-visible:ring-0"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!error}
                />
                {/* Eye toggle — 44px hit area via the button itself (family) */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-1.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-orange/60"
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? <AnimatedEyeOff className="size-4" /> : <AnimatedEye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="mt-2 h-12 w-full text-base font-semibold"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <LogIn className="size-4 animate-pulse" aria-hidden="true" />
                  جاري تسجيل الدخول...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="size-4" aria-hidden="true" />
                  تسجيل الدخول
                </span>
              )}
            </Button>

            {/* Forgot password — family WhatsApp-support dialog */}
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="-my-1 py-2 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-accent-foreground hover:underline"
              >
                نسيت كلمة المرور؟
              </button>
            </div>
          </form>

          {/* Forgot password help dialog (family) */}
          <Dialog open={showForgot} onOpenChange={setShowForgot}>
            <DialogContent className="max-w-sm rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-lg">استعادة كلمة المرور</DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  لإعادة تعيين كلمة مرورك، تواصل مع الدعم عبر واتساب وسنقوم بإعادة تعيينها خلال وقت قصير.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <a
                  href={`https://wa.me/${SUPPORT_WHATSAPP}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-2.5 text-sm font-medium text-success transition-colors hover:bg-success/15"
                >
                  <AnimatedMessageCircle className="size-4" />
                  تواصل عبر واتساب
                </a>
                <Button variant="outline" className="w-full" onClick={() => setShowForgot(false)}>
                  إغلاق
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <p className="mt-6 text-center text-xs text-muted-foreground/60">
            ليس لديك متجر؟{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              أنشئ متجرك مجاناً
            </Link>
          </p>

          <p className="mt-6 text-center text-xs text-muted-foreground/60">
            نظام إدارة المتاجر · الربط الذكي
          </p>
        </div>
      </div>
    </div>
  );
}
