"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { m, MotionConfig } from "motion/react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { SkipLink } from "@/components/shared/skip-link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/client";
import { EmptyState } from "@/components/shared/states";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  LayoutGrid,
  Users,
  BarChart3,
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
  {
    href: "/dashboard",
    label: "نظرة عامة",
    icon: LayoutDashboard,
    exact: true,
  },
  { href: "/dashboard/orders", label: "الطلبات", icon: ClipboardList },
  { href: "/dashboard/products", label: "المنتجات", icon: Package },
  { href: "/dashboard/categories", label: "الأقسام", icon: LayoutGrid },
  { href: "/dashboard/customers", label: "العملاء", icon: Users },
  /* W6-B4 (audit gap #1): the business reporting surface — best sellers,
     30/90-day revenue trend, delivery split, CSV export. Sits with the
     data surfaces after العملاء. */
  { href: "/dashboard/reports", label: "التقارير", icon: BarChart3 },
  { href: "/dashboard/delivery", label: "التوصيل", icon: Truck },
  { href: "/dashboard/payments", label: "المدفوعات", icon: CreditCard },
  { href: "/dashboard/staff", label: "الفريق", icon: UserCog },
  { href: "/dashboard/settings", label: "الإعدادات", icon: Settings },
];

/* P6-2-f3 (GROUP 3): the mobile bottom-nav «المزيد» menu — the four
   primary rows (already in the bottom bar) + the six surfaces the bar
   never had room for. 44px targets in the sheet, RTL, Escape closes
   (Radix dialog semantics come with the Sheet primitive). The explicit
   element type keeps `exact` optional across the sheet's spread union. */
const BOTTOM_NAV_PRIMARY: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}> = [
  {
    href: "/dashboard",
    label: "الرئيسية",
    icon: LayoutDashboard,
    exact: true,
  },
  { href: "/dashboard/orders", label: "الطلبات", icon: ClipboardList },
  { href: "/dashboard/products", label: "المنتجات", icon: Package },
  { href: "/dashboard/customers", label: "العملاء", icon: Users },
];

const MORE_NAV: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}> = [
  { href: "/dashboard/categories", label: "الأقسام", icon: LayoutGrid },
  { href: "/dashboard/reports", label: "التقارير", icon: BarChart3 },
  { href: "/dashboard/delivery", label: "التوصيل", icon: Truck },
  { href: "/dashboard/payments", label: "المدفوعات", icon: CreditCard },
  { href: "/dashboard/staff", label: "الفريق", icon: UserCog },
  { href: "/dashboard/settings", label: "الإعدادات", icon: Settings },
];

const ADMIN_NAV = [
  {
    href: "/dashboard/admin/payments",
    label: "موافقات الاشتراكات",
    icon: CreditCard,
    exact: true,
  },
];

