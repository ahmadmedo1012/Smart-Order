'use client';

import { useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RotateCcw,
  ClipboardList,
  BadgeCheck,
  Clock,
  PackageCheck,
  Truck,
  Home,
  User,
  Store,
  type LucideIcon,
} from 'lucide-react';
import { RevealCssClass } from '@/hooks/useReveal';
import { TRACKING_FLOW, ORDER_STATUS_AR, type OrderStatus } from '@/lib/constants';

/* ═══════════════════════════════════════════════════════════════════════
   r142 «الخط» — OrderJourneySection «المحطات الست»:
   the page's first station chapter — the order's REAL lifecycle as an
   interactive vertical road the spine itself threads through.

   Truthful by construction (family honesty doctrine, carried from r141):
   · The six stations ARE the real tracking flow — derived from
     `TRACKING_FLOW` (lib/constants), the same source the customer
     tracking page and the owner timeline render. Nothing invented.
   · Every stage names WHO ACTS — الزبون / التاجر / مندوب التوصيل —
     with the action phrased from the real state machine (lib/
     order-machine.ts transition labels: تأكيد الطلب، بدء التحضير،
     جاهز للاستلام، خرج للتوصيل، تم التسليم) and real intake channels
     (المتجر الرقمي + واتساب). مندوب التوصيل is the code's own term
     (PAYMENT_TYPE_DESCRIPTIONS: «ادفع نقداً لمندوب التوصيل»).
   · Stage colors ride the product's real status-chip families
     (status-badges.tsx: NEW→copper, CONFIRMED/OUT→sky, PREPARING→
     yellow, READY→copper, DELIVERED→mint) — the same --c-* tokens.

   Mechanics: a WAI-ARIA vertical tablist (roving tabindex, ArrowUp/
   ArrowDown/Home/End) — clicking a station opens its detail panel and
   lights its sign on the line. The page-level spine (RouteSpine)
   anchors on these very buttons ([data-route-stop]), so the road
   literally runs through the six states. Everything stands still under
   prefers-reduced-motion (no autonomous motion here at all).
   ═══════════════════════════════════════════════════════════════════════ */

type Actor = 'customer' | 'merchant' | 'courier';

type Stage = {
  key: OrderStatus;
  icon: LucideIcon;
  blurb: string;
  actor: Actor;
  action: string;
  machine: string;
};

const ACTOR_AR: Record<Actor, string> = {
  customer: 'الزبون',
  merchant: 'التاجر',
  courier: 'مندوب التوصيل',
};

const ACTOR_ICON: Record<Actor, LucideIcon> = {
  customer: User,
  merchant: Store,
  courier: Truck,
};

/* Per-stage copy — every line maps to a shipped capability. Keyed by
 * the FULL OrderStatus union; the journey derives from TRACKING_FLOW,
 * so the stations can never drift from the real tracking order. */
const STAGE_META: Record<OrderStatus, Stage> = {
  NEW: {
    key: 'NEW',
    icon: ClipboardList,
    blurb:
      'الطلب يصل لحظة إرساله من متجرك الرقمي أو واتساب — بصوره وملاحظاته وعنوانه، بلا مكالمات ولا قص ولصق.',
    actor: 'customer',
    action: 'يطلب من المتجر الرقمي أو يرسل الطلب عبر واتساب',
    machine: 'يظهر فوراً في قائمة الطلبات الجديدة في لوحة التاجر.',
  },
  CONFIRMED: {
    key: 'CONFIRMED',
    icon: BadgeCheck,
    blurb:
      'تؤكد الطلب من لوحة التحكم بضغطة واحدة — وينقص من قائمة طلباتك الجديدة فوراً.',
    actor: 'merchant',
    action: 'يضغط «تأكيد الطلب» من لوحة الطلبات',
    machine: 'الانتقال متاح من جديد فقط — الرفض والإلغاء مساران موثّقان.',
  },
  PREPARING: {
    key: 'PREPARING',
    icon: Clock,
    blurb:
      'المطبخ أو المخزن يبدأ التجهيز والعميل يرى الحالة تتحدث هي أيضاً — لا أحد يسأل «وين وصلني؟».',
    actor: 'merchant',
    action: 'يضغط «بدء التحضير» فيبدأ العدّ بالنسبة للعميل',
    machine: 'صفحة تتبّع العميل تستطلع الحالة كل 15 ثانية.',
  },
  READY: {
    key: 'READY',
    icon: PackageCheck,
    blurb:
      'الطلب جاهز — للتيك أوي يستلمه العميل من الكاشير، وللتوصيل ينتظر المندوب.',
    actor: 'merchant',
    action: 'يضغط «جاهز للاستلام» فيُبلَّغ العميل',
    machine: 'طلبات الاستلام تتخطى محطة الطريق للتوصيل تلقائياً.',
  },
  OUT_FOR_DELIVERY: {
    key: 'OUT_FOR_DELIVERY',
    icon: Truck,
    blurb:
      'خرج للتوصيل ضمن مناطقك المعرّفة مسبقاً برسوم واضحة — العميل يعرف قيمة التوصيل قبل أن يطلب.',
    actor: 'courier',
    action: 'يوصل الطلب ضمن منطقة العميل وبرسومها المعلنة',
    machine: 'مناطق التوصيل ورسومها تُدار من لوحة التاجر (delivery.manage).',
  },
  DELIVERED: {
    key: 'DELIVERED',
    icon: Home,
    blurb:
      'وصل لباب العميل — والدفع يتم محلياً: نقداً عند التسليم أو بالطرق الليبية المتاحة لديك.',
    actor: 'customer',
    action: 'يستلم الطلب ويدفع — والتاجر يضغط «تم التسليم» ثم يؤكد الدفع',
    machine: 'تأكيد الدفع متاح في كل الحالات غير الملغاة (canMarkPaid).',
  },
  /* unreachable inside the journey (TRACKING_FLOW never routes here) —
     present only to satisfy the full union; kept honest and short. */
  CANCELLED: {
    key: 'CANCELLED',
    icon: Clock,
    blurb: 'أُلغي الطلب.',
    actor: 'merchant',
    action: 'إلغاء الطلب',
    machine: 'حالة نهائية.',
  },
  REJECTED: {
    key: 'REJECTED',
    icon: Clock,
    blurb: 'رُفض الطلب.',
    actor: 'merchant',
    action: 'رفض الطلب',
    machine: 'حالة نهائية.',
  },
};

