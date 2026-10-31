"use client";

import * as React from "react";
import Link from "next/link";
import { m } from "motion/react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client";
import { useBusiness } from "@/components/dashboard/shell";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import {
  KpiGridSkeleton,
  HeaderSkeleton,
  SectionSkeleton,
} from "@/components/dashboard/skeletons";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLyd } from "@/lib/money";
import { FULFILLMENT_AR } from "@/lib/constants";
import {
  PLAN_FEATURES,
  planFeatureLockLabel,
} from "@/lib/plan-entitlements-core";
import { type ReportsData, reportCsvFileName } from "@/lib/report-csv";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  Coins,
  TrendingUp,
  Truck,
  Package,
  Download,
  ExternalLink,
  Lock,
} from "lucide-react";

type WindowDays = 30 | 90;

/* The API response: the shared W6-B4 shape + the W7-D server-truth
   preference for the CSV lock (احترافي+) — the flag derives from the
   same plan-row read that ENFORCES the reports gate; the export route
   re-decides from its own read, so the flag can never be the
   enforcement. */
interface ReportsResponse extends ReportsData {
  canExportCsv: boolean;
}

/* W7-D: the export is now a SERVER route gated at احترافي+
   (/api/dashboard/reports/export — the Smart-Menu W7-B family move: a
   client-built artifact has no seam a gate can refuse). The button
   fetches that route and hands the blob to the browser; the W6-B4
   filename contract (product + slug + window + Tripoli stamp) is the
   same one-source helper the route's Content-Disposition uses. */
const EXPORT_ROUTE = "/api/dashboard/reports/export";

