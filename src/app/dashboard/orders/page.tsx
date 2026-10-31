"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { useBusiness } from "@/components/dashboard/shell";
import { countedArabicPhrase } from "@/lib/arabic-plural";
import { toast } from "sonner";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/shared/status-badges";
import { BadgeCheck } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/shared/states";
import {
  ToolbarSkeleton,
  TableSkeleton,
  CardListSkeleton,
} from "@/components/dashboard/skeletons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/dashboard/page-header";
import { UnderlineTabs } from "@/components/dashboard/underline-tabs";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { formatLyd } from "@/lib/money";
import { formatArabicDateTime } from "@/lib/arabic";
import { playArrivalBeep, readArrivalSoundPref, writeArrivalSoundPref } from "@/lib/arrival-sound";
import {
  ORDER_STATUSES,
  ORDER_STATUS_AR,
  FULFILLMENT_AR,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/constants";
import { ClipboardList, Search, ArrowLeft, RotateCcw, Bell, Volume2, VolumeX } from "lucide-react";

interface OrderRow {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  fulfillmentType: "DELIVERY" | "PICKUP";
  total: number;
  paymentStatus: PaymentStatus;
  paymentType: string | null;
  customerName: string;
  customerPhone: string;
  city: string | null;
  area: string | null;
  createdAt: string;
  /* W6-B7: the customer's one-tap confirmation stamp — null = not
     confirmed; a stamp renders the «مؤكد من العميل» flag on the row. */
  customerConfirmedAt: string | null;
  _count: { items: number };
}

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "الكل" },
  ...ORDER_STATUSES.map((s) => ({ value: s, label: ORDER_STATUS_AR[s] })),
];

/* P37 (set-state-in-effect migration, B5-c): the theme-toggle's
   mounted-flag idiom — a no-op store whose client snapshot is true and
   server snapshot false. Gives a post-hydration render without an
   effect; see the sound-pref block below. */
const emptySubscribe = () => () => {};

