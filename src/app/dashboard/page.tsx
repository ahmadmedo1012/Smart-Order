"use client";

import * as React from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { useBusiness } from "@/components/dashboard/shell";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badges";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLyd } from "@/lib/money";
import { timeAgoAr, formatArabicTime } from "@/lib/arabic";
import type { OrderStatus, PaymentStatus } from "@/lib/constants";
import { FULFILLMENT_AR } from "@/lib/constants";
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Coins,
  UserPlus,
  TrendingUp,
  ArrowLeft,
  PackageX,
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
interface Data {
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
  React.useEffect(() => {
    const t = setInterval(load, 20_000); // light polling for freshness
    return () => clearInterval(t);
  }, [load]);

  if (error) return <ErrorState retry={load} />;

  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const { stats } = data;
  const maxRevenue = Math.max(...data.weekSeries.map((d) => d.revenue), 1);

  const cards = [
    { label: "طلبات اليوم", value: String(stats.todayOrders), icon: ClipboardList, tone: "text-primary" },
    { label: "بانتظار الإجراء", value: String(stats.pendingCount), icon: Bell, tone: stats.pendingCount > 0 ? "text-warning-foreground" : "text-muted-foreground" },
    { label: "إيراد اليوم", value: formatLyd(stats.todayRevenue), icon: Coins, tone: "text-success" },
    { label: "متوسط الطلب", value: formatLyd(stats.avgOrder), icon: TrendingUp, tone: "text-chart-3" },
  ];

  const alerts: Array<{ text: string; href: string; tone: string }> = [];
  if (stats.pendingCount > 0)
    alerts.push({
      text: `لديك ${stats.pendingCount} ${stats.pendingCount === 1 ? "طلب جديد" : "طلبات"} بانتظار المعالجة`,
      href: "/dashboard/orders?status=NEW",
      tone: "bg-warning/10 border-warning/30 text-warning-foreground",
    });
  if (data.lowStock.length > 0)
    alerts.push({
      text: `${data.lowStock.length} ${data.lowStock.length === 1 ? "منتج يقترب" : "منتجات تقترب"} من النفاد — ${data.lowStock[0].name}`,
      href: "/dashboard/products",
      tone: "bg-destructive/10 border-destructive/25 text-destructive",
    });
  if (stats.zoneCount === 0)
    alerts.push({
      text: "لم تحدد مناطق توصيل بعد — أضفها ليتمكن العملاء من طلب التوصيل",
      href: "/dashboard/delivery",
      tone: "bg-primary/5 border-primary/25 text-primary",
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">نظرة عامة</h1>
          <p className="text-sm text-muted-foreground mt-1">ملخص يومك وما يحتاج انتباهك الآن</p>
        </div>
        <Button asChild size="default" className="h-10">
          <Link href="/dashboard/orders">
            كل الطلبات
            <ArrowLeft className="size-4 ms-1" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      {/* Actionable alerts */}
      {alerts.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((a) => (
            <Link
              key={a.text}
              href={a.href}
              className={`rounded-xl border px-4 py-3.5 text-sm font-medium flex items-center gap-3 transition-transform hover:-translate-y-0.5 ${a.tone}`}
            >
              <Bell className="size-4.5 shrink-0" aria-hidden="true" />
              {a.text}
            </Link>
          ))}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="border-border/80">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">{label}</span>
                <span className={`flex size-8 items-center justify-center rounded-lg bg-muted ${tone}`}>
                  <Icon className="size-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-2.5 font-heading text-xl sm:text-2xl font-bold tabular nums">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Week chart */}
        <Card className="border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">إيراد آخر 7 أيام</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-36" dir="ltr">
              {data.weekSeries.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <span className="text-[9px] text-muted-foreground tabular opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.orders} طلب
                  </span>
                  <div
                    className="w-full rounded-t-md bg-primary/85 group-hover:bg-primary transition-colors min-h-[3px]"
                    style={{ height: `${Math.max(4, (d.revenue / maxRevenue) * 100)}%` }}
                    title={`${formatLyd(d.revenue)}`}
                  />
                  <span className="text-[10px] text-muted-foreground tabular">{d.day}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">عملاء جدد اليوم</span>
              <span className="font-bold tabular flex items-center gap-1.5">
                <UserPlus className="size-4 text-chart-3" aria-hidden="true" />
                {stats.newCustomersToday}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Recent orders */}
        <Card className="border-border/80 lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">أحدث الطلبات</CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-primary h-8">
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
                          <span className="font-semibold text-sm tabular">{o.orderNumber}</span>
                          <OrderStatusBadge status={o.status} />
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                          <span className="truncate">{o.customerName}</span>
                          <span aria-hidden="true">·</span>
                          <span>{FULFILLMENT_AR[o.fulfillmentType]}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular">{timeAgoAr(o.createdAt)}</span>
                        </div>
                      </div>
                      <div className="text-end shrink-0">
                        <div className="font-bold text-sm tabular nums">{formatLyd(o.total)}</div>
                        <div className="mt-1"><PaymentStatusBadge status={o.paymentStatus} /></div>
                      </div>
                      <ArrowLeft className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
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
              <Package className={`size-5 shrink-0 ${stats.productCount > 0 ? "text-success" : "text-muted-foreground"}`} aria-hidden="true" />
              <div>
                <div className="font-medium tabular">{stats.productCount} منتج</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stats.categoryCount} قسم</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border/60 px-4 py-3">
              <Truck className={`size-5 shrink-0 ${stats.zoneCount > 0 ? "text-success" : "text-muted-foreground"}`} aria-hidden="true" />
              <div>
                <div className="font-medium tabular">{stats.zoneCount} منطقة توصيل</div>
                <div className="text-xs text-muted-foreground mt-0.5">نشطة</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border/60 px-4 py-3">
              <XCircle className={`size-5 shrink-0 ${stats.todayCancelled === 0 ? "text-muted-foreground" : "text-destructive"}`} aria-hidden="true" />
              <div>
                <div className="font-medium tabular">{stats.todayCancelled} ملغي/مرفوض اليوم</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stats.todayCompleted} مكتمل بنجاح</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