export default function ReportsPage() {
  const { businessId, business } = useBusiness();
  const [data, setData] = React.useState<ReportsResponse | null>(null);
  const [error, setError] = React.useState(false);
  /* W7-D: below-بريميوم businesses get the family's 403 PLAN_ENTITLEMENT —
     an entitlement refusal is a LOCKED state with an upgrade path, never
     a dead error/retry surface. */
  const [locked, setLocked] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [days, setDays] = React.useState<WindowDays>(30);

  const load = React.useCallback(() => {
    if (!businessId) return;
    api
      .get<ReportsResponse>(
        `/api/dashboard/reports?businessId=${businessId}&days=${days}`,
      )
      .then((r) => {
        setError(false);
        setLocked(false);
        setData(r.data);
      })
      .catch((e) => {
        if (e instanceof ApiError && e.code === "PLAN_ENTITLEMENT") {
          setLocked(true);
        } else {
          setError(true);
        }
      });
  }, [businessId, days]);

  React.useEffect(load, [load]);

  /* W7-D: the one-tap export artifact is a SERVER download (Pro+ gated
     at the route); the client fetches it so a refusal surfaces as the
     family's Arabic toast instead of raw JSON navigation, then hands the
     blob the W6-B4 filename. */
  const exportCsv = React.useCallback(() => {
    if (!businessId || !business || exporting) return;
    setExporting(true);
    fetch(`${EXPORT_ROUTE}?businessId=${businessId}&days=${days}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) {
          /* The server refused (below احترافي, or session/permission) —
             surface its own Arabic copy from the envelope. */
          let msg = "تعذّر تصدير التقرير، حاول مرة أخرى";
          try {
            const j = (await res.json()) as {
              error?: { message?: string };
            } | null;
            if (j?.error?.message) msg = j.error.message;
          } catch {
            /* non-JSON refusal keeps the honest default */
          }
          toast.error(msg);
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = reportCsvFileName(business.slug, days);
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      })
      .catch(() => toast.error("تعذّر تصدير التقرير، حاول مرة أخرى"))
      .finally(() => setExporting(false));
  }, [businessId, business, days, exporting]);

  if (error) return <ErrorState retry={() => { setError(false); load(); }} />;

  /* W7-D — the locked state: below بريميوم the server's 403 lands here —
     honest, labeled, with the family's upgrade CTA to the pricing page
     (never a dead spinner or a fake retry). The title reads the tier
     constant (PLAN_FEATURES) so the copy can never drift from the gate. */
  if (locked) {
    const minPlan = PLAN_FEATURES.reports.minPlanNameAr;
    return (
      <div className="space-y-5">
        <PageHeader
          title="التقارير"
          subtitle="أداء متجرك عبر الزمن — أفضل منتجاتك، إيرادك اليومي، ومزيج التوصيل"
        />
        <EmptyState
          icon={Lock}
          title={`التقارير متوفرة في خطة «${minPlan}» فأعلى`}
          description={
            "تقارير الأداء عند الطلب — أفضل منتجاتك، الإيراد اليومي، ومزيج التوصيل على مدى 30 أو 90 يوماً — جزء من خطة «بريميوم» والخطط الأعلى."
          }
          action={
            <Button asChild size="sm">
              <Link href="/pricing">عرض الباقات والترقية</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const windowSwitch = (
    /* The pricing page's monthly/yearly capsule idiom, dashboard-grade:
       aria-pressed pills on the 44px floor with their own ring. */
    <div
      role="group"
      aria-label="نافذة التقرير"
      className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card p-1"
    >
      {([30, 90] as const).map((w) => (
        <button
          key={w}
          type="button"
          aria-pressed={days === w}
          onClick={() => setDays(w)}
          className={cn(
            "min-h-11 rounded-full px-4 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
            days === w
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          آخر {w} يوماً
        </button>
      ))}
    </div>
  );

  if (!data) {
    /* Shape-matched — header + switch + KPI grid + the two sections. */
    return (
      <div
        className="space-y-6"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="sr-only">جارٍ تحميل التقارير…</span>
        <HeaderSkeleton />
        <KpiGridSkeleton />
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionSkeleton className="h-64 lg:col-span-2" />
          <SectionSkeleton className="h-64" />
        </div>
        <SectionSkeleton className="h-56" />
      </div>
    );
  }

  const { totals } = data;
  const maxRevenue = Math.max(...data.series.map((d) => d.revenue), 1);
  const peak = data.series.reduce((m0, d) => Math.max(m0, d.revenue), 0);
  const deliveryPct =
    totals.orders > 0
      ? Math.round((totals.delivery.orders / totals.orders) * 100)
      : 0;
  const pickupPct =
    totals.orders > 0
      ? Math.round((totals.pickup.orders / totals.orders) * 100)
      : 0;
  /* sparse x-axis labels for the 30/90-bar strip (the week chart labels
     all 7; a 90-column strip would render unreadable) — every Nth bar
     plus today, mono. */
  const labelEvery = Math.max(1, Math.ceil(data.series.length / 8));

  const cards = [
    {
      label: "إيراد الفترة",
      value: formatLyd(totals.revenue),
      icon: Coins,
      tone: "text-success-ink",
      well: "bg-(--c-mint-bg)",
      rim: "shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--c-mint-ink)_30%,transparent)]",
    },
    {
      label: "طلبات الفترة",
      value: String(totals.orders),
      icon: ClipboardList,
      tone: "text-accent-foreground",
      well: "bg-(--c-copper-bg)",
      rim: "shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--c-copper-ink)_30%,transparent)]",
    },
    {
      label: "متوسط قيمة الطلب",
      value: formatLyd(totals.avgOrder),
      icon: TrendingUp,
      tone: "text-info-ink",
      well: "bg-(--c-sky-bg)",
      rim: "shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--c-sky-ink)_30%,transparent)]",
    },
    {
      label: "حصة التوصيل",
      value: `${deliveryPct}%`,
      icon: Truck,
      tone: "text-accent-foreground",
      well: "bg-(--c-grey-bg)",
      rim: "shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--c-grey-ink)_30%,transparent)]",
    },
  ];

  if (totals.orders === 0) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="التقارير"
          subtitle="أداء متجرك عبر الزمن — أفضل منتجاتك، إيرادك اليومي، ومزيج التوصيل"
          actions={windowSwitch}
        />
        <EmptyState
          icon={ClipboardList}
          title="لا توجد طلبات بعد"
          description="لا توجد طلبات ضمن هذه النافذة — تُبنى التقارير تلقائياً من أول طلب يصل متجرك (الملغي والمرفوض لا يُحتسب)"
          action={
            business ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/store/${business.slug}`} target="_blank">
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  معاينة المتجر ومشاركته
                </Link>
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="التقارير"
        subtitle="أداء متجرك عبر الزمن — أفضل منتجاتك، إيرادك اليومي، ومزيج التوصيل"
        meta={
          <span className="tabular-nums">
            نافذة: من {data.window.fromDay} إلى {data.window.toDay} · بلا
            الملغي والمرفوض
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {windowSwitch}
            {/* W7-D: the CSV artifact rides its Pro+ gate. Entitled → the
                server download; below tier → disabled + explanation + the
                upgrade link (the family's locked-button grammar — the
                button is the dead surface, the words beside it are the
                path). */}
            {data.canExportCsv ? (
              <Button
                variant="outline"
                onClick={exportCsv}
                disabled={exporting}
              >
                <Download className="size-4" aria-hidden="true" />
                {exporting ? "جارٍ التصدير…" : "تصدير CSV"}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled
                  title={planFeatureLockLabel("csvExport")}
                >
                  <Download className="size-4" aria-hidden="true" />
                  تصدير CSV
                  <Lock className="size-3.5" aria-hidden="true" />
                </Button>
                <span className="max-w-[34ch] text-[11px] leading-relaxed text-muted-foreground">
                  {planFeatureLockLabel("csvExport")} —{" "}
                  <Link
                    href="/pricing"
                    className="font-medium text-accent-foreground underline-offset-4 hover:underline"
                  >
                    عرض الباقات
                  </Link>
                </span>
              </>
            )}
          </div>
        }
      />

      {/* KPI strip — the overview page's card anatomy (44px pastel well +
          mono tabular values + restrained pop-in). */}
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
            <Card className="min-h-[132px] justify-between gap-4 border-border/80 p-6">
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

      <div className="route-divider route-divider-quiet" aria-hidden="true" />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Daily revenue bars — the overview week-chart idiom stretched to
            30/90 columns: plain markup/CSS bars (no chart dependency),
            today at full primary, the full data in the sr-only table.
            The bars themselves are one role="img" (30/90 focusable stops
            would be a keyboard marathon; the table below is the
            accessible data surface — the week chart keeps per-bar focus
            because 7 stops is fine). */}
        <Card className="border-border/80 lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <CardTitle className="text-base">
                الإيراد اليومي — آخر {data.window.days} يوماً
              </CardTitle>
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {peak > 0 ? `الذروة ${formatLyd(peak)}` : "لا إيراد بعد"}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className="flex items-end justify-between gap-0.5 h-40"
              dir="ltr"
              role="img"
              aria-label={`مخطط أعمدة الإيراد اليومي لآخر ${data.window.days} يوماً — البيانات الكاملة في الجدول التالي`}
            >
              {data.series.map((d, i) => {
                const isToday = i === data.series.length - 1;
                return (
                  <div
                    key={d.date}
                    className="flex-1 min-w-0 flex flex-col items-center gap-1"
                    title={`${d.date}: إيراد ${formatLyd(d.revenue)} — ${d.orders} طلب`}
                  >
                    <div className="flex h-32 w-full items-end">
                      <div
                        className={`w-full min-h-[3px] rounded-t-[2px] transition-colors ${
                          isToday
                            ? "bg-primary"
                            : "bg-primary/75 hover:bg-primary"
                        }`}
                        style={{
                          height: `${Math.max(3, (d.revenue / maxRevenue) * 100)}%`,
                        }}
                      />
                    </div>
                    <span
                      className="h-3 max-w-full truncate font-mono text-[10px] tabular-nums text-muted-foreground"
                    >
                      {i % labelEvery === 0 || isToday ? d.day : ""}
                    </span>
                  </div>
                );
              })}
            </div>
            <table className="sr-only">
              <caption>إيراد وطلبات كل يوم في النافذة</caption>
              <thead>
                <tr>
                  <th scope="col">اليوم</th>
                  <th scope="col">الإيراد</th>
                  <th scope="col">الطلبات</th>
                </tr>
              </thead>
              <tbody>
                {data.series.map((d) => (
                  <tr key={d.date}>
                    <th scope="row">{d.date}</th>
                    <td>{formatLyd(d.revenue)}</td>
                    <td>{d.orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Delivery vs pickup split — plain percentage bars; the counts and
            revenue stay as text (the accessible carrier), bars decorative. */}
        <Card className="border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">توصيل مقابل استلام</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {(
              [
                {
                  label: FULFILLMENT_AR.DELIVERY,
                  icon: Truck,
                  pct: deliveryPct,
                  ...totals.delivery,
                  bar: "bg-primary",
                },
                {
                  label: FULFILLMENT_AR.PICKUP,
                  icon: Package,
                  pct: pickupPct,
                  ...totals.pickup,
                  bar: "bg-info",
                },
              ] as const
            ).map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2 font-medium">
                    <row.icon
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    {row.label}
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {row.orders} طلب · {formatLyd(row.revenue)}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${row.bar}`}
                    style={{ width: `${row.pct}%` }}
                    aria-hidden="true"
                  />
                </div>
              </div>
            ))}
            <p className="text-xs leading-relaxed text-muted-foreground">
              من إجمالي {totals.orders} طلب في النافذة — بلا الملغي والمرفوض
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top products — the customers page's table grammar (11px muted
          headers on surface-2, mono cells for counts/money, hover wash)
          + the mobile card twin. */}
      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <div className="flex items-baseline justify-between gap-x-3 gap-y-1 flex-wrap">
            <CardTitle className="text-base">أفضل المنتجات</CardTitle>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              حسب الإيراد · أعلى {data.topProducts.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="hidden md:table w-full text-[13px]">
            <caption className="sr-only">
              أفضل المنتجات حسب الإيراد في النافذة
            </caption>
            <thead>
              <tr className="border-b border-border bg-muted text-muted-foreground text-[11px] font-semibold">
                <th scope="col" className="text-start font-semibold px-4 py-3 w-12">
                  #
                </th>
                <th scope="col" className="text-start font-semibold px-4 py-3">
                  المنتج
                </th>
                <th scope="col" className="text-start font-semibold px-4 py-3">
                  الوحدات
                </th>
                <th scope="col" className="text-start font-semibold px-4 py-3">
                  عدد الطلبات
                </th>
                <th scope="col" className="text-start font-semibold px-4 py-3">
                  الإيراد
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.topProducts.map((p, i) => (
                <tr
                  key={p.productName}
                  className="transition-colors hover:bg-muted/40"
                >
                  <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground">
                    {i + 1}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <span className="block truncate max-w-72">
                      {p.productName}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums">
                    {p.units}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground">
                    {p.orderCount}
                  </td>
                  <td className="px-4 py-3 font-semibold font-mono tabular-nums">
                    {formatLyd(p.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Mobile card twin */}
          <ul className="md:hidden divide-y divide-border/60">
            {data.topProducts.map((p, i) => (
              <li
                key={p.productName}
                className="flex items-center gap-3 p-4"
              >
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-xs font-bold tabular-nums text-accent-foreground"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {p.productName}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground font-mono tabular-nums">
                    {p.units} وحدة · {p.orderCount} طلب
                  </div>
                </div>
                <div className="shrink-0 text-end font-mono text-sm font-semibold tabular-nums">
                  {formatLyd(p.revenue)}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
