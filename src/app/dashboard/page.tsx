"use client";

import * as React from "react";
import Link from "next/link";
import { m } from "motion/react";
import { api } from "@/lib/client";
import { useBusiness } from "@/components/dashboard/shell";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/shared/status-badges";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  KpiGridSkeleton,
  HeaderSkeleton,
} from "@/components/dashboard/skeletons";
import { PlanUsageBadge } from "@/components/dashboard/plan-usage-badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLyd } from "@/lib/money";
import { timeAgoAr } from "@/lib/arabic";
import type { OrderStatus, PaymentStatus } from "@/lib/constants";
import { FULFILLMENT_AR } from "@/lib/constants";
import {
  ClipboardList,
  XCircle,
  Coins,
  UserPlus,
  TrendingUp,
  ArrowLeft,
  Bell,
  Truck,
  Package,
} from "lucide-react";

interface Stats {
  todayOrders: number;
  pendingCount: number;
  todayCompleted: number;
  todayCancelled: number;
  todayRevenue: number;
  newCustomersToday: number;
  avgOrder: number;
  productCount: number;
  categoryCount: number;
  zoneCount: number;
}
interface RecentOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  fulfillmentType: "DELIVERY" | "PICKUP";
  customerName: string;
  customerPhone: string;
  createdAt: string;
  paymentStatus: PaymentStatus;
}
interface PlanInfo {
  name: string;
  nameAr: string;
  price: number;
  maxProducts: number;
  maxOrders: number;
}
interface Data {
  plan: PlanInfo | null;
  monthOrders: number;
  stats: Stats;
  recentOrders: RecentOrder[];
  lowStock: Array<{ id: string; name: string; stockQuantity: number }>;
  weekSeries: Array<{ day: string; revenue: number; orders: number }>;
}

