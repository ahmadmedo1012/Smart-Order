"use client";

import * as React from "react";
import Link from "next/link";
import { formatLyd } from "@/lib/money";
import { formatArabicDateTime, timeAgoAr } from "@/lib/arabic";
import { toE164 } from "@/lib/phone";
import { waLink, buildStatusUpdateMessage } from "@/lib/whatsapp";
import {
  ORDER_STATUS_AR,
  PAYMENT_STATUS_AR,
  FULFILLMENT_AR,
  TRACKING_FLOW,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { SkipLink } from "@/components/shared/skip-link";
import { ORDER_STATUS_CHIP } from "@/components/shared/status-badges";
import {
  ClipboardList,
  Check,
  Truck,
  Store,
  Phone,
  MessageCircle,
  Clock,
  CheckCircle2,
  Flag,
  PackageCheck,
  Package,
  Banknote,
  Timer,
  WifiOff,
} from "lucide-react";

interface TrackedOrder {
  orderNumber: string;
  status: OrderStatus;
  fulfillmentType: "DELIVERY" | "PICKUP";
  total: number;
  subtotal: number;
  deliveryFee: number;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  customerName: string;
  city: string | null;
  area: string | null;
  createdAt: string;
  items: Array<{ productName: string; variantName: string | null; quantity: number; lineTotal: number; options: string[] }>;
  business: { name: string; slug: string; phone: string | null; whatsappNumber: string | null; logoUrl: string | null };
}

const FLOW_AR: Record<string, { label: string; icon: React.ElementType }> = {
  NEW: { label: "استُقبل الطلب", icon: ClipboardList },
  CONFIRMED: { label: "تم التأكيد", icon: Check },
  PREPARING: { label: "قيد التحضير", icon: Clock },
  READY: { label: "جاهز", icon: CheckCircle2 },
  OUT_FOR_DELIVERY: { label: "في الطريق إليك", icon: Truck },
  DELIVERED: { label: "تم التسليم", icon: CheckCircle2 },
};

/* P16-4c (United Carriers → Smart Order) — the DISPLAY voice of the
 * two-voice status law. The machine label (ORDER_STATUS_AR, carried by
 * the aria-live stamp) states the real state; this is the human sentence
 * over the SAME real state — never a state the machine doesn't have.
 * UC's partial-dim grey-prefix adapted to RTL reading order: the stable
 * prefix «طلبك» renders dimmed and the live status words carry the full
 * ink (dim the beginning, emphasize the end). */
function statusClaim(status: OrderStatus, fulfillment: "DELIVERY" | "PICKUP"): string {
  switch (status) {
    case "NEW":
      return "بين يدي المتجر";
    case "CONFIRMED":
      return "مؤكد";
    case "PREPARING":
      return "قيد التحضير";
    case "READY":
      return fulfillment === "PICKUP" ? "جاهز للاستلام" : "جاهز";
    case "OUT_FOR_DELIVERY":
      return "في الطريق إليك";
    case "DELIVERED":
      return fulfillment === "PICKUP" ? "بين يديك" : "وصل";
    default:
      return ORDER_STATUS_AR[status];
  }
}

/* P16-4c: telemetry-chip formatters — counted Arabic plurals in the
 * lib/arabic sincePhrase shapes (1 = واحد/واحدة, 2 = dual, 3-10 =
 * plural, 11+ = singular accusative), local to the chip contexts. */
function itemsCountAr(n: number): string {
  if (n === 1) return "صنف واحد";
  if (n === 2) return "صنفان";
  if (n >= 3 && n <= 10) return `${n} أصناف`;
  return `${n} صنفاً`;
}

function elapsedAr(ms: number): string {
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "أقل من دقيقة";
  if (min < 60) {
    if (min === 1) return "دقيقة واحدة";
    if (min === 2) return "دقيقتين";
    if (min <= 10) return `${min} دقائق`;
    return `${min} دقيقة`;
  }
  const hr = Math.floor(min / 60);
  if (hr < 24) {
    if (hr === 1) return "ساعة واحدة";
    if (hr === 2) return "ساعتين";
    if (hr <= 10) return `${hr} ساعات`;
    return `${hr} ساعة`;
  }
  const day = Math.floor(hr / 24);
  if (day === 1) return "يوم واحد";
  if (day === 2) return "يومين";
  if (day <= 10) return `${day} أيام`;
  return `${day} يوماً`;
}

/* P16-4c: the route-object geometry — deterministic (SSR-stable, zero
 * measurement, zero JS layout). Vertical (default, <lg): station pitch
 * 64px, node Ø36px centered 18px from the stage's inline-start edge;
 * the spine SVG owns the last 64px band (node center = svg x 46) and
 * the road winds between stations with alternating ±16px S-bulges.
 * Horizontal (lg+): fixed slots of 84px (stations + terminus), node row
 * at y=18 inside an svg that bleeds 24px past the inline-start edge —
 * UC's deliberate frame bleed, kept inside the card padding so it can
 * never overflow the page. Both orientations derive from the REAL
 * TRACKING_FLOW array (PICKUP filters OUT_FOR_DELIVERY) — node i is
 * station i; the marker rests at the CURRENT status node. */
const ROUTE_V = { pitch: 64, spineX: 46, bulge: 16 };
const ROUTE_H = { pitch: 84, spineY: 18, bulge: 12, bleed: 24 };

export function TrackingClient({
  order,
  placed = false,
  deliveredAt = null,
}: {
  order: TrackedOrder;
  placed?: boolean;
  /* P6-2-f3 (GROUP 2): the DELIVERED stamp's date — resolved server-side
     from the order's status history (the honest source; null when the
     order was delivered after this SSR snapshot — the stamp then renders
     without the date line, never a fabricated one). */
  deliveredAt?: string | null;
}) {
  // light polling for live updates — status AND paymentStatus (F13: the
  // receipt's "الدفع" line used to stay on its SSR snapshot forever)
  const [status, setStatus] = React.useState(order.status);
  const [paymentStatus, setPaymentStatus] = React.useState(order.paymentStatus);
  /* P6-2-f3 (GROUP 2): display-only sync health flag — set when a poll
     FAILS (offline), cleared on the next good poll. The 15s
     visibility-gated cadence itself is untouched (below); this only
     feeds the quiet «آخر تحديث معروف» hint + retry affordance. */
  const [syncFailed, setSyncFailed] = React.useState(false);

  /* P16-4c telemetry: the order-age chip is the ONLY clock-derived text
     on the page — it renders after mount (SSR paints no clock text, so
     server and client can never disagree → zero hydration drift) and
     re-reads the REAL placed-at timestamp every 30s. No data → no chip. */
  const [ageText, setAgeText] = React.useState<string | null>(null);

  const poll = React.useCallback(async () => {
    try {
      /* r140 (P3-5): الشرطة المائلة الذيلية كانت تنتج "" من split/pop
         فيستطلع /api/public/track/ (404 تبتلع بصمت) — تجريد الشرطات
         الذيلية قبل الانشقاق. */
      const token = window.location.pathname.replace(/\/+$/, "").split("/").pop();
      const res = await fetch(`/api/public/track/${token}`);
      const body = await res.json();
      if (body?.success) {
        setStatus(body.data.order.status);
        setPaymentStatus(body.data.order.paymentStatus);
        setSyncFailed(false);
      }
    } catch {
      /* offline — keep last known (P6-2-f3: and surface it via the
         quiet hint instead of failing silently forever) */
      setSyncFailed(true);
    }
  }, []);

  React.useEffect(() => {
    if (["DELIVERED", "CANCELLED", "REJECTED"].includes(status)) return;
    /* r132 (A2 F13): visibility-gated polling — the same gate the
       dashboard 20s poll got in r131 (dashboard/page.tsx): hidden tabs
       skip the 15s fetch entirely (no battery/network waste on a phone
       left open), and the first visibilitychange back to visible
       refreshes immediately. */
    const t = setInterval(() => {
      if (!document.hidden) poll();
    }, 15000);
    const onVisible = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status, poll]);

  React.useEffect(() => {
    const tick = () => setAgeText(timeAgoAr(order.createdAt));
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, [order.createdAt]);

  const isCancelled = status === "CANCELLED" || status === "REJECTED";
  const currentIdx = TRACKING_FLOW.indexOf(status as (typeof TRACKING_FLOW)[number]);

  const flow = order.fulfillmentType === "PICKUP"
    ? TRACKING_FLOW.filter((s) => s !== "OUT_FOR_DELIVERY")
    : TRACKING_FLOW;

  const waNumber = order.business.whatsappNumber ? toE164(order.business.whatsappNumber) : null;

  /* ── P16-4c route geometry (all derived from the real flow) ────────── */
  const nodeCount = flow.length + 1; // stations + the destination terminus
  const vNodeY = (i: number) => ROUTE_V.pitch / 2 + i * ROUTE_V.pitch;
  const hStageW = nodeCount * ROUTE_H.pitch;
  const hSvgW = hStageW + ROUTE_H.bleed;
  const hNodeX = (i: number) => hStageW - (i * ROUTE_H.pitch + ROUTE_H.pitch / 2);
  /* Traveled road: lead-in + segments up to the CURRENT node (DELIVERED
     reaches the terminus — the road is done, and no runner moves). */
  const traveledEnd = status === "DELIVERED" ? flow.length : Math.max(currentIdx, 0);

  const vPath = (end: number) => {
    let d = `M ${ROUTE_V.spineX} 4 C ${ROUTE_V.spineX - 6} 12 ${ROUTE_V.spineX - 6} 24 ${ROUTE_V.spineX} ${vNodeY(0)}`;
    for (let i = 0; i < end; i++) {
      const b = i % 2 === 0 ? ROUTE_V.bulge : -ROUTE_V.bulge;
      d += ` C ${ROUTE_V.spineX + b} ${vNodeY(i) + 30} ${ROUTE_V.spineX - b} ${vNodeY(i + 1) - 30} ${ROUTE_V.spineX} ${vNodeY(i + 1)}`;
    }
    return d;
  };
  const hPath = (end: number) => {
    let d = `M ${hSvgW} ${ROUTE_H.spineY} C ${hSvgW - 16} 10 ${hNodeX(0) + 24} 26 ${hNodeX(0)} ${ROUTE_H.spineY}`;
    for (let i = 0; i < end; i++) {
      const b = i % 2 === 0 ? ROUTE_H.bulge : -ROUTE_H.bulge;
      d += ` C ${hNodeX(i) - 26} ${ROUTE_H.spineY + b} ${hNodeX(i + 1) + 26} ${ROUTE_H.spineY - b} ${hNodeX(i + 1)} ${ROUTE_H.spineY}`;
    }
    return d;
  };

  /* The runner (parcel marker) rides the approach segment of the CURRENT
     status — from the previous node to the live one, never beyond it —
     and rests at the live node. A delivered order is at rest: no runner. */
  const showRunner = !isCancelled && status !== "DELIVERED" && currentIdx >= 0;
  const vRunner =
    currentIdx === 0
      ? { top: -2, dy: 28, sway: -6 }
      : { top: vNodeY(currentIdx - 1) - 6, dy: ROUTE_V.pitch, sway: currentIdx % 2 === 1 ? ROUTE_V.bulge : -ROUTE_V.bulge };
  const hRunner =
    currentIdx === 0
      ? { start: -(ROUTE_H.bleed + 6), dx: hNodeX(0) - hSvgW, sway: 5, top: 12 }
      : {
          start: ROUTE_H.pitch * (currentIdx - 1) + ROUTE_H.pitch / 2 - 6,
          dx: -ROUTE_H.pitch,
          sway: currentIdx % 2 === 1 ? ROUTE_H.bulge : -ROUTE_H.bulge,
          top: 12,
        };

  const claim = statusClaim(status, order.fulfillmentType);
  const elapsedMs =
    status === "DELIVERED" && deliveredAt
      ? new Date(deliveredAt).getTime() - new Date(order.createdAt).getTime()
      : null;

  return (
    <div className="min-h-screen bg-muted/30">
      <SkipLink />
      <header className="bg-background border-b border-border safe-top sticky top-0 z-(--z-dropdown)">
        <div className="mx-auto max-w-lg lg:max-w-2xl px-4 h-14 flex items-center gap-3">
          <Link href={`/store/${order.business.slug}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Store className="size-4" aria-hidden="true" />
            {order.business.name}
          </Link>
          <ThemeToggle className="ms-auto" />
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto max-w-lg lg:max-w-2xl px-4 py-6 space-y-4 focus:outline-none">
        {/* r133 (A1 F9): durable checkout confirmation — the success used
            to live only in checkout component state; ?placed=1 in the URL
            survives refresh/share. */}
        {placed && !isCancelled && (
          <div
            role="status"
            /* P6-2-f3 (GROUP 2): quiet stamp alignment — squared corners
               on the placed banner + its icon well (logic untouched). */
            className="flex items-center gap-3 rounded-sm border border-success/30 bg-success/10 p-4"
          >
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-success/20 text-success-ink"
              aria-hidden="true"
            >
              <CheckCircle2 className="size-5" aria-hidden="true" />
            </span>
            <div>
              <div className="text-sm font-bold text-success-ink">تم استلام طلبك!</div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                سنتبع حالة طلبك هنا — احفظ هذا الرابط للمتابعة لاحقاً.
              </p>
            </div>
          </div>
        )}

        {/* ── P16-4c: the ROUTE-OBJECT HERO (United Carriers) ──────────
            The tracking status section IS the delivery path now: a 2.5D
            dashed route SVG (vertical below lg, a horizontal chapter at
            lg+) with the marker resting on the CURRENT real status node
            and Arabic status pills pinned along the road. The receipt and
            every table come AFTER this visual beat. */}
        <section className="rounded-xl border border-border bg-card p-5">
          {/* the FACTS voice (UC mono-for-facts): order number + timestamp
              ride the mixed-script mono stack in LTR runs (tabular-nums). */}
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h1 className="text-xl font-bold tabular-nums font-mono">{order.orderNumber}</h1>
            <time dateTime={order.createdAt} dir="ltr" className="text-[11px] text-muted-foreground tabular-nums font-mono">
              {formatArabicDateTime(order.createdAt)}
            </time>
          </div>

          {isCancelled ? (
            /* P6-2-f3 (GROUP 2): quiet stamp alignment — the
               cancelled/rejected card squares to the family stamp
               (rose for rejection, grey for cancellation — the
               ORDER_STATUS_CHIP mapping); branches/logic untouched. */
            <div
              className={cn(
                "mt-4 flex items-start gap-3 rounded-sm border px-4 py-3 text-start",
                status === "REJECTED"
                  ? "border-(--c-rose-ink)/35 bg-(--c-rose-bg)"
                  : "border-(--c-grey-ink)/35 bg-(--c-grey-bg)"
              )}
            >
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  status === "REJECTED" ? "bg-(--c-rose-ink)" : "bg-(--c-grey-ink)"
                )}
                aria-hidden="true"
              />
              <div>
                <div
                  className={cn(
                    "font-bold",
                    status === "REJECTED" ? "text-(--c-rose-deep)" : "text-(--c-grey-deep)"
                  )}
                >
                  {status === "REJECTED" ? "لم يتم قبول الطلب" : "تم إلغاء الطلب"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">تواصل مع المتجر لمعرفة المزيد</p>
              </div>
            </div>
          ) : (
            <>
              {/* the CLAIM voice (UC grotesk-for-claims, RTL partial-dim):
                  the stable prefix dimmed grey, the live status words at
                  full ink — dim the beginning, emphasize the end. */}
              <h2 className="mt-3 font-heading text-2xl font-extrabold leading-tight lg:text-[28px]">
                <span className="text-muted-foreground">طلبك</span>{" "}
                <span key={status} className="animate-price-swap-in text-foreground">
                  {claim}
                </span>
              </h2>

              {/* live stamp + honest telemetry chips (UC micro-labels).
                  Every chip value is REAL: the machine status (aria-live),
                  the real placed-at age, the real item count, the live
                  payment state, the history-sourced delivery elapsed.
                  No courier/ETA data exists in this domain — no such chip. */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span
                  /* r140 (P3-10): الحالة تتغير كل 15 ثانية بالاستطلاع — بلا
                     aria-live كان الانتقال صامتًا لقارئ الشاشة (لافتة
                     placed=1 عندها role=status منذ r133؛ الشريحة نفسها لم
                     تكن معلنة). */
                  role="status"
                  aria-live="polite"
                  className={cn(
                    /* P10-1b: shadow-sm = --elev-1 — التوأم الليلي للتوهين؛
                       الحرفية السوداء 6% كانت تختفي على بطاقة الليل. */
                    "inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-semibold shadow-sm",
                    ORDER_STATUS_CHIP[status]
                  )}
                >
                  <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                  {ORDER_STATUS_AR[status]}
                </span>
                {ageText && (
                  <span className="inline-flex items-center gap-1 rounded-sm border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground font-mono tabular-nums">
                    <Clock className="size-3 shrink-0" aria-hidden="true" />
                    {ageText}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-sm border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground font-mono tabular-nums">
                  <Package className="size-3 shrink-0" aria-hidden="true" />
                  {itemsCountAr(order.items.length)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-sm border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground font-mono tabular-nums">
                  <Banknote className="size-3 shrink-0" aria-hidden="true" />
                  الدفع: {PAYMENT_STATUS_AR[paymentStatus]}
                </span>
                {elapsedMs !== null && (
                  <span className="inline-flex items-center gap-1 rounded-sm border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground font-mono tabular-nums">
                    <Timer className="size-3 shrink-0" aria-hidden="true" />
                    التسليم خلال {elapsedAr(elapsedMs)}
                  </span>
                )}
              </div>

              {/* ── the delivery path ───────────────────────────────────
                  STATE LOGIC UNTOUCHED (r152 contract): the same
                  TRACKING_FLOW array, the same PICKUP filter, the same
                  done/active/pending derivation — verified against
                  lib/order-machine transitions, no invented states. The
                  dashed spine moved from per-li border spans to ONE SVG
                  (globals .tk-route*) so the road can wind 2.5D between
                  the stations; the nodes stay DOM (a11y + the family
                  node grammar). */}
              <div className="mt-5">
                <div className="mb-2 text-[11px] font-medium text-muted-foreground">مسار الطلب</div>
                <div
                  className="relative lg:mx-auto lg:w-[calc(var(--slots)*84px)]"
                  style={{ "--slots": nodeCount } as React.CSSProperties}
                >
                  {/* vertical spine (<lg) — the 64px band at the
                      inline-start edge */}
                  <svg
                    width={64}
                    height={nodeCount * ROUTE_V.pitch}
                    viewBox={`0 0 64 ${nodeCount * ROUTE_V.pitch}`}
                    aria-hidden="true"
                    className="absolute start-0 top-0 lg:hidden"
                  >
                    <path d={vPath(flow.length)} className="tk-route" />
                    <path d={vPath(traveledEnd)} className="tk-route-bed" />
                    <path d={vPath(traveledEnd)} className="tk-route-traveled" />
                  </svg>
                  {/* horizontal chapter (lg+) — fixed slots, the svg
                      bleeds 24px past the inline-start edge (UC frame
                      bleed; stays inside the card padding) */}
                  <svg
                    width={hSvgW}
                    height={40}
                    viewBox={`0 0 ${hSvgW} 40`}
                    aria-hidden="true"
                    className="absolute top-0 hidden lg:block lg:-start-6"
                  >
                    <path d={hPath(flow.length)} className="tk-route" />
                    <path d={hPath(traveledEnd)} className="tk-route-bed" />
                    <path d={hPath(traveledEnd)} className="tk-route-traveled" />
                  </svg>
                  <ol aria-label="مسار الطلب" className="relative lg:flex">
                    {flow.map((s, i) => {
                      const meta = FLOW_AR[s];
                      const Icon = meta.icon;
                      const done = i < currentIdx;
                      const active = i === currentIdx;
                      return (
                        <li
                          key={s}
                          className="flex h-16 items-center gap-3.5 lg:h-auto lg:w-[84px] lg:flex-col lg:items-center lg:gap-1.5"
                        >
                          <span
                            className={cn(
                              "relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border-2",
                              done
                                ? "bg-primary border-primary text-primary-foreground"
                                : active
                                  ? "bg-accent-soft border-primary text-accent-foreground animate-pulse-soft ring-4 ring-primary/10"
                                  : "bg-muted border-border text-muted-foreground/60"
                            )}
                          >
                            <Icon className="size-4" aria-hidden="true" />
                          </span>
                          <div className="min-w-0 flex-1 lg:flex-none lg:text-center">
                            {/* the pinned status pill (mono chip grammar) */}
                            <span
                              className={cn(
                                "inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-medium leading-4",
                                active
                                  ? "border-(--c-copper-ink)/45 bg-(--c-copper-bg) text-(--c-copper-deep)"
                                  : done
                                    ? "border-border bg-card text-muted-foreground"
                                    : "border-border/70 bg-muted/40 text-muted-foreground/70"
                              )}
                            >
                              {meta.label}
                            </span>
                            {active && (
                              <div className="text-[11px] text-accent-foreground mt-0.5">المرحلة الحالية</div>
                            )}
                          </div>
                          {done && (
                            <Check className="size-4 shrink-0 text-accent-foreground lg:hidden" aria-hidden="true" />
                          )}
                        </li>
                      );
                    })}
                    {/* P6-2-f3 (GROUP 2): the DESTINATION TERMINUS — the ring
                        after the last station. DELIVERED = terminus reached →
                        CLOSED ring (solid border + quiet ring halo); pending →
                        OPEN dashed ring (the road still unbuilt). */}
                    <li className="flex h-16 items-center gap-3.5 lg:h-auto lg:w-[84px] lg:flex-col lg:items-center lg:gap-1.5">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border-2",
                          status === "DELIVERED"
                            ? "border-primary bg-primary/10 text-accent-foreground ring-2 ring-primary/15"
                            : "border-dashed border-border bg-card text-muted-foreground/60"
                        )}
                      >
                        <Flag className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1 lg:flex-none lg:text-center">
                        <div
                          className={cn(
                            "text-sm font-semibold",
                            status !== "DELIVERED" && "text-muted-foreground"
                          )}
                        >
                          الوجهة
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {status === "DELIVERED" ? "تم الوصول — نهاية الطريق" : "نهاية الطريق بانتظار طلبك"}
                        </div>
                      </div>
                    </li>
                  </ol>
                  {/* the parcel runner — rides the CURRENT segment, rests
                      under the live node; keyed by status so a poll
                      transition restarts it cleanly. RM: the global belt
                      halts it at its resting pose (globals .tk-runner*). */}
                  {showRunner && (
                    <>
                      <span
                        key={`v-${status}`}
                        aria-hidden="true"
                        className="tk-runner tk-runner-v lg:hidden"
                        style={
                          {
                            top: vRunner.top,
                            insetInlineStart: 12,
                            "--tk-dy": `${vRunner.dy}px`,
                            "--tk-sway": `${vRunner.sway}px`,
                          } as React.CSSProperties
                        }
                      />
                      <span
                        key={`h-${status}`}
                        aria-hidden="true"
                        className="tk-runner tk-runner-h hidden lg:block"
                        style={
                          {
                            top: hRunner.top,
                            insetInlineStart: hRunner.start,
                            "--tk-dx": `${hRunner.dx}px`,
                            "--tk-sway": `${hRunner.sway}px`,
                          } as React.CSSProperties
                        }
                      />
                    </>
                  )}
                </div>
              </div>

              {status === "DELIVERED" && (
                /* P6-2-f3 (GROUP 2): the delivered moment — a composed
                   TERMINAL STAMP instead of just the final node: the big
                   squared mint-family franked block (2px dashed stamp
                   border + icon well) + the delivery date from the order's
                   status history (deliveredAt prop; absent → no date line,
                   never a fabricated date). */
                <div className="mt-5 flex items-center gap-3.5 rounded-sm border-2 border-dashed border-(--c-mint-ink)/45 bg-(--c-mint-bg) p-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-sm border border-(--c-mint-ink)/35 bg-card text-(--c-mint-deep)">
                    <PackageCheck className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-heading font-bold text-sm text-(--c-mint-deep)">تم التسليم</div>
                    {deliveredAt && (
                      <div className="mt-0.5 text-xs text-(--c-mint-deep)/80">
                        {formatArabicDateTime(deliveredAt)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">
            {order.customerName} · {FULFILLMENT_AR[order.fulfillmentType]}
            {order.fulfillmentType === "DELIVERY" && order.area ? ` · ${order.city ?? ""} ${order.area}` : ""}
          </div>
        </section>

        {/* Items — the receipt comes AFTER the route beat (P16-4c) */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold text-sm mb-3">تفاصيل الطلب</h2>
          <ul className="space-y-2.5">
            {order.items.map((item, i) => (
              <li key={i} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <span className="tabular-nums text-muted-foreground">{item.quantity}×</span>{" "}
                  <span className="font-medium">{item.productName}</span>
                  {item.variantName && <span className="text-muted-foreground text-xs"> — {item.variantName}</span>}
                  {item.options.length > 0 && (
                    <div className="text-[11px] text-muted-foreground mt-0.5">{item.options.join("، ")}</div>
                  )}
                </div>
                <span className="tabular-nums font-mono shrink-0">{formatLyd(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-3 border-t border-border/60 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>المجموع الفرعي</span>
              <span className="tabular-nums font-mono">{formatLyd(order.subtotal)}</span>
            </div>
            {order.deliveryFee > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>التوصيل</span>
                <span className="tabular-nums font-mono">{formatLyd(order.deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-1.5 border-t border-border/60">
              <span>الإجمالي</span>
              <span className="tabular-nums font-mono text-accent-foreground">{formatLyd(order.total)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground pt-1 text-xs">
              <span>الدفع</span>
              <span>
                {order.paymentMethod ?? "—"} · {PAYMENT_STATUS_AR[paymentStatus]}
              </span>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="flex gap-2">
          {order.business.phone && (
            <a
              href={`tel:${order.business.phone}`}
              className="flex-1 h-11 rounded-lg border border-border bg-card flex items-center justify-center gap-2 text-sm font-semibold hover:bg-muted transition-colors"
            >
              <Phone className="size-4" aria-hidden="true" />
              اتصال بالمتجر
            </a>
          )}
          {waNumber && (
            <a
              href={waLink(waNumber, buildStatusUpdateMessage(order.orderNumber, status, order.business.name))}
              target="_blank"
              rel="noopener noreferrer"
              className="whatsapp-btn flex-1 h-11 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-colors"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              واتساب المتجر
            </a>
          )}
        </div>

        {syncFailed && !isCancelled ? (
          /* P6-2-f3 (GROUP 2): poll-failure hint — the last known state
             stays on screen (the catch keeps it); this quiet muted line
             + manual retry replaces the 15s footnote while offline. The
             visibility-gated cadence above is untouched. */
          <div
            role="status"
            aria-live="polite"
            className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 pb-6 text-center"
          >
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <WifiOff className="size-3 shrink-0" aria-hidden="true" />
              آخر تحديث معروف — تعذّر الاتصال
            </p>
            <button
              type="button"
              onClick={poll}
              className="text-[11px] font-medium text-accent-foreground underline underline-offset-2 transition-colors hover:text-foreground"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <p className="text-center text-[11px] text-muted-foreground pb-6">
            تُحدَّث الحالة تلقائياً كل 15 ثانية
          </p>
        )}
      </main>
    </div>
  );
}
