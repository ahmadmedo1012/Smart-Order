'use client';

import { useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, Truck, User, Store, type LucideIcon } from 'lucide-react';
import { RevealCssClass } from '@/hooks/useReveal';
import { TRACKING_FLOW, ORDER_STATUS_AR, type OrderStatus } from '@/lib/constants';

/* ═══════════════════════════════════════════════════════════════════════
   P12-2d — OrderJourneySection «المحطات الست» → the ROUTE MAP.
   ─────────────────────────────────────────────────────────────────────
   The vertical road retires; the journey is now a HORIZONTAL ROUTE MAP
   (spec S4): five connected macro stops — متجر → طلب → مطبخ → مندوب →
   باب المنزل — drawn as an orange quadratic-bump route line (the same
   arc/node language as the hero globe) with mono indices 001–005.

   Truthful by construction (unchanged doctrine):
   · The REAL TRACKING_FLOW stages stay the engine — the five macro
     stops MAP onto the six real states (مطبخ carries PREPARING + READY,
     both rendered in the panel with their full real copy); nothing
     invented, nothing dropped.
   · Every stage still names WHO ACTS (الزبون / التاجر / مندوب
     التوصيل) with the action phrased from the real state machine.
   · The stop buttons keep [data-route-stop] (map-local node markers; the page
     threads the journey.

   Mechanics: WAI-ARIA horizontal tablist (roving tabindex,
   ArrowLeft/ArrowRight = next/prev in RTL, Home/End). Clicking a stop
   opens its panel; the route line dashes drift (RM: static, §P12-d).
   ═══════════════════════════════════════════════════════════════════════ */

type Actor = 'customer' | 'merchant' | 'courier';