export function DashboardShell({
  user,
  businesses,
  memberships,
  children,
}: {
  user: { name: string; email: string; isPlatformAdmin?: boolean };
  businesses: Biz[];
  /* r134 (V2 P3): optional so existing callers stay source-compatible. */
  memberships?: { businessId: string; perms: string[] }[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  /* P6-2-f3 (GROUP 3): the «المزيد» bottom-sheet menu state. */
  const [moreOpen, setMoreOpen] = React.useState(false);
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
  /* r134 (V2 P3): effective permissions for the ACTIVE business (mirrors the
     server's permissionsFor resolution; client gate only — the API enforces). */
  const activePerms = memberships?.find((mm) => mm.businessId === biz?.id)?.perms ?? [];

  async function logout() {
    try {
      await api.post("/api/auth/logout");
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  /* Canonical Madarek nav item (layout.css:121-174): --r-sm (8px) radius,
 30px compact height, 13px/500, hover = surface-2, active = the
 --sidebar-* token pair (gold wash dark / neutral-150 light) + ink text
 + 3px inline-start accent bar with pop entrance + dark-mode gold halo.
 The dead --sidebar-* tokens are wired here through the @theme color
 bridges (bg-sidebar, bg-sidebar-accent, …) — no globals.css edits.
 P6-2-f3 (GROUP 3): ps-8 hosts the LIGHT-mode route rail (node dot +
 dashed vertical hairline — see the NavLinks spans); dark keeps its
 night-dispatch paint untouched. */
  const navLinkClass = (active: boolean) =>
    cn(
      "group relative flex min-h-[30px] items-center gap-2.5 overflow-hidden rounded-sm ps-8 pe-3 py-1 text-[13px] font-medium transition-[color,background-color,box-shadow] duration-(--t-fast) ease-smooth outline-none",
      active
        ? "bg-sidebar-accent font-semibold text-sidebar-foreground dark:shadow-[0_0_18px_-4px_rgb(255_122_56/0.16),inset_0_0_0_1px_rgb(255_122_56/0.10)]"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  /* P6-2-f3 (GROUP 3): the light-mode ROUTE-LINE / NAV-NODE grammar —
     a quiet dashed vertical hairline (start rail, per-item segments
     bridging the gap-1 gutters) + a node dot centered on each item.
     Light-only (dark:hidden): the dark sidebar keeps its night-dispatch
     waves + constellation. Paint-only, aria-hidden, never interactive. */
  const NavRail = ({
    first,
    last,
    active,
  }: {
    first: boolean;
    last: boolean;
    active: boolean;
  }) => (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "absolute start-[9px] top-1/2 -translate-y-1/2 size-1.5 rounded-full border bg-card dark:hidden",
          active ? "border-primary/60 bg-primary" : "border-muted-foreground/40"
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "absolute start-[11.5px] border-s border-dashed border-border/80 dark:hidden",
          first && !last && "top-1/2 -bottom-1",
          last && !first && "-top-1 bottom-1/2",
          first && last && "hidden",
          !first && !last && "-top-1 -bottom-1"
        )}
      />
    </>
  );

  const AccentBar = () => (
    <m.span
      aria-hidden="true"
      className="absolute start-[-3px] top-[calc(50%-8px)] block h-4 w-[3px] rounded-e-[2px] bg-sidebar-primary"
      initial={{ scaleY: 0.4, opacity: 0 }}
      animate={{ scaleY: 1, opacity: 1 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
    />
  );

  const NavLinks = ({
    onNavigate,
    showAdmin,
  }: {
    onNavigate?: () => void;
    showAdmin?: boolean;
  }) => (
    <nav aria-label="التنقل في اللوحة" className="flex flex-col gap-1 px-3">
      {NAV.map(({ href, label, icon: Icon, exact }, i) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={navLinkClass(active)}
          >
            {active && <AccentBar />}
            <NavRail first={i === 0} last={i === NAV.length - 1} active={active} />
            <Icon
              className={cn(
                "size-4 shrink-0",
                active ? "text-sidebar-primary" : "text-muted-foreground",
              )}
              aria-hidden="true"
            />
            {label}
          </Link>
        );
      })}
      {showAdmin && (
        <>
          <div className="mt-4 px-3 pb-1 pt-2 text-[11px] font-semibold text-muted-foreground/70">
            إدارة المنصة
          </div>
          {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={navLinkClass(active)}
              >
                {active && <AccentBar />}
                <NavRail first last active={active} />
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    active ? "text-sidebar-primary" : "text-muted-foreground",
                  )}
                  aria-hidden="true"
                />
                {label}
              </Link>
            );
          })}
        </>
      )}
    </nav>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-muted/30 flex flex-col">
        <SkipLink />
        {/* Desktop layout: sidebar start-side (right in RTL) — night-shell
 rail (Madarek layout.css v3 wave B): dark paints the سماء gradient
 (gold aurora + indigo + sky ladder) with a constellation layer;
 light stays the flat cream --sidebar ground. */}
        <div className="flex flex-1">
          <aside
            className={cn(
              "hidden lg:flex w-60 xl:w-64 shrink-0 flex-col border-e border-sidebar-border bg-sidebar sticky top-0 h-screen",
              "dark:bg-[radial-gradient(340px_200px_at_82%_-60px,rgb(255_122_56/0.07),transparent_72%),radial-gradient(280px_220px_at_-20%_108%,rgb(62_92_118/0.10),transparent_70%),linear-gradient(180deg,var(--muted)_0%,var(--background)_34%,var(--background)_100%)]",
            )}
          >
            {/* Constellation dots — paint-only, dark-only, ≤0.22α (never
 competing with labels); physical coords, direction-agnostic. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 hidden dark:block bg-no-repeat [background-image:radial-gradient(1.8px_1.8px_at_21%_12%,rgb(241_240_234/0.22),transparent_100%),radial-gradient(1px_1px_at_68%_7%,rgb(185_194_210/0.16),transparent_100%),radial-gradient(1.5px_1.5px_at_87%_21%,rgb(241_240_234/0.15),transparent_100%),radial-gradient(1px_1px_at_42%_30%,rgb(185_194_210/0.12),transparent_100%),radial-gradient(1.8px_1.8px_at_9%_44%,rgb(255_122_56/0.18),transparent_100%),radial-gradient(1px_1px_at_76%_58%,rgb(185_194_210/0.11),transparent_100%),radial-gradient(1.5px_1.5px_at_28%_74%,rgb(241_240_234/0.14),transparent_100%),radial-gradient(1.2px_1.2px_at_58%_88%,rgb(255_122_56/0.12),transparent_100%)]"
            />
            <div className="h-16 flex items-center gap-2.5 px-5 border-b border-sidebar-border">
              <Image
                src="/brand-icon.png"
                alt="الربط الذكي"
                width={160}
                height={160}
                className="h-8 w-auto"
                priority
              />
              <div className="leading-none">
                <div className="font-heading font-bold text-sm text-sidebar-foreground">
                  سمارت أوردر
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  لوحة التحكم
                </div>
              </div>
            </div>
            <div className="py-4 overflow-y-auto flex-1">
              <NavLinks showAdmin={user.isPlatformAdmin} />
            </div>
            <div className="p-3 border-t border-sidebar-border">
              {biz && (
                <Link
                  href={`/store/${biz.slug}`}
                  target="_blank"
                  className="flex items-center gap-2 rounded-lg px-3 h-11 text-xs text-muted-foreground hover:text-accent-foreground hover:bg-primary/5 transition-colors"
                >
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  معاينة المتجر
                  <span className="ms-auto tabular-nums">
                    {biz.isPublished ? "منشور" : "مسودة"}
                  </span>
                </Link>
              )}
              <button
                onClick={logout}
                className="mt-1 w-full flex items-center gap-2 rounded-lg px-3 h-11 text-xs text-muted-foreground hover:text-destructive-ink hover:bg-destructive/5 transition-colors"
              >
                <LogOut className="size-3.5" aria-hidden="true" />
                تسجيل الخروج
              </button>
            </div>
          </aside>

          <div className="flex-1 min-w-0 flex flex-col">
            {/* Topbar */}
            <header className="sticky top-0 z-(--z-dropdown) h-16 border-b border-border bg-background/90 backdrop-blur-md flex items-center gap-3 px-4 sm:px-6">
              {/* Mobile menu */}
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    aria-label="فتح القائمة"
                  >
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 p-0">
                  <SheetTitle className="sr-only">قائمة التنقل</SheetTitle>
                  <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border/60">
                    <Image
                      src="/brand-icon.png"
                      alt="الربط الذكي"
                      width={160}
                      height={160}
                      className="h-8 w-auto"
                      priority
                    />
                    <span className="font-heading font-bold text-sm">
                      لوحة التحكم
                    </span>
                  </div>
                  <div className="py-4">
                    <NavLinks
                      onNavigate={() => setMenuOpen(false)}
                      showAdmin={user.isPlatformAdmin}
                    />
                  </div>
                  <div className="absolute bottom-0 inset-x-0 p-3 border-t border-border/60">
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2 rounded-lg px-3 h-11 text-xs text-muted-foreground hover:text-destructive-ink transition-colors"
                    >
                      <LogOut className="size-3.5" aria-hidden="true" />
                      تسجيل الخروج
                    </button>
                  </div>
                </SheetContent>
              </Sheet>

              {businesses.length > 1 && (
                /* r131 (F3, A5 P1-1): the business switcher rode a raw native
 select (h-10 + the retired legacy ring focus) — now the
 canonical ui/select primitive (44px trigger, 16px floor,
 accent border + 3px/22% halo). */
                <Select
                  value={businessId}
                  onValueChange={(v) => {
                    localStorage.setItem("smart-order-biz", v);
                    setBiz(businesses.find((b) => b.id === v) ?? null);
                    router.refresh();
                  }}
                >
                  <SelectTrigger
                    aria-label="اختيار العمل"
                    className="h-11 max-w-40 sm:max-w-52 bg-card text-sm"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {businesses.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {businesses.length === 1 && biz && (
                <div className="flex items-center gap-2 min-w-0">
                  <Store
                    className="size-4 text-muted-foreground shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium truncate">
                    {biz.name}
                  </span>
                  <span
                    className={cn(
                      /* W7-G (fix 6): the publish state speaks the squared
                         stamp grammar (rounded-sm + 1px family-ink border),
                         not a rounded-full pill. */
                      "shrink-0 rounded-sm px-2 py-0.5 text-[11px] font-medium",
                      biz.isPublished
                        ? "border border-(--c-mint-ink)/35 bg-(--c-mint-bg) text-(--c-mint-deep)"
                        : "border border-(--c-grey-ink)/35 bg-(--c-grey-bg) text-(--c-grey-deep)",
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
                    <div className="text-sm font-medium truncate max-w-32">
                      {user.name}
                    </div>
                    <div
                      className="text-[11px] text-muted-foreground truncate max-w-32"
                      dir="ltr"
                    >
                      {user.email}
                    </div>
                  </div>
                  <span
                    className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-accent-foreground text-xs font-bold"
                    aria-hidden="true"
                  >
                    {user.name.slice(0, 2)}
                  </span>
                </div>
              </div>
            </header>

            {/* Context provider — content capped at the canonical
 --content-max-w 1280px (A5 P2-1): list tables stop
 stretching to viewport width on wide monitors. */}
            <BusinessContext.Provider value={{ businessId, business: biz, perms: activePerms }}>
              {/* r133 (A11 S2): tabIndex={-1} on the skip-link target so
                 Safari/Firefox move keyboard focus into <main> on skip. */}
              <main
                id="main"
                tabIndex={-1}
                className="flex-1 mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8 min-w-0 focus:outline-none"
              >
                {businesses.length === 0 &&
                !pathname.startsWith("/dashboard/admin") ? (
                  /* r133 (A1 M2): zero-membership accounts (platform admins,
                     staff whose only membership was revoked) hit the page-level
                     `if (!businessId) return;` guards and rendered the shape
                     skeleton forever — surface a proper empty state instead. */
                  <EmptyState
                    icon={Store}
                    title="لا يوجد عمل مرتبط بحسابك"
                    description={
                      user.isPlatformAdmin
                        ? "لا يوجد متجر مرتبط بهذا الحساب — يمكنك متابعة موافقات الاشتراكات من قائمة إدارة المنصة."
                        : "تواصل مع مدير المتجر لإضافتك إلى فريق العمل، أو أنشئ متجرك الخاص بالتسجيل من جديد."
                    }
                    action={
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={logout}
                      >
                        <LogOut className="size-3.5" aria-hidden="true" />
                        تسجيل الخروج
                      </Button>
                    }
                  />
                ) : (
                  children
                )}
              </main>
            </BusinessContext.Provider>

            {/* Mobile bottom nav — P6-2-f3 (GROUP 3): «المزيد» is now a
                real menu (bottom sheet below) instead of a bare link to
                /dashboard/settings. */}
            <nav
              aria-label="التنقل السريع"
              className="lg:hidden fixed bottom-0 inset-x-0 z-(--z-dropdown) border-t border-border bg-background/95 backdrop-blur-md safe-bottom"
            >
              <div className="grid grid-cols-5 h-16">
                {BOTTOM_NAV_PRIMARY.map(({ href, label, icon: Icon, exact }) => {
                  const active = exact
                    ? pathname === href
                    : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 min-h-11 text-[11px] font-medium transition-[color,transform] duration-(--t-fast) ease-smooth active:scale-[0.93]",
                        active
                          ? "text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                      {label}
                    </Link>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setMoreOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={moreOpen}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 min-h-11 text-[11px] font-medium transition-[color,transform] duration-(--t-fast) ease-smooth active:scale-[0.93]",
                    MORE_NAV.some(({ href }) => pathname.startsWith(href))
                      ? "text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Menu className="size-5" aria-hidden="true" />
                  المزيد
                </button>
              </div>
            </nav>

            {/* «المزيد» bottom sheet — the full quick-nav menu (44px
                rows, RTL grid, Escape/scrim close via the Radix-based
                Sheet; focus returns to the trigger). */}
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetContent side="bottom" className="p-0">
                <SheetTitle className="px-5 pt-5 pb-2 text-sm font-semibold">
                  المزيد
                </SheetTitle>
                <nav
                  aria-label="قائمة الأقسام"
                  className="grid grid-cols-2 gap-1 px-3 pb-4"
                >
                  {[...BOTTOM_NAV_PRIMARY, ...MORE_NAV].map(
                    ({ href, label, icon: Icon, exact }) => {
                      const active = exact
                        ? pathname === href
                        : pathname.startsWith(href);
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMoreOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex min-h-11 items-center gap-2.5 rounded-sm px-3 py-2.5 text-[13px] font-medium transition-colors duration-(--t-fast) ease-smooth",
                            active
                              ? "bg-primary/10 font-semibold text-accent-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <Icon
                            className={cn(
                              "size-4 shrink-0",
                              active
                                ? "text-accent-foreground"
                                : "text-muted-foreground",
                            )}
                            aria-hidden="true"
                          />
                          {label}
                        </Link>
                      );
                    }
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}

import { createContext, useContext } from "react";

const BusinessContext = createContext<{
  businessId: string;
  business: {
    id: string;
    slug: string;
    name: string;
    isPublished: boolean;
  } | null;
  /* r134 (V2 P3): effective permissions of the active membership. */
  perms: string[];
}>({ businessId: "", business: null, perms: [] });

export function useBusiness() {
  return useContext(BusinessContext);
}
