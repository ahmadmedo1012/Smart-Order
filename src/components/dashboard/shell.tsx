"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandMark } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  LayoutGrid,
  Users,
  Truck,
  CreditCard,
  Settings,
  UserCog,
  Menu,
  LogOut,
  ExternalLink,
  Store,
} from "lucide-react";

interface Biz {
  id: string;
  slug: string;
  name: string;
  isPublished: boolean;
}

const NAV = [
  { href: "/dashboard", label: "نظرة عامة", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/orders", label: "الطلبات", icon: ClipboardList },
  { href: "/dashboard/products", label: "المنتجات", icon: Package },
  { href: "/dashboard/categories", label: "الأقسام", icon: LayoutGrid },
  { href: "/dashboard/customers", label: "العملاء", icon: Users },
  { href: "/dashboard/delivery", label: "التوصيل", icon: Truck },
  { href: "/dashboard/payments", label: "المدفوعات", icon: CreditCard },
  { href: "/dashboard/staff", label: "الفريق", icon: UserCog },
  { href: "/dashboard/settings", label: "الإعدادات", icon: Settings },
];

export function DashboardShell({
  user,
  businesses,
  children,
}: {
  user: { name: string; email: string };
  businesses: Biz[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [biz, setBiz] = React.useState<Biz | null>(businesses[0] ?? null);

  // persist active business in localStorage for API calls
  React.useEffect(() => {
    const saved = localStorage.getItem("smart-order-biz");
    const found = businesses.find((b) => b.id === saved);
    const active = found ?? businesses[0] ?? null;
    setBiz(active);
    if (active) localStorage.setItem("smart-order-biz", active.id);
  }, [businesses]);

  const businessId = biz?.id ?? "";

  async function logout() {
    try {
      await api.post("/api/auth/logout");
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav aria-label="التنقل في اللوحة" className="flex flex-col gap-1 px-3">
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex min-h-11 items-center gap-3 overflow-hidden rounded-xl px-3 py-2 text-sm font-medium transition-[color,background-color,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-orange/60 outline-none",
              active
                ? "bg-orange/12 text-foreground shadow-xs"
                : "text-muted-foreground hover:bg-orange/8 hover:text-foreground"
            )}
          >
            <Icon className={cn("size-4.5 shrink-0", active ? "text-orange" : "")} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Desktop layout: sidebar start-side (right in RTL) */}
      <div className="flex flex-1">
        <aside className="hidden lg:flex w-60 xl:w-64 shrink-0 flex-col border-e border-border bg-card sticky top-0 h-screen">
          <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border/60">
            <BrandMark size={32} />
            <div className="leading-none">
              <div className="font-heading font-bold text-sm">سمارت أوردر</div>
              <div className="text-[10px] text-muted-foreground mt-1">لوحة التحكم</div>
            </div>
          </div>
          <div className="py-4 overflow-y-auto flex-1">
            <NavLinks />
          </div>
          <div className="p-3 border-t border-border/60">
            {biz && (
              <Link
                href={`/store/${biz.slug}`}
                target="_blank"
                className="flex items-center gap-2 rounded-lg px-3 h-9 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
              >
                <ExternalLink className="size-3.5" aria-hidden="true" />
                معاينة المتجر
                <span className="ms-auto tabular">{biz.isPublished ? "منشور" : "مسودة"}</span>
              </Link>
            )}
            <button
              onClick={logout}
              className="mt-1 w-full flex items-center gap-2 rounded-lg px-3 h-9 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
            >
              <LogOut className="size-3.5" aria-hidden="true" />
              تسجيل الخروج
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          {/* Topbar */}
          <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/90 backdrop-blur-md flex items-center gap-3 px-4 sm:px-6">
            {/* Mobile menu */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="فتح القائمة">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <SheetTitle className="sr-only">قائمة التنقل</SheetTitle>
                <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border/60">
                  <BrandMark size={32} />
                  <span className="font-heading font-bold text-sm">لوحة التحكم</span>
                </div>
                <div className="py-4">
                  <NavLinks onNavigate={() => setMenuOpen(false)} />
                </div>
                <div className="absolute bottom-0 inset-x-0 p-3 border-t border-border/60">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 rounded-lg px-3 h-9 text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <LogOut className="size-3.5" aria-hidden="true" />
                    تسجيل الخروج
                  </button>
                </div>
              </SheetContent>
            </Sheet>

            {businesses.length > 1 && (
              <select
                aria-label="اختيار العمل"
                value={businessId}
                onChange={(e) => {
                  localStorage.setItem("smart-order-biz", e.target.value);
                  setBiz(businesses.find((b) => b.id === e.target.value) ?? null);
                  router.refresh();
                }}
                className="h-10 rounded-lg border border-input bg-card px-3 text-sm max-w-40 sm:max-w-52 truncate focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-orange/20"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            {businesses.length === 1 && biz && (
              <div className="flex items-center gap-2 min-w-0">
                <Store className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium truncate">{biz.name}</span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    biz.isPublished ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                  )}
                >
                  {biz.isPublished ? "منشور" : "مسودة"}
                </span>
              </div>
            )}

            <div className="ms-auto flex items-center gap-2">
              <ThemeToggle />
              <div className="hidden sm:flex items-center gap-2.5 ps-2 border-s border-border">
                <div className="text-end leading-tight">
                  <div className="text-sm font-medium truncate max-w-32">{user.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate max-w-32" dir="ltr">
                    {user.email}
                  </div>
                </div>
                <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold" aria-hidden="true">
                  {user.name.slice(0, 2)}
                </span>
              </div>
            </div>
          </header>

          {/* Context provider */}
          <BusinessContext.Provider value={{ businessId, business: biz }}>
            <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8 min-w-0">{children}</main>
          </BusinessContext.Provider>

          {/* Mobile bottom nav */}
          <nav
            aria-label="التنقل السريع"
            className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur-md safe-bottom"
          >
            <div className="grid grid-cols-5 h-16">
              {[
                { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard, exact: true },
                { href: "/dashboard/orders", label: "الطلبات", icon: ClipboardList },
                { href: "/dashboard/products", label: "المنتجات", icon: Package },
                { href: "/dashboard/customers", label: "العملاء", icon: Users },
                { href: "/dashboard/settings", label: "المزيد", icon: Menu },
              ].map(({ href, label, icon: Icon, exact }) => {
                const active = exact ? pathname === href : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 min-h-11 text-[10px] font-medium transition-colors",
                      active ? "text-orange" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}

import { createContext, useContext } from "react";

export const BusinessContext = createContext<{
  businessId: string;
  business: { id: string; slug: string; name: string; isPublished: boolean } | null;
}>({ businessId: "", business: null });

export function useBusiness() {
  return useContext(BusinessContext);
}