export default function DashboardOverview() {
  const { businessId } = useBusiness();
  const [data, setData] = React.useState<Data | null>(null);
  const [error, setError] = React.useState(false);

  const load = React.useCallback(() => {
    if (!businessId) return;
    setError(false);
    api
      .get<Data>(`/api/dashboard/stats?businessId=${businessId}`)
      .then((r) => setData(r.data))
      .catch(() => setError(true));
  }, [businessId]);

  React.useEffect(load, [load]);
  /* r131 (F3, A8 SO-7): polling is visibility-gated — hidden tabs skip
 the 20s fetch entirely (no battery/network waste on idle staff
 tabs) and refresh immediately when the page becomes visible. */
  React.useEffect(() => {
    const t = setInterval(() => {
      if (!document.hidden) load();
    }, 20_000);
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  if (error) return <ErrorState retry={load} />;

  if (!data) {
    /* r131 (F3, A5 P2-7): shape-matched — PageHeader bar + the real
 132px KPI card grid + the two content cards. */
    return (
      <div
        className="space-y-6"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="sr-only">جارٍ تحميل لوحة التحكم…</span>
        <HeaderSkeleton action />
        <KpiGridSkeleton />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-xl" aria-hidden="true" />
          <Skeleton
            className="h-64 rounded-xl lg:col-span-2"
            aria-hidden="true"
          />
        </div>
      </div>
    );
  }

  const { stats } = data;
  const maxRevenue = Math.max(...data.weekSeries.map((d) => d.revenue), 1);
  /* the axis label shows only when the week has a real non-zero peak —
     an all-zero week renders no «الذروة 0.001 د.ل» nonsense */
  const weekPeak = data.weekSeries.reduce((m, d) => Math.max(m, d.revenue), 0);

  const cards = [
    /* MetricCard anatomy (Madarek components.css:144-219 + polish v15):
 44px pastel icon well on the family -bg ground with a 1.5px inset
 family-ink/30% tinted rim; the value rides the 30px display metric
 slot with tnum+lnum and a 700ms pop-in entrance. */
    {
      label: "طلبات اليوم",
      value: String(stats.todayOrders),
      icon: ClipboardList,
      tone: "text-accent-foreground",
      well: "bg-(--c-copper-bg)",
      rim: "shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--c-copper-ink)_30%,transparent)]",
    },
    {
      label: "بانتظار الإجراء",
      value: String(stats.pendingCount),
      icon: Bell,
      tone:
        stats.pendingCount > 0 ? "text-warning-ink" : "text-muted-foreground",
      well: stats.pendingCount > 0 ? "bg-(--c-yellow-bg)" : "bg-(--c-grey-bg)",
      rim: "shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--c-yellow-ink)_30%,transparent)]",
    },
    {
      label: "إيراد اليوم",
      value: formatLyd(stats.todayRevenue),
      icon: Coins,
      tone: "text-success-ink",
      well: "bg-(--c-mint-bg)",
      rim: "shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--c-mint-ink)_30%,transparent)]",
    },
    {
      label: "متوسط الطلب",
      value: formatLyd(stats.avgOrder),
      icon: TrendingUp,
      tone: "text-info-ink",
      well: "bg-(--c-sky-bg)",
      rim: "shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--c-sky-ink)_30%,transparent)]",
    },
  ];

  /* Alert rows — canonical quiet alert (components.css:640-672):
 surface ground + 1px hairline + 8px pastel status dot inline-start,
 hover = border-strong only, no tinted ground, no lift. */
  const alerts: Array<{ text: string; href: string; dot: string }> = [];
  if (stats.pendingCount > 0)
    alerts.push({
      text: `لديك ${stats.pendingCount} ${stats.pendingCount === 1 ? "طلب جديد" : "طلبات"} بانتظار المعالجة`,
      href: "/dashboard/orders?status=NEW",
      dot: "bg-warning",
    });
  if (data.lowStock.length > 0)
    alerts.push({
      text: `${data.lowStock.length} ${data.lowStock.length === 1 ? "منتج يقترب" : "منتجات تقترب"} من النفاد — ${data.lowStock[0].name}`,
      href: "/dashboard/products",
      dot: "bg-destructive",
    });
  if (stats.zoneCount === 0)
    alerts.push({
      text: "لم تحدد مناطق توصيل بعد — أضفها ليتمكن العملاء من طلب التوصيل",
      href: "/dashboard/delivery",
      dot: "bg-info",
    });

  return (
    <div className="space-y-6">
      <PageHeader
        /* P18-W2-d (two-voice law — UC P4 dim-prefix extended to the
           dashboard headers): the stable context «عمليات» rides the dim
           ink and the live unit «اليوم» carries the full ink — dim the
           beginning, emphasize the end (the tracking «طلبك …» grammar). */
        title={
          <>
            <span className="text-muted-foreground">عمليات</span>{" "}
            <span className="text-foreground">اليوم</span>
          </>
        }
        subtitle="ملخص يومك وما يحتاج انتباهك الآن"
        actions={
          <Button asChild>
            <Link href="/dashboard/orders">
              كل الطلبات
              <ArrowLeft className="size-4 ms-1" aria-hidden="true" />
            </Link>
          </Button>
        }
      >
        <div className="mt-2.5">
          <PlanUsageBadge
            plan={data.plan}
            productCount={stats.productCount}
            monthOrders={data.monthOrders}
          />
        </div>
      </PageHeader>

      {/* Actionable alerts — surface + pastel dot (canonical .alert) */}
      {alerts.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((a) => (
            <Link
              key={a.text}
              href={a.href}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-sm font-medium text-foreground transition-[border-color,box-shadow] duration-(--t-base) hover:border-foreground/25 hover:shadow-sm"
            >
              <span
                className={`size-2 shrink-0 rounded-full ${a.dot}`}
                aria-hidden="true"
              />
              {a.text}
            </Link>
          ))}
        </div>
      )}

      {/* KPI strip — the OPERATIONS INSTRUMENT ROW (P18-W2-d / W1-d #2+#3,
          UC P1 two-voice): the values are machine FACTS, so they ride the
          IBM Plex Mono tabular voice (Latin/digits mono, «د.ل» on the
          Arabic fallback — the same mixed-script stack as order numbers
          and telemetry chips); the labels sit at the technical
          micro-label rung. Card anatomy (44px pastel well + hairline
          border + 132px min) keeps the family stamp grammar — restrained
          light-first daylight, no cinematic effects. */}
      <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone, well, rim }, i) => (
          <m.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.24,
              ease: [0.16, 1, 0.3, 1],
              delay: Math.min(i, 6) * 0.06,
            }}
          >
            <Card className="group relative min-h-[132px] justify-between gap-4 border-border/80 p-6 transition-[border-color,box-shadow,transform] duration-(--t-base) hover:-translate-y-0.5 hover:border-foreground/25 after:absolute after:inset-y-3 after:end-0 after:w-0.5 after:origin-bottom after:scale-y-0 after:rounded-s-sm after:bg-primary after:transition-transform after:duration-(--t-slow) after:ease-spring-soft hover:after:scale-y-100">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {label}
                  </span>
                  <m.div
                    className="mt-2 font-mono text-[28px] leading-[1.1] font-bold tabular-nums"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.7, ease: [0.34, 1.36, 0.64, 1] }}
                  >
                    {value}
                  </m.div>
                </div>
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${tone} ${well} ${rim}`}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </div>
            </Card>
          </m.div>
        ))}
      </div>

      {/* r152 Route & Node: the quiet dashed road separates the
          operations chapters (KPI board → the week lane + order desk). */}
      <div className="route-divider route-divider-quiet" aria-hidden="true" />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Week chart — the ops-viz centerpiece (P18-W2-d / W1-d #3):
            REAL axis labels (the week's true max, mono) + the TODAY bar
            at full delivery-orange (the accent law: orange = live/
            active state) while past days sit at 75%. All values real
            (the API series); no invented axis or trend. */}
        <Card className="border-border/80">
          <CardHeader className="pb-2">
            <div className="flex items-baseline justify-between gap-2">
              <CardTitle className="text-base">إيراد آخر 7 أيام</CardTitle>
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {weekPeak > 0 ? `الذروة ${formatLyd(weekPeak)}` : "أسبوع بلا إيراد بعد"}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {/* r140 (P2-4): المخطط كان بديلًا نصيًا بلا — القيم الوحيدة في
                title (تحويم فقط) والعدد opacity-0 (فأرة فقط): قارئ الشاشة
                ومستخدم لوحة المفاتيح كانا يريان 7 أعمدة بلا معنى
                (WCAG 1.1.1 + 1.4.13). الآن: كل عمود قابل للتركيز بتسمية
                كاملة، والقيمة تظهر عند focus-visible أيضًا، وجدول sr-only
                يحمل البيانات كاملة للقارئ. */}
            <div
              className="flex items-end justify-between gap-2 h-36"
              dir="ltr"
              role="group"
              aria-label="مخطط أعمدة إيراد آخر 7 أيام — البيانات الكاملة في الجدول التالي"
            >
              {data.weekSeries.map((d, dayIdx) => {
                const isToday = dayIdx === data.weekSeries.length - 1;
                return (
                <div
                  key={d.day}
                  className="flex-1 flex flex-col items-center gap-1.5 group rounded-t-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  tabIndex={0}
                  role="img"
                  aria-label={`${d.day}: إيراد ${formatLyd(d.revenue)} — ${d.orders} طلب`}
                >
                  <span className="text-[11px] text-muted-foreground tabular-nums opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                    {d.orders} طلب
                  </span>
                  <div
                    className={`w-full rounded-t-md transition-colors min-h-[3px] ${
                      isToday ? "bg-primary" : "bg-primary/75 group-hover:bg-primary group-focus-visible:bg-primary"
                    }`}
                    style={{
                      height: `${Math.max(4, (d.revenue / maxRevenue) * 100)}%`,
                    }}
                    title={`${formatLyd(d.revenue)}`}
                  />
                  <span
                    className={`font-mono text-[11px] tabular-nums ${
                      isToday ? "text-accent-foreground font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    {d.day}
                  </span>
                </div>
                );
              })}
            </div>
            {/* البديل النصي الكامل — يوم ← إيراد ← طلبات */}
            <table className="sr-only">
              <caption>إيراد وطلبات آخر 7 أيام</caption>
              <thead>
                <tr>
                  <th scope="col">اليوم</th>
                  <th scope="col">الإيراد</th>
                  <th scope="col">الطلبات</th>
                </tr>
              </thead>
              <tbody>
                {data.weekSeries.map((d) => (
                  <tr key={d.day}>
                    <th scope="row">{d.day}</th>
                    <td>{formatLyd(d.revenue)}</td>
                    <td>{d.orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">عملاء جدد اليوم</span>
              <span className="font-mono font-bold text-sm tabular-nums flex items-center gap-1.5">
                <UserPlus className="size-4 text-chart-3" aria-hidden="true" />
                {stats.newCustomersToday}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Recent orders — the LIVE FEED (P18-W2-d / W1-d #3, UC P6):
            every machine fact on the row rides the mono voice (order
            number, elapsed age, amount); the honest poll cadence is
            stated as a mono micro-label — real (the 20s visibility-gated
            poll above), never a decorative "live" ping. */}
        <Card className="border-border/80 lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">أحدث الطلبات</CardTitle>
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  تحديث تلقائي كل 20 ث
                </span>
              </div>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-accent-foreground h-8"
              >
                <Link href="/dashboard/orders">عرض الكل</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentOrders.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="لا طلبات بعد"
                description="شارك رابط متجرك مع عملائك عبر واتساب ليصلك أول طلب هنا"
                className="py-10"
                action={
                  <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard/onboarding">إعداد المتجر ونشره</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border/60">
                {data.recentOrders.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/dashboard/orders/${o.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm tabular-nums font-mono">
                            {o.orderNumber}
                          </span>
                          <OrderStatusBadge status={o.status} />
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                          <span className="truncate">{o.customerName}</span>
                          <span aria-hidden="true">·</span>
                          <span>{FULFILLMENT_AR[o.fulfillmentType]}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums font-mono">
                            {timeAgoAr(o.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="text-end shrink-0">
                        <div className="font-mono font-bold text-sm tabular-nums">
                          {formatLyd(o.total)}
                        </div>
                        <div className="mt-1">
                          <PaymentStatusBadge status={o.paymentStatus} />
                        </div>
                      </div>
                      <ArrowLeft
                        className="size-4 text-muted-foreground shrink-0"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick setup status */}
      <Card className="border-border/80">
        <CardContent className="p-5">
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div className="flex items-center gap-3 rounded-lg border border-border/60 px-4 py-3">
              <Package
                className={`size-5 shrink-0 ${stats.productCount > 0 ? "text-success-ink" : "text-muted-foreground"}`}
                aria-hidden="true"
              />
              <div>
                <div className="font-medium tabular-nums font-mono">
                  {stats.productCount} منتج
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {stats.categoryCount} قسم
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border/60 px-4 py-3">
              <Truck
                className={`size-5 shrink-0 ${stats.zoneCount > 0 ? "text-success-ink" : "text-muted-foreground"}`}
                aria-hidden="true"
              />
              <div>
                <div className="font-medium tabular-nums font-mono">
                  {stats.zoneCount} منطقة توصيل
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">نشطة</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border/60 px-4 py-3">
              <XCircle
                className={`size-5 shrink-0 ${stats.todayCancelled === 0 ? "text-muted-foreground" : "text-destructive-ink"}`}
                aria-hidden="true"
              />
              <div>
                <div className="font-medium tabular-nums font-mono">
                  {stats.todayCancelled} ملغي/مرفوض اليوم
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {stats.todayCompleted} مكتمل بنجاح
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