/* THE journey = the REAL tracking flow (lib/constants) — same order the
 * customer tracking page and the owner timeline render. */
const STAGES: Stage[] = TRACKING_FLOW.map((key) => STAGE_META[key]);
const COUNT = STAGES.length;

export function OrderJourneySection() {
  const [active, setActive] = useState(0);
  const stage = STAGES[active];
  const ActorIcon = ACTOR_ICON[stage.actor];
  const StageIcon = stage.icon;

  /* WAI-ARIA vertical tabs — the list flows top→down, so ArrowDown
   * walks forward along the journey. */
  const onTablistKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') next = (active + 1) % COUNT;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowRight') next = (active - 1 + COUNT) % COUNT;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = COUNT - 1;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    document.getElementById(`ln-station-tab-${STAGES[next]!.key}`)?.focus();
  };

  return (
    <section id="stations" className="ln-chapter ln-stations">
      <div className="ln-chapter-head">
        {/* the road station node — chapter 01 on the line */}
        <span className="ln-route-stop" data-route-stop aria-hidden="true" />
        <span className="ln-label">{'01 — المحطات الست'}</span>
        <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
          الطريق من «جديد» <em>إلى باب العميل</em>
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
          ست محطات على خطٍّ واحد — نفس المراحل التي يراها صاحب المتجر في
          لوحته وعملاؤه في صفحة التتبّع. اختر محطة لتعرف ماذا يحدث ومَن
          يتصرف.
        </RevealCssClass>
      </div>

      <RevealCssClass as="div" delay={2}>
        <div className="ln-stations-grid">
          {/* ── the vertical road of stations (the spine threads THESE
              buttons — data-route-stop) ── */}
          <div
            className="ln-stations-tabs"
            role="tablist"
            aria-label="مراحل الطلب"
            aria-orientation="vertical"
            onKeyDown={onTablistKeyDown}
          >
            <ol className="ln-stations-list">
              {STAGES.map((s, i) => {
                const Icon = s.icon;
                return (
                  <li key={s.key} className="ln-stations-item">
                    <button
                      type="button"
                      role="tab"
                      id={`ln-station-tab-${s.key}`}
                      aria-selected={i === active}
                      aria-controls="ln-stations-panel"
                      tabIndex={i === active ? 0 : -1}
                      data-route-stop
                      data-stage={s.key}
                      className={`ln-station-node${i < active ? ' is-passed' : ''}${i === active ? ' is-active' : ''}`}
                      onClick={() => setActive(i)}
                    >
                      <span className="ln-station-sign" aria-hidden="true">
                        <Icon size={20} strokeWidth={2.2} />
                      </span>
                      <span className="ln-station-name">{ORDER_STATUS_AR[s.key]}</span>
                      <span className="ln-mono ln-station-index" aria-hidden="true">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* ── the detail panel — what happens + WHO ACTS ── */}
          <div
            id="ln-stations-panel"
            role="tabpanel"
            aria-labelledby={`ln-station-tab-${stage.key}`}
            tabIndex={0}
            className="ln-stations-panel"
          >
            <div className="ln-stations-panel-inner" key={stage.key}>
              <p className="ln-mono ln-stations-kicker">
                {`المرحلة ${active + 1} من ${COUNT}`}
              </p>
              <div className="ln-stations-statusrow">
                <span className="ln-stations-chip" data-stage={stage.key}>
                  <span className="ln-stations-chip-dot" aria-hidden="true" />
                  {ORDER_STATUS_AR[stage.key]}
                </span>
                <span className="ln-mono" aria-hidden="true">
                  {`STAGE ${stage.key}`}
                </span>
              </div>
              <h3 className="ln-stations-title">{ORDER_STATUS_AR[stage.key]}</h3>
              <p className="ln-stations-desc">{stage.blurb}</p>

              <div className="ln-stations-actor">
                <span className="ln-stations-actor-ico" aria-hidden="true">
                  <ActorIcon size={18} />
                </span>
                <div className="ln-stations-actor-body">
                  <strong>مَن يتصرف: {ACTOR_AR[stage.actor]}</strong>
                  <span>{stage.action}</span>
                </div>
                <span className="ln-stations-actor-stage" aria-hidden="true">
                  <StageIcon size={15} />
                </span>
              </div>

              <p className="ln-stations-note">
                <RotateCcw size={15} aria-hidden="true" />
                {stage.machine}
              </p>

              <div className="ln-stations-actions">
                <Link href="/store/demo-store" className="ln-btn-ghost ln-stations-cta-warm">
                  جرّب متجراً حقيقياً من المنصّة
                  <ArrowLeft size={15} aria-hidden="true" />
                </Link>
                <Link href="/register" className="ln-btn-ghost">
                  ابدأ رحلتك
                </Link>
              </div>
            </div>
          </div>
        </div>
      </RevealCssClass>
    </section>
  );
}
