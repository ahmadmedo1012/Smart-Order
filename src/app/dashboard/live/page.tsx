"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { useBusiness } from "@/components/dashboard/shell";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { PaymentStatusBadge } from "@/components/shared/status-badges";
import { PageHeader } from "@/components/dashboard/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatLyd } from "@/lib/money";
import { countedArabicPhrase } from "@/lib/arabic-plural";
import { getAllowedTransitions } from "@/lib/order-machine";
import { agingOf, AGING_TICK_MS, type AgingBucket } from "@/lib/aging";
import { playArrivalBeep, readArrivalSoundPref, writeArrivalSoundPref } from "@/lib/arrival-sound";
import { toast } from "sonner";
import {
  FULFILLMENT_AR,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  Radio,
  Search,
  Phone,
  ArrowLeft,
  RotateCcw,
  Bell,
  Volume2,
  VolumeX,
  ChevronLeft,
  Truck,
  Store,
  ChefHat,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";

/**
 * P43 SO-1 — لوحة الطلبات المباشرة (the Live Order Command Center).
 *
 * An operations board over the SAME orders.read API the inbox uses — one
 * `status=ACTIVE` request per 10s poll (visibility-gated, the tracking
 * page's law), five lanes grouped by the in-flight statuses, per-card
 * aging (aging.ts buckets, 30s tick) and the machine's own next-step
 * quick action (order-machine.ts — the same transitions the detail page
 * fires, never a second machine). New arrivals toast + optional beep (the
 * orders page's opt-in arrival-sound grammar, same storage key so the
 * operator's preference is ONE choice across both surfaces) and are
 * announced politely to screen readers (aria-live).
 *
 * Deliberately a VIEW: no state lives here that the orders inbox doesn't
 * already own — a quick action is the orders PATCH route (orders.update
 * permission enforced server-side, UI-gated on the shell's perms like
 * the detail page), the full detail stays one tap away.
 */

interface LiveOrderRow {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  fulfillmentType: "DELIVERY" | "PICKUP";
  total: number;
  paymentStatus: PaymentStatus;
  customerName: string;
  customerPhone: string;
  city: string | null;
  area: string | null;
  createdAt: string;
  customerConfirmedAt: string | null;
  _count: { items: number };
  /* P43 SO-1: أعلى سطرين قيمة من الطلب (ملخص البطاقة) — من الـselect
   * الإضافي على GET /api/orders. */
  items: Array<{ productName: string; quantity: number }>;
}

/* The five in-flight lanes — ORDER_STATUSES' active prefix in machine
   order. Terminal lanes (DELIVERED/CANCELLED/REJECTED) live in the
   inbox; a board that mixed closed orders with live ones would bury the
   signal under history. */
const LANES: Array<{
  status: OrderStatus;
  label: string;
  hint: string;
  icon: typeof ClipboardList;
}> = [
  { status: "NEW", label: "جديد", hint: "بانتظار التأكيد", icon: ClipboardList },
  { status: "CONFIRMED", label: "مؤكد", hint: "بانتظار بدء التحضير", icon: CheckCircle2 },
  { status: "PREPARING", label: "قيد التحضير", hint: "في المطبخ الآن", icon: ChefHat },
  { status: "READY", label: "جاهز", hint: "بانتظار الاستلام أو الخروج", icon: Bell },
  { status: "OUT_FOR_DELIVERY", label: "في الطريق", hint: "مع المندوب", icon: Truck },
];

/* P37 (B5-c) family idiom (theme-toggle/orders page): post-hydration
   render without an effect. */
const emptySubscribe = () => () => {};

/* Aging ink — the bucket's own color grammar (neutral/amber/red), mono
   digits (the operational code voice). */
const AGING_INK: Record<AgingBucket, string> = {
  fresh: "text-muted-foreground",
  warning: "text-warning-ink",
  urgent: "text-destructive-ink",
};

function minutesAr(n: number): string {
  return countedArabicPhrase(n, "دقيقة", {
    one: "دقيقة واحدة",
    two: "دقيقتين",
    few: "دقائق",
    many: "دقيقة",
  });
}

export default function LiveBoardPage() {
  const { businessId, perms } = useBusiness();
  const router = useRouter();
  const [orders, setOrders] = React.useState<LiveOrderRow[] | null>(null);
  const [error, setError] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  /* Filters (client-side — the board fetches ALL active orders once per
     poll; filtering is instant, no extra requests). */
  const [fulfillment, setFulfillment] = React.useState("ALL");
  const [payment, setPayment] = React.useState("ALL");
  const [q, setQ] = React.useState("");

  /* New-arrival tracking — the known-IDs snapshot (orders page grammar):
     seeded by the first poll, then every unknown id is an arrival. */
  const [newCount, setNewCount] = React.useState(0);
  const [announcement, setAnnouncement] = React.useState("");
  const seenIdsRef = React.useRef<Set<string> | null>(null);
  const loadedOnceRef = React.useRef(false);

  /* The opt-in arrival beep — same storage key as the orders page (ONE
     preference across both surfaces), same mounted-flag + render-adjust
     + ref-mirror wiring (P37 B5-c). */
  const [soundOn, setSoundOn] = React.useState(false);
  const soundOnRef = React.useRef(false);
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [prefLoaded, setPrefLoaded] = React.useState(false);
  if (mounted && !prefLoaded) {
    setPrefLoaded(true);
    setSoundOn(readArrivalSoundPref());
  }
  React.useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);
  const toggleSound = () => {
    const next = !soundOnRef.current;
    soundOnRef.current = next;
    writeArrivalSoundPref(next);
    setSoundOn(next);
  };

  /* The aging clock — pure client-side minutes from createdAt, re-read
     every 30s (AGING_TICK_MS). The initial value is lazy and never
     renders on the server (the board paints its skeleton branch during
     SSR — orders is null until the first client-side fetch), so server
     and client can never disagree. */
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), AGING_TICK_MS);
    return () => clearInterval(t);
  }, []);

  /* The poll — 10s, visibility-gated (hidden tabs fetch nothing; coming
     back refreshes immediately). Failures are silent after the first
     successful load (the board keeps its last known truth, the same
     degrade as the orders page's auxiliary poll). */
  const load = React.useCallback(() => {
    if (!businessId) return;
    api
      .get<LiveOrderRow[]>(
        `/api/orders?businessId=${businessId}&status=ACTIVE&pageSize=100`,
      )
      .then((r) => {
        setError(false);
        loadedOnceRef.current = true;
        const rows = r.data;
        const seen = seenIdsRef.current;
        if (seen === null) {
          seenIdsRef.current = new Set(rows.map((o) => o.id));
        } else {
          const arrivals = rows.filter((o) => !seen.has(o.id));
          if (arrivals.length > 0) {
            for (const o of arrivals) seen.add(o.id);
            setNewCount((c) => c + arrivals.length);
            setAnnouncement(
              arrivals.length === 1
                ? `وصل طلب جديد: ${arrivals[0].orderNumber} من ${arrivals[0].customerName}`
                : `وصلت ${countedArabicPhrase(arrivals.length, "طلب جديد", {
                    two: "طلبان جديدان",
                    few: "طلبات جديدة",
                    many: "طلبًا جديدًا",
                  })}: ${arrivals.map((a) => a.orderNumber).join("، ")}`,
            );
            if (soundOnRef.current) playArrivalBeep();
            if (arrivals.length === 1) {
              const o = arrivals[0];
              toast("وصل طلب جديد", {
                description: `${o.orderNumber} — ${o.customerName} · ${formatLyd(o.total)}`,
                action: {
                  label: "عرض",
                  onClick: () => router.push(`/dashboard/orders/${o.id}`),
                },
              });
            } else {
              toast("وصلت طلبات جديدة", {
                description: `${countedArabicPhrase(arrivals.length, "طلب جديد", {
                  two: "طلبان جديدان",
                  few: "طلبات جديدة",
                  many: "طلبًا جديدًا",
                })} بانتظار المعالجة`,
              });
            }
          }
        }
        setOrders(rows);
      })
      .catch(() => {
        /* أول جلب فاشل = حالة الخطأ الصادقة؛ فشل استطلاعٍ بعد نجاح
           سابق يبقي آخر حقيقة معروفة (لا وميض عمى). */
        if (!loadedOnceRef.current) setError(true);
      });
  }, [businessId, router]);

  React.useEffect(() => {
    load();
    const t = setInterval(() => {
      if (!document.hidden) load();
    }, 10_000);
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load, reloadKey]);

  /* Quick action — the machine's first non-destructive transition, fired
     through the SAME orders PATCH route the detail page uses (server
     re-validates the machine + permissions; the board never invents a
     transition). Gated on orders.update like the detail page's buttons. */
  const canAdvance = perms.includes("orders.update");

  async function advance(o: LiveOrderRow, to: OrderStatus, label: string) {
    if (busyId) return;
    setBusyId(o.id);
    try {
      await api.patch(`/api/orders/${o.id}`, { businessId, status: to });
      toast.success(`${label} — ${o.orderNumber}`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر تحديث الحالة");
    } finally {
      setBusyId(null);
    }
  }

  /* Client-side filters over the fetched active set. */
  const filtered = React.useMemo(() => {
    const rows = orders ?? [];
    const term = q.trim().replace(/\s+/g, "");
    return rows.filter((o) => {
      if (fulfillment !== "ALL" && o.fulfillmentType !== fulfillment) return false;
      if (payment !== "ALL" && o.paymentStatus !== payment) return false;
      if (term) {
        const hay = `${o.orderNumber}${o.customerName}${o.customerPhone.replace(/\s+/g, "")}`;
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [orders, fulfillment, payment, q]);

  const byLane = React.useMemo(
    () =>
      LANES.map((lane) => ({
        ...lane,
        rows: filtered.filter((o) => o.status === lane.status),
      })),
    [filtered],
  );

  const newLaneRef = React.useRef<HTMLElement | null>(null);

  if (error) {
    return (
      <ErrorState
        retry={() => {
          setError(false);
          setReloadKey((k) => k + 1);
        }}
      />
    );
  }

  if (orders === null) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="space-y-5"
      >
        <span className="sr-only">جارٍ تحميل لوحة الطلبات المباشرة…</span>
        <p className="text-sm text-muted-foreground" aria-hidden="true">
          جارٍ تحميل اللوحة المباشرة…
        </p>
        <div className="flex gap-4 overflow-hidden" aria-hidden="true">
          {LANES.map((lane) => (
            <div key={lane.status} className="w-72 shrink-0 space-y-3">
              <div className="h-10 rounded-lg border border-dashed border-border/90 bg-muted/30" />
              <div className="h-36 animate-pulse rounded-xl bg-muted/40" />
              <div className="h-36 animate-pulse rounded-xl bg-muted/40" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalActive = filtered.length;
  const filtersActive =
    fulfillment !== "ALL" || payment !== "ALL" || q.trim() !== "";

  return (
    <div className="space-y-5">
      {/* New arrivals reach screen readers politely — the toast is visual,
          this region is the accessible twin. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <PageHeader
        title="الطلبات المباشرة"
        subtitle="كل طلب قيد المعالجة على ممر واحد — مؤقت العمر، الإجراء التالي بضغطة، وتحديث تلقائي كل 10 ثوان"
        meta={<span>{totalActive} طلب نشط</span>}
        divider
        actions={
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSound}
              aria-pressed={soundOn}
              aria-label={
                soundOn
                  ? "إيقاف صوت الطلبات الجديدة"
                  : "تشغيل صوت الطلبات الجديدة"
              }
              title={
                soundOn
                  ? "صوت الطلبات الجديدة: مفعّل"
                  : "صوت الطلبات الجديدة: متوقف"
              }
            >
              {soundOn ? (
                <Volume2 className="size-4" aria-hidden="true" />
              ) : (
                <VolumeX className="size-4" aria-hidden="true" />
              )}
            </Button>
            {newCount > 0 && (
              <Button
                size="sm"
                onClick={() => {
                  setNewCount(0);
                  newLaneRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
              >
                <Bell className="size-4 me-1.5" aria-hidden="true" />
                {countedArabicPhrase(newCount, "طلب جديد", {
                  two: "طلبان جديدان",
                  few: "طلبات جديدة",
                  many: "طلبًا جديدًا",
                })}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFulfillment("ALL");
                setPayment("ALL");
                setQ("");
              }}
            >
              <RotateCcw className="size-4 me-1.5" aria-hidden="true" />
              تصفير الفلاتر
            </Button>
          </>
        }
      />

      {/* Filters — the orders inbox toolbar grammar (search well + two
          selects), client-side and instant. */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-44 max-w-72">
          <Search
            className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="رقم الطلب، اسم أو هاتف العميل…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="ps-9 bg-card"
            aria-label="بحث في الطلبات النشطة"
          />
        </div>
        <Select value={payment} onValueChange={setPayment}>
          <SelectTrigger className="w-36 bg-card" aria-label="فلترة حالة الدفع">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">كل حالات الدفع</SelectItem>
            <SelectItem value="UNPAID">غير مدفوع</SelectItem>
            <SelectItem value="PAID">مدفوع</SelectItem>
          </SelectContent>
        </Select>
        <Select value={fulfillment} onValueChange={setFulfillment}>
          <SelectTrigger className="w-36 bg-card" aria-label="فلترة نوع الطلب">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">توصيل واستلام</SelectItem>
            <SelectItem value="DELIVERY">توصيل</SelectItem>
            <SelectItem value="PICKUP">استلام</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {totalActive === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={Radio}
            title={filtersActive ? "لا توجد طلبات مطابقة" : "لا توجد طلبات نشطة الآن"}
            description={
              filtersActive
                ? "جرّب تغيير الفلاتر أو تصفيرها لعرض كل الطلبات النشطة"
                : "كل طلب جديد يصل متجرك يظهر هنا فوراً مع تنبيه وصوت اختياري — شارك رابط متجرك ليبدأ العميل بالطلب"
            }
            action={
              filtersActive ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFulfillment("ALL");
                    setPayment("ALL");
                    setQ("");
                  }}
                >
                  عرض كل الطلبات النشطة
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          {/* Desktop — horizontally scrollable lanes (the kanban law:
              motion between stages reads start→end in RTL). */}
          <div className="hidden md:flex items-start gap-4 overflow-x-auto pb-2">
            {byLane.map((lane) => (
              <LiveLane
                key={lane.status}
                lane={lane}
                laneRef={lane.status === "NEW" ? newLaneRef : undefined}
                now={now}
                busyId={busyId}
                canAdvance={canAdvance}
                onAdvance={advance}
              />
            ))}
          </div>

          {/* Mobile — stacked sections (360px first, the board reads top
              to bottom in machine order). */}
          <div className="md:hidden space-y-5">
            {byLane.map((lane) => (
              <LiveLane
                key={lane.status}
                lane={lane}
                laneRef={lane.status === "NEW" ? newLaneRef : undefined}
                now={now}
                busyId={busyId}
                canAdvance={canAdvance}
                onAdvance={advance}
                stacked
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── A lane: header (status + count) + the cards column ────────────── */

function LiveLane({
  lane,
  laneRef,
  now,
  busyId,
  canAdvance,
  onAdvance,
  stacked = false,
}: {
  lane: {
    status: OrderStatus;
    label: string;
    hint: string;
    icon: typeof ClipboardList;
    rows: LiveOrderRow[];
  };
  laneRef?: React.RefObject<HTMLElement | null>;
  now: number;
  busyId: string | null;
  canAdvance: boolean;
  onAdvance: (o: LiveOrderRow, to: OrderStatus, label: string) => void;
  stacked?: boolean;
}) {
  return (
    <section
      ref={laneRef}
      aria-labelledby={`live-lane-${lane.status}`}
      /* Desktop: fixed-width column in the horizontal strip; mobile: a
         full-width stacked section. The lane body caps and scrolls (the
         global thin scrollbar) so a busy «جديد» lane never stretches
         the page. */
      className={cn(
        "rounded-xl border border-border bg-muted/30",
        stacked ? "w-full" : "w-72 lg:w-80 shrink-0 self-stretch",
      )}
    >
      <div className="flex items-center justify-between gap-2 rounded-t-xl border-b border-border/70 bg-card/60 px-3.5 py-2.5">
        <h2
          id={`live-lane-${lane.status}`}
          className="flex items-center gap-2 text-sm font-semibold"
        >
          <lane.icon className="size-4 text-accent-foreground" aria-hidden="true" />
          {lane.label}
          <span className="font-mono tabular-nums text-xs text-muted-foreground">
            ({lane.rows.length})
          </span>
        </h2>
        {/* الممر الفارغ يعلن صمته بجملته التشغيلية — لا بطاقات */}
        <span className="text-[11px] text-muted-foreground">
          {lane.rows.length === 0 ? lane.hint : ""}
        </span>
      </div>
      {lane.rows.length === 0 ? (
        <div className="flex min-h-24 items-center justify-center px-3 py-4" aria-hidden="true">
          <span className="w-full rounded-sm border border-dashed border-border/90 bg-card/50 py-3 text-center text-[11px] text-muted-foreground">
            لا طلبات في هذه المرحلة
          </span>
        </div>
      ) : (
        <ul
          className={cn(
            "flex flex-col gap-2.5 overflow-y-auto p-2.5",
            stacked ? "max-h-none" : "max-h-[calc(100vh-16rem)]",
          )}
        >
          {lane.rows.map((o) => (
            <li key={o.id}>
              <LiveCard
                order={o}
                now={now}
                busy={busyId === o.id}
                canAdvance={canAdvance}
                onAdvance={onAdvance}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ── A card: identity, customer, items, money, aging, action ───────── */

function LiveCard({
  order,
  now,
  busy,
  canAdvance,
  onAdvance,
}: {
  order: LiveOrderRow;
  now: number;
  busy: boolean;
  canAdvance: boolean;
  onAdvance: (o: LiveOrderRow, to: OrderStatus, label: string) => void;
}) {
  /* The machine's own next step (fulfillment-aware, the SAME table the
     detail page renders from — the board never invents a transition).
     Destructive moves stay on the detail page's confirm dialog. */
  const primary = getAllowedTransitions(order.status, order.fulfillmentType).find(
    (t) => !t.destructive,
  );

  const { minutes, bucket } = agingOf(order.createdAt, now);

  const itemsSummary =
    order.items.length === 0
      ? `${order._count.items} صنف`
      : order.items
          .map((i) => `${i.quantity}× ${i.productName}`)
          .join("، ") +
        (order._count.items > order.items.length ? " وغيرها" : "");

  return (
    <article
      className={cn(
        "rounded-xl border border-border bg-card p-3.5 transition-shadow",
        bucket === "urgent" &&
          "shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--destructive)_32%,transparent)]",
        bucket === "warning" &&
          "shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--warning)_32%,transparent)]",
      )}
    >
      {/* Row 1 — order number + aging (the two things the operator scans
          first: WHO and HOW LONG). */}
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/dashboard/orders/${order.id}`}
          className="font-mono text-[13px] font-semibold tabular-nums hover:text-accent-foreground"
        >
          {order.orderNumber}
        </Link>
        {/* Aging — minutes since createdAt, the bucket's ink, mono
            digits; the aria-label speaks the whole sentence. */}
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 font-mono text-[11px] font-semibold tabular-nums",
            AGING_INK[bucket],
          )}
          aria-label={`عمر الطلب: منذ ${minutesAr(minutes)}`}
        >
          <span aria-hidden="true">⏱</span>
          منذ {minutesAr(minutes)}
        </span>
      </div>

      {/* Row 2 — customer (name + tap-to-call) — the kitchen calls. */}
      <div className="mt-2 flex items-center gap-1.5 text-[13px] min-w-0">
        <span className="truncate font-medium">{order.customerName}</span>
        <a
          href={`tel:${order.customerPhone}`}
          className="ms-auto flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={`اتصال بـ ${order.customerName} على ${order.customerPhone}`}
        >
          <Phone className="size-4" aria-hidden="true" />
        </a>
      </div>

      {/* Row 3 — items summary (top lines name the order for the
          kitchen; «وغيرها» when the count exceeds the top-2 preview). */}
      <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
        {itemsSummary}
      </p>

      {/* Row 4 — fulfillment + payment status + total. */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-sm border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          {order.fulfillmentType === "DELIVERY" ? (
            <Truck className="size-3" aria-hidden="true" />
          ) : (
            <Store className="size-3" aria-hidden="true" />
          )}
          {FULFILLMENT_AR[order.fulfillmentType]}
        </span>
        <PaymentStatusBadge status={order.paymentStatus} />
        <span className="ms-auto font-mono text-sm font-bold tabular-nums">
          {formatLyd(order.total)}
        </span>
      </div>

      {/* Row 5 — the quick action + the full-detail escape. */}
      <div className="mt-3 flex items-center gap-1.5 border-t border-border/60 pt-2.5">
        {canAdvance && primary ? (
          <Button
            size="sm"
            className="h-9 flex-1"
            disabled={busy}
            onClick={() => onAdvance(order, primary.to, primary.label)}
          >
            {busy ? "جارٍ…" : primary.label}
            <ChevronLeft className="size-3.5" aria-hidden="true" />
          </Button>
        ) : (
          canAdvance && (
            <span className="flex-1 text-[11px] text-muted-foreground">
              {order.status === "OUT_FOR_DELIVERY"
                ? "بانتظار التسليم — من صفحة التفاصيل"
                : "الإجراء التالي من صفحة التفاصيل"}
            </span>
          )
        )}
        {!canAdvance && (
          <span className="flex-1 text-[11px] text-muted-foreground">
            الإجراءات تتطلب صلاحية تحديث الطلبات
          </span>
        )}
        <Button asChild variant="ghost" size="sm" className="h-9">
          <Link
            href={`/dashboard/orders/${order.id}`}
            aria-label={`تفاصيل الطلب ${order.orderNumber}`}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