export default function OrdersPage() {
  const { businessId } = useBusiness();
  const params = useSearchParams();
  const [orders, setOrders] = React.useState<OrderRow[] | null>(null);
  const [error, setError] = React.useState(false);
  const [status, setStatus] = React.useState(params.get("status") ?? "ALL");
  const [payment, setPayment] = React.useState("ALL");
  const [fulfillment, setFulfillment] = React.useState("ALL");
  const [q, setQ] = React.useState("");
  /* r132 (A2 F12): 300ms debounce — the twin the customers list got in
     r131 (customers/page.tsx). Every keystroke used to fire a full
     GET /api/orders (25-row pages + joins) and flicker meta.total
     through stale values; the term now settles before it reaches the
     fetch deps, and the page resets with the settled term. */
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  /* P37 (B5-c): the page reset used to live in an effect on
     [debouncedQ] (setPage(1) — react-hooks/set-state-in-effect). It is
     now the render-time prev-compare adjust (React docs «You Might Not
     Need an Effect — adjusting state when a prop changes"): when the
     settled term changes, page resets in the SAME render pass, so the
     fetch effect below sees (debouncedQ=new, page=1) in one commit.
     The old effect order fetched twice on a settle while page > 1
     (fetch(q=new,page=old) then fetch(q=new,page=1)) — a
     last-write-wins race the adjust removes. */
  const [prevDebouncedQ, setPrevDebouncedQ] = React.useState("");
  if (prevDebouncedQ !== debouncedQ) {
    setPrevDebouncedQ(debouncedQ);
    setPage(1);
  }
  const [meta, setMeta] = React.useState({ total: 0, totalPages: 1 });
  /* r131 (F3, A5 P1-2 / A11 SO-1): the old retry passed
 setPage((p) => p) — a same-value setState bail-out that never
 re-fired the fetch effect, so the retry button did nothing.
 reloadKey is consumed by the effect deps: bumping it refetches. */
  const [reloadKey, setReloadKey] = React.useState(0);
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  /* (phase4 W1-SO) تنبيه الطلبات الجديدة — وعد الـFAQ «كل طلب يصل فوراً
     إلى لوحة التحكم مع تنبيه» صار وظيفة حقيقية على هذه الصفحة: استطلاع
     كل 20 ثانية ببوابة الظهور (السابقة الموثقة dashboard/page.tsx —
     التبويبات الخفية لا تجلب شيئًا) يجلب الصفحة الأولى بلا فلاتر، وكل
     طلب غريب عن المجموعة المعروفة يُعلَن بتوست ويحصى في وسم الرأس، ويُدمَج
     في القائمة مباشرة إن كانت العرضة الحالية ستُظهره (الكل/جديد، صفحة 1،
     بلا بحث أو فلاتر أخرى). بذرة الـIDs من أول جلب، والفشل صامت —
     الاستطلاع مساعد لا يُعطّل الصفحة. */
  const router = useRouter();
  const [newCount, setNewCount] = React.useState(0);
  const seenIdsRef = React.useRef<Set<string> | null>(null);

  /* W6-B7 (W6-A4 gap #3 — kitchen-proof notification): the opt-in
     arrival beep. Default OFF (a page that makes uninvited noise is the
     classic surprise-audio anti-pattern — the toggle is one tap and
     persists in localStorage, the theme-toggle's storage idiom). The
     ref mirrors the state so loadFeed's identity — and therefore the
     poll effect — never churns when the operator flips the toggle. */
  const [soundOn, setSoundOn] = React.useState(false);
  const soundOnRef = React.useRef(false);
  /* P37 (B5-c): the mount-effect pref read (readArrivalSoundPref() →
     soundOnRef.current = on; setSoundOn(on)) tripped
     react-hooks/set-state-in-effect. The repo's mounted-flag idiom
     (theme-toggle.tsx useSyncExternalStore) now supplies the
     post-hydration render; the adjust below syncs the STATE during
     that render (setState-during-render, the React docs adjust
     pattern), and the small [soundOn] effect mirrors it into the ref
     (a ref write in an effect is the sanctioned place —
     react-hooks/refs bans ref writes during render). Same timeline as
     the old effect (server/hydration paint OFF; one post-hydration
     re-render when the pref is ON, none when OFF). The ref keeps its
     exact role: loadFeed reads it at beep time and stays out of the
     sound wiring, so its identity (and the poll effect) never churns
     on a toggle flip. */
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

  const loadFeed = React.useCallback(() => {
    if (!businessId) return;
    api
      .get<OrderRow[]>(`/api/orders?businessId=${businessId}&page=1&pageSize=25`)
      .then((r) => {
        const rows = r.data;
        const seen = seenIdsRef.current;
        if (seen === null) {
          seenIdsRef.current = new Set(rows.map((o) => o.id));
          return;
        }
        const arrivals = rows.filter((o) => !seen.has(o.id));
        if (arrivals.length === 0) return;
        for (const o of rows) seen.add(o.id);
        setNewCount((c) => c + arrivals.length);
        /* W6-B7: the kitchen hears the arrival too — the beep rides the
           SAME arrival branch (the poll's visibility gating and the
           merge rules untouched); playArrivalBeep never throws, so a
           blocked/missing AudioContext can never break the feed. */
        if (soundOnRef.current) playArrivalBeep();
        const canMerge =
          page === 1 &&
          !debouncedQ.trim() &&
          payment === "ALL" &&
          fulfillment === "ALL" &&
          (status === "ALL" || status === "NEW");
        if (canMerge) {
          setOrders((prev) =>
            prev === null
              ? prev
              : [...arrivals.filter((a) => !prev.some((p) => p.id === a.id)), ...prev],
          );
          setMeta((m) => ({ ...m, total: m.total + arrivals.length }));
        }
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
      })
      .catch(() => {}); // silent — the poll is auxiliary, errors surface on the main fetch
  }, [businessId, status, payment, fulfillment, debouncedQ, page, router]);

  React.useEffect(() => {
    loadFeed(); // seed the known-IDs snapshot immediately, then poll
    const t = setInterval(() => {
      if (!document.hidden) loadFeed();
    }, 20_000);
    const onVisible = () => {
      if (!document.hidden) loadFeed();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadFeed]);

  /* the badge counts arrivals not yet reviewed in the «جديد» tab —
     opening that tab IS the review, so it clears the count.
     P37 (B5-c): the reset moved out of an effect into the ONE handler
     that can enter the tab without already resetting (the badge button
     resets itself; every other status setter leaves NEW or is ALL).
     See the UnderlineTabs onChange below. */

  /* P37 (B5-c): the fetch effect used to setError(false)
     synchronously at its start (set-state-in-effect). The clear is now
     a render-time prev-compare adjust on the fetch inputs: when ANY
     dep changes, the stale banner drops in the same render (before
     the effect even runs — the old order could paint the stale banner
     for one frame between commit and passive-effect flush). The
     catch keeps setting it; nothing else needed changing. */
  const fetchKey = JSON.stringify([
    businessId,
    status,
    payment,
    fulfillment,
    debouncedQ,
    page,
    reloadKey,
  ]);
  const [prevFetchKey, setPrevFetchKey] = React.useState(fetchKey);
  if (prevFetchKey !== fetchKey) {
    setPrevFetchKey(fetchKey);
    if (error) setError(false);
  }

  React.useEffect(() => {
    if (!businessId) return;
    const sp = new URLSearchParams({
      businessId,
      page: String(page),
      pageSize: "25",
    });
    if (status !== "ALL") sp.set("status", status);
    if (payment !== "ALL") sp.set("paymentStatus", payment);
    if (fulfillment !== "ALL") sp.set("fulfillment", fulfillment);
    if (debouncedQ.trim()) sp.set("q", debouncedQ.trim());
    api
      .get<OrderRow[]>(`/api/orders?${sp.toString()}`)
      .then((r) => {
        setOrders(r.data);
        setMeta(
          (r.meta as { total: number; totalPages: number }) ?? {
            total: r.data.length,
            totalPages: 1,
          },
        );
      })
      .catch(() => setError(true));
  }, [businessId, status, payment, fulfillment, debouncedQ, page, reloadKey]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="الطلبات"
        /* Phase 6 (route grammar): the operational count moved from the
           subtitle to the MONO meta line and the header row ends in the
           quiet route divider — the same adoption as products. */
        meta={<span>{meta.total} طلب</span>}
        divider
        actions={
          <>
            {/* W6-B7: the arrival-sound toggle — aria-pressed carries the
                state, the label speaks the effect (never just an icon). */}
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
                  setStatus("NEW");
                  setPage(1);
                  setNewCount(0);
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
                setStatus("ALL");
                setPayment("ALL");
                setFulfillment("ALL");
                setQ("");
                setPage(1);
              }}
            >
              <RotateCcw className="size-4 me-1.5" aria-hidden="true" />
              تصفير الفلاتر
            </Button>
          </>
        }
      />

      {/* Filters — canonical underline tabs (status) + toolbar */}
      <div className="flex flex-col gap-3">
        <UnderlineTabs
          label="فلترة حالة الطلب"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
            /* P37 (B5-c): entering «جديد» IS the review — clear the
               badge here (was an effect on [status]). The badge button
               already resets on its own click. */
            if (v === "NEW") setNewCount(0);
          }}
          items={STATUS_TABS}
        />
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
              aria-label="بحث في الطلبات"
            />
          </div>
          <Select
            value={payment}
            onValueChange={(v) => {
              setPayment(v);
              setPage(1);
            }}
          >
            <SelectTrigger
              className="w-36 bg-card"
              aria-label="فلترة حالة الدفع"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">كل حالات الدفع</SelectItem>
              <SelectItem value="UNPAID">غير مدفوع</SelectItem>
              <SelectItem value="PAID">مدفوع</SelectItem>
              <SelectItem value="REFUNDED">مسترجع</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={fulfillment}
            onValueChange={(v) => {
              setFulfillment(v);
              setPage(1);
            }}
          >
            <SelectTrigger
              className="w-36 bg-card"
              aria-label="فلترة نوع الطلب"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">توصيل واستلام</SelectItem>
              <SelectItem value="DELIVERY">توصيل</SelectItem>
              <SelectItem value="PICKUP">استلام</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List */}
      {error ? (
        <ErrorState retry={() => setReloadKey((k) => k + 1)} />
      ) : orders === null ? (
        /* r131 (F3, A5 P2-7): shape-matched — toolbar + table shell
 (desktop) + card list (mobile), not generic h-16 bars. */
        <div role="status" aria-live="polite" aria-busy="true">
          <span className="sr-only">جارٍ تحميل الطلبات…</span>
          <ToolbarSkeleton />
          <div className="mt-5">
            <TableSkeleton rows={6} />
            <CardListSkeleton rows={4} />
          </div>
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="لا توجد طلبات مطابقة"
          description={
            status !== "ALL"
              ? "جرّب تغيير الفلاتر أو اعرض كل الطلبات"
              : "سيظهر هنا كل طلب يستلمه متجرك"
          }
          action={
            status !== "ALL" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatus("ALL");
                  setPage(1);
                }}
              >
                عرض كل الطلبات
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop table — canonical: 11px muted headers on
 surface-2, 13px cells, quiet zebra wash + hidden row-actions
 reveal + 2px first-cell accent dot on hover (Madarek §3.5).
 r131 (F3, A7): scope=col on every column header + sr-only
 caption (screen-reader table semantics); uppercase dropped
 (no-op on Arabic, banned by the family type laws). */}
          <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-[13px]">
              <caption className="sr-only">
                طلبات المتجر حسب الفلاتر المحددة
              </caption>
              <thead>
                <tr className="border-b border-border bg-muted text-muted-foreground text-[11px] font-semibold">
                  <th
                    scope="col"
                    className="text-start font-semibold px-4 py-3"
                  >
                    رقم الطلب
                  </th>
                  <th
                    scope="col"
                    className="text-start font-semibold px-4 py-3"
                  >
                    العميل
                  </th>
                  <th
                    scope="col"
                    className="text-start font-semibold px-4 py-3"
                  >
                    النوع
                  </th>
                  <th
                    scope="col"
                    className="text-start font-semibold px-4 py-3"
                  >
                    الحالة
                  </th>
                  <th
                    scope="col"
                    className="text-start font-semibold px-4 py-3"
                  >
                    الدفع
                  </th>
                  <th
                    scope="col"
                    className="text-start font-semibold px-4 py-3"
                  >
                    الإجمالي
                  </th>
                  <th
                    scope="col"
                    className="text-start font-semibold px-4 py-3"
                  >
                    التاريخ
                  </th>
                  <th scope="col" className="w-10" aria-label="تفاصيل" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    className="group/row transition-colors hover:bg-muted/40"
                  >
                    <td className="relative px-4 py-3 font-semibold tabular-nums font-mono before:pointer-events-none before:absolute before:start-0 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:origin-center before:scale-y-0 before:rounded-e-sm before:bg-primary before:transition-transform before:duration-(--t-slow) before:ease-spring-soft group-hover/row:before:scale-y-100">
                      <Link
                        href={`/dashboard/orders/${o.id}`}
                        className="hover:text-accent-foreground"
                      >
                        {o.orderNumber}
                      </Link>
                      {/* W6-B7: the confirm flag — compact mint glyph beside
                          the number (the full badge lives on order detail);
                          title carries the timestamp, the aria-label speaks
                          it to screen readers. */}
                      {o.customerConfirmedAt && (
                        <span
                          className="ms-1.5 inline-flex align-middle text-(--c-mint-deep)"
                          title={`تأكيد العميل: ${formatArabicDateTime(o.customerConfirmedAt)}`}
                        >
                          <BadgeCheck
                            className="size-4"
                            aria-label="مؤكد من العميل"
                            role="img"
                          />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="truncate max-w-36">{o.customerName}</div>
                      {/* Phase 6: phones ride IBM Plex Mono (dir=ltr kept
                          for the LTR digit run). */}
                      <div
                        className="text-xs text-muted-foreground font-mono tabular-nums"
                        dir="ltr"
                      >
                        {o.customerPhone}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {FULFILLMENT_AR[o.fulfillmentType]}
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3">
                      <PaymentStatusBadge status={o.paymentStatus} />
                    </td>
                    <td className="px-4 py-3 font-bold font-mono tabular-nums">
                      {formatLyd(o.total)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap font-mono tabular-nums">
                      {formatArabicDateTime(o.createdAt)}
                    </td>
                    <td className="px-2 opacity-0 transition-opacity duration-(--t-fast) group-hover/row:opacity-100 focus-within:opacity-100">
                      <Link
                        href={`/dashboard/orders/${o.id}`}
                        aria-label={`تفاصيل الطلب ${o.orderNumber}`}
                      >
                        <ArrowLeft
                          className="size-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePagination
              page={page}
              totalPages={meta.totalPages}
              total={meta.total}
              unitLabel="طلب"
              onPageChange={setPage}
            />
          </div>

          {/* Mobile cards */}
          <ul className="md:hidden space-y-2.5">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/dashboard/orders/${o.id}`}
                  className="block rounded-xl border border-border bg-card p-4 active:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold tabular-nums font-mono">
                      {o.orderNumber}
                      {o.customerConfirmedAt && (
                        <span
                          className="ms-1.5 inline-flex align-middle text-(--c-mint-deep)"
                          title={`تأكيد العميل: ${formatArabicDateTime(o.customerConfirmedAt)}`}
                        >
                          <BadgeCheck
                            className="size-4"
                            aria-label="مؤكد من العميل"
                            role="img"
                          />
                        </span>
                      )}
                    </span>
                    <OrderStatusBadge status={o.status} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground truncate">
                      {o.customerName}
                    </span>
                    <span className="font-bold font-mono tabular-nums">
                      {formatLyd(o.total)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{FULFILLMENT_AR[o.fulfillmentType]}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums font-mono">
                      {formatArabicDateTime(o.createdAt)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Mobile pagination */}
          {meta.totalPages > 1 && (
            <TablePagination
              className="md:hidden rounded-xl border border-border bg-card"
              page={page}
              totalPages={meta.totalPages}
              total={meta.total}
              unitLabel="طلب"
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
