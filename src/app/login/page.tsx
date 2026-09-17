"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/client";
import { toast } from "sonner";
import { Loader2, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/auth/login", { email, password });
      toast.success("تم تسجيل الدخول بنجاح");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "تعذر تسجيل الدخول، حاول مرة أخرى";
      setError(message);
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
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card shadow-xl shadow-black/5 p-6 sm:p-8">
            <h1 className="font-heading text-2xl font-bold">تسجيل الدخول</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              ادخل إلى لوحة تحكم متجرك على سمارت أوردر
            </p>

            <form onSubmit={onSubmit} className="mt-7 space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  dir="ltr"
                  className="text-start"
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!error}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!error}
                />
              </div>

              {error && (
                <p role="alert" className="rounded-lg bg-destructive/10 border border-destructive/25 px-4 py-3 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                {loading ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <LogIn className="size-5" aria-hidden="true" />}
                {loading ? "جارٍ الدخول..." : "دخول"}
              </Button>
            </form>

            <p className="mt-6 text-sm text-muted-foreground text-center">
              ليس لديك متجر بعد؟{" "}
              <Link href="/register" className="font-medium text-primary hover:underline">
                أنشئ متجرك مجاناً
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