type Stage = {
  key: OrderStatus;
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

/* Per-stage copy — every line maps to a shipped capability (preserved
 * verbatim from the r142 wave). Keyed by the FULL OrderStatus union. */
const STAGE_META: Record<OrderStatus, Stage> = {
  NEW: {
    key: 'NEW',
    blurb:
      'الطلب يصل لحظة إرساله من متجرك الرقمي أو واتساب — بصوره وملاحظاته وعنوانه، بلا مكالمات ولا قص ولصق.',
    actor: 'customer',
    action: 'يطلب من المتجر الرقمي أو يرسل الطلب عبر واتساب',
    machine: 'يظهر فوراً في قائمة الطلبات الجديدة في لوحة التاجر.',
  },
  CONFIRMED: {
    key: 'CONFIRMED',
    blurb:
      'تؤكد الطلب من لوحة التحكم بضغطة واحدة — وينقص من قائمة طلباتك الجديدة فوراً.',
    actor: 'merchant',
    action: 'يضغط «تأكيد الطلب» من لوحة الطلبات',
    machine: 'الانتقال متاح من جديد فقط — الرفض والإلغاء مساران موثّقان.',
  },
  PREPARING: {
    key: 'PREPARING',
    blurb:
      'المطبخ أو المخزن يبدأ التجهيز والعميل يرى الحالة تتحدث هي أيضاً — لا أحد يسأل «وين وصلني؟».',
    actor: 'merchant',
    action: 'يضغط «بدء التحضير» فيبدأ العدّ بالنسبة للعميل',
    machine: 'صفحة تتبّع العميل تستطلع الحالة كل 15 ثانية.',
  },
  READY: {
    key: 'READY',
    blurb:
      'الطلب جاهز — للتيك أوي يستلمه العميل من الكاشير، وللتوصيل ينتظر المندوب.',
    actor: 'merchant',
    action: 'يضغط «جاهز للاستلام» فيُبلَّغ العميل',
    machine: 'طلبات الاستلام تتخطى محطة الطريق للتوصيل تلقائياً.',
  },
  OUT_FOR_DELIVERY: {
    key: 'OUT_FOR_DELIVERY',
    blurb:
      'خرج للتوصيل ضمن مناطقك المعرّفة مسبقاً برسوم واضحة — العميل يعرف قيمة التوصيل قبل أن يطلب.',
    actor: 'courier',
    action: 'يوصل الطلب ضمن منطقة العميل وبرسومها المعلنة',
    machine: 'مناطق التوصيل ورسومها تُدار من لوحة التاجر (delivery.manage).',
  },
  DELIVERED: {
    key: 'DELIVERED',
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
    blurb: 'أُلغي الطلب.',
    actor: 'merchant',
    action: 'إلغاء الطلب',
    machine: 'حالة نهائية.',
  },
  REJECTED: {
    key: 'REJECTED',
    blurb: 'رُفض الطلب.',
    actor: 'merchant',
    action: 'رفض الطلب',
    machine: 'حالة نهائية.',
  },
};

/* THE journey = the REAL tracking flow (lib/constants). The FIVE macro
 * stops map the six real stages onto the route map (مطبخ carries both
 * PREPARING + READY — the panel renders each with its full real copy). */
type Stop = {
  key: string;
  index: string;
  name: string;
  stages: OrderStatus[];
};

const STOPS: Stop[] = [
  { key: 'store', index: '001', name: 'متجر', stages: ['NEW'] },
  { key: 'order', index: '002', name: 'طلب', stages: ['CONFIRMED'] },
  { key: 'kitchen', index: '003', name: 'مطبخ', stages: ['PREPARING', 'READY'] },
  { key: 'courier', index: '004', name: 'مندوب', stages: ['OUT_FOR_DELIVERY'] },
  { key: 'door', index: '005', name: 'باب المنزل', stages: ['DELIVERED'] },
];
const COUNT = STOPS.length;
/* the six real stages, in TRACKING_FLOW order — panel kickers ride this */
const FLOW_INDEX: Record<OrderStatus, number> = Object.fromEntries(
  TRACKING_FLOW.map((k, i) => [k, i + 1]),
) as Record<OrderStatus, number>;
const FLOW_TOTAL = TRACKING_FLOW.length;

/* the route line — quadratic bumps between the five stop centers
 * (viewBox 1000×128 maps 1:1 onto the fixed 128px row; dot centers y=32) */
const ROUTE_PATH =
  'M 100 32 Q 200 6 300 32 Q 400 6 500 32 Q 600 6 700 32 Q 800 6 900 32';

export function OrderJourneySection() {
  const [active, setActive] = useState(0);
  const stop = STOPS[active]!;
  const stages = stop.stages.map((k) => STAGE_META[k]!);

  /* WAI-ARIA horizontal tabs — the route flows right→left (RTL), so
   * ArrowLeft walks forward along the journey. */
  const onTablistKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (e.key === 'ArrowLeft') next = (active + 1) % COUNT;
    else if (e.key === 'ArrowRight') next = (active - 1 + COUNT) % COUNT;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = COUNT - 1;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    document.getElementById(`ln-stop-tab-${STOPS[next]!.key}`)?.focus();
  };

  return (
    <section id="stations" className="ln-chapter ln-stations">
      <div className="ln-chapter-head">
        {/* the route station node — chapter 01 on the line */}
        <span className="ln-micro" aria-hidden="true">{"SMART ORDER — 001 · ROUTE"}</span>
        {/* P13-2d (T2): the map has FIVE stops (STOPS:001-005) and the lede
            already says «خمس محطات» — the chapter label was the lone «الست»
            holdout. The panel counter «المرحلة N من 6» stays truthful: it
            counts the six REAL TRACKING_FLOW stages (kitchen carries both
            PREPARING + READY). */}
        <span className="ln-label">{'01 — المحطات الخمس'}</span>
        <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
          الطريق من «جديد» <em>إلى باب العميل</em>
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
          خمس محطات على خطٍّ واحد — متجر، طلب، مطبخ، مندوب، باب المنزل —
          نفس المراحل التي يراها صاحب المتجر في لوحته وعملاؤه في صفحة
          التتبّع. اختر محطة لتعرف ماذا يحدث ومَن يتصرف.
        </RevealCssClass>
      </div>

      <RevealCssClass as="div" delay={2}>
        {/* ── the horizontal ROUTE MAP (the spine threads THESE buttons —
            data-route-stop) ── */}
        <div className="ln-routemap">
          {/* two route geometries: the horizontal map (≥768px) and the
              VERTICAL variant (≤767px — nodes stack on a rail, the line
              still threads them; spec S4: no horizontal squeeze) */}
          <svg
            className="ln-routemap-svg ln-routemap-svg-h"
            viewBox="0 0 1000 128"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path className="ln-routemap-path" d={ROUTE_PATH} />
          </svg>
          <svg
            className="ln-routemap-svg ln-routemap-svg-v"
            viewBox="0 0 12 600"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              className="ln-routemap-path"
              d="M 6 2 C 11 130, 1 260, 6 390 C 11 500, 1 560, 6 598"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div
            className="ln-routemap-row"
            role="tablist"
            aria-label="مراحل الطلب على الخط"
            aria-orientation="horizontal"
            onKeyDown={onTablistKeyDown}
          >
            {STOPS.map((s, i) => {
              const stageCode = s.stages.join('·');
              return (
                <button
                  key={s.key}
                  type="button"
                  role="tab"
                  id={`ln-stop-tab-${s.key}`}
                  aria-selected={i === active}
                  aria-controls="ln-stations-panel"
                  tabIndex={i === active ? 0 : -1}
                  data-route-stop
                  data-stage={s.stages[0]}
                  className={`ln-routemap-node${i < active ? ' is-passed' : ''}${i === active ? ' is-active' : ''}`}
                  onClick={() => setActive(i)}
                >
                  <span className="ln-routemap-idx" aria-hidden="true">
                    {s.index}
                  </span>
                  <span className="ln-routemap-dot" aria-hidden="true" />
                  <span className="ln-routemap-name">{s.name}</span>
                  <span className="ln-routemap-sub" aria-hidden="true">
                    {stageCode}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── the detail panel — what happens + WHO ACTS (all six real
            stages preserved; مطبخ renders PREPARING + READY together) ── */}
        <div
          id="ln-stations-panel"
          role="tabpanel"
          aria-labelledby={`ln-stop-tab-${stop.key}`}
          tabIndex={0}
          className="ln-stations-panel"
        >
          {stages.map((stage) => {
            const ActorIcon = ACTOR_ICON[stage.actor];
            return (
              <div className="ln-stations-panel-inner ln-bracket" key={stage.key}>
                <p className="ln-mono ln-stations-kicker">
                  {`المرحلة ${FLOW_INDEX[stage.key]} من ${FLOW_TOTAL}`}
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
                </div>

                <p className="ln-stations-note">
                  <RotateCcw size={15} aria-hidden="true" />
                  {stage.machine}
                </p>
              </div>
            );
          })}

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
      </RevealCssClass>
    </section>
  );
}
