'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { RevealCssClass } from '@/hooks/useReveal';
import { TRACKING_FLOW, ORDER_STATUS_AR, type OrderStatus } from '@/lib/constants';

/* r141 (task 3-a) — OrderJourneySection «رحلة الطلب»: Smart-Order's own
 * logistics chapter — the customer order's REAL lifecycle drawn as a
 * moving route.
 *
 * Truthful by construction (family honesty doctrine):
 *   · The six stages are the REAL tracking flow — imported from
 *     `@/lib/constants` (TRACKING_FLOW + ORDER_STATUS_AR), the exact
 *     same source the customer tracking page and the owner timeline
 *     render. Nothing invented.
 *   · Stage blurbs describe only shipped capabilities: the web store +
 *     WhatsApp intake (NEW), owner confirmation (CONFIRMED), kitchen
 *     prep (PREPARING), pickup-ready (READY), delivery zones routing
 *     (OUT_FOR_DELIVERY), local payment at the door (DELIVERED — COD is
 *     a real payment method in lib/constants).
 *
 * Mechanics: a WAI-ARIA tablist (roving tabindex, RTL arrow mapping —
 * ArrowRight walks toward the journey's START because the route flows
 * right→left), an SVG route (store gate right → home gate left) with a
 * CSS package marker riding `offset-path`; clicking a stage eases the
 * marker to that stage's distance and lights the leg. The package
 * marker is decorative (aria-hidden) — the STATUS CARD carries the
 * information. Everything dies under prefers-reduced-motion (the
 * marker jumps, no easing — landing.css §r141-ship).
 */

type Stage = {
  key: OrderStatus;
  blurb: string;
  cue: string;
};

/* Per-stage copy — every line maps to a shipped capability (no invented
 * live maps, no courier integrations: the route is a diagram of the
 * state machine, and the caption under the stage says so). Keyed by the
 * FULL OrderStatus union; the journey below derives from TRACKING_FLOW,
 * so the tabs can never drift from the real tracking order. */
const STAGE_COPY: Record<OrderStatus, Stage> = {
  NEW: {
    key: 'NEW',
    blurb: 'الطلب يصل لحظة إرساله من متجرك الرقمي أو واتساب — بصوره وملاحظاته وعنوانه، بلا مكالمات ولا قص ولصق.',
    cue: 'متجر يعمل فوراً',
  },
  CONFIRMED: {
    key: 'CONFIRMED',
    blurb: 'تؤكد الطلب من لوحة التحكم بضغطة واحدة — وينقص من قائمة طلباتك الجديدة فوراً.',
    cue: 'لوحة تحكم واحدة',
  },
  PREPARING: {
    key: 'PREPARING',
    blurb: 'المطبخ أو المخزن يبدأ التجهيز والعميل يرى الحالة تتحدث هي أيضاً — لا أحد يسأل «وين وصلني؟».',
    cue: 'تتبّع حي للحالة',
  },
  READY: {
    key: 'READY',
    blurb: 'الطلب جاهز — للتيك أوي يستلمه العميل من الكاشير، وللتوصيل ينتظر السائق.',
    cue: 'داخل المكان · سفري',
  },
  OUT_FOR_DELIVERY: {
    key: 'OUT_FOR_DELIVERY',
    blurb: 'خرج للتوصيل ضمن مناطقك المعرّفة مسبقاً برسوم واضحة — العميل يعرف قيمة التوصيل قبل أن يطلب.',
    cue: 'مناطق توصيل',
  },
  DELIVERED: {
    key: 'DELIVERED',
    blurb: 'وصل لباب العميل — والدفع يتم محلياً: نقداً عند التسليم أو بالطرق الليبية المتاحة لديك.',
    cue: 'مدفوعات ليبية',
  },
  /* unreachable inside the journey (TRACKING_FLOW never routes here) —
     present only to satisfy the full union; kept honest and short. */
  CANCELLED: { key: 'CANCELLED', blurb: 'أُلغي الطلب.', cue: '—' },
  REJECTED: { key: 'REJECTED', blurb: 'رُفض الطلب.', cue: '—' },
};

/* THE journey = the REAL tracking flow (lib/constants) — same order the
 * customer tracking page and the owner timeline render. */
const STAGES: Stage[] = TRACKING_FLOW.map((key) => STAGE_COPY[key]);

const COUNT = STAGES.length;

export function OrderJourneySection() {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const routeWrapRef = useRef<HTMLDivElement | null>(null);
  const routePathRef = useRef<SVGPathElement | null>(null);
  const packageRef = useRef<HTMLSpanElement | null>(null);

  const stage = STAGES[active];
  const progress = active / (COUNT - 1);

  /* The package marker rides the SAME SVG path the route is drawn with —
   * positioned via getPointAtLength + the SVG's screen CTM, so it stays
   * glued to the drawn line at any container width and in RTL (screen
   * coordinates are physical, direction-agnostic). JS only sets
   * left/top; the CSS transition eases the move (RM kills it). Decorative:
   * hidden until first placement, aria-hidden forever. */
  useEffect(() => {
    const path = routePathRef.current;
    const wrap = routeWrapRef.current;
    const pkg = packageRef.current;
    if (!path || !wrap || !pkg) return;
    const len = path.getTotalLength();
    const pt = path.getPointAtLength(progress * len);
    const svg = path.ownerSVGElement;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    const wrapRect = wrap.getBoundingClientRect();
    if (!ctm || !wrapRect.width) return;
    const sx = ctm.a; // uniform scale (viewBox → px)
    const x = pt.x * sx + ctm.e - wrapRect.left;
    const y = pt.y * sx + ctm.f - wrapRect.top;
    pkg.style.left = `${x}px`;
    pkg.style.top = `${y}px`;
    pkg.style.opacity = '1';
  }, [progress, active]);

  /* WAI-ARIA tabs — RTL mapping: the visually-right tab is the EARLIER
   * stage (route flows right→left), so ArrowRight goes back one stage. */
  const onTablistKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = (active - 1 + COUNT) % COUNT;
    else if (e.key === 'ArrowLeft') next = (active + 1) % COUNT;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = COUNT - 1;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section id="order-journey" className="ln-chapter ln-ship">
      <div className="ln-chapter-head">
        <span className="ln-label">{'02+ — الطريق'}</span>
        <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
          رحلة الطلب: <em>من «جديد» إلى باب العميل</em>
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
          نفس المراحل التي يراها صاحب المتجر في لوحته وعملاؤه في صفحة التتبّع —
          جرّبها بنفسك: اختر مرحلة وشاهد الطلب يتحرك على الطريق.
        </RevealCssClass>
      </div>

      <RevealCssClass as="div" delay={2}>
        <div
          className="ln-ship-tabs"
          role="tablist"
          aria-label="مراحل الطلب"
          onKeyDown={onTablistKeyDown}
        >
          {STAGES.map((s, i) => (
            <button
              key={s.key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`ln-ship-tab-${s.key}`}
              aria-selected={i === active}
              aria-controls="ln-ship-panel"
              tabIndex={i === active ? 0 : -1}
              className={`ln-ship-tab${i <= active ? ' is-passed' : ''}${i === active ? ' is-active' : ''}`}
              onClick={() => setActive(i)}
            >
              <span className="ln-ship-tab-dot" aria-hidden="true" />
              <span className="ln-ship-tab-label">{ORDER_STATUS_AR[s.key]}</span>
              <span className="ln-ship-tab-cue ln-mono" aria-hidden="true">
                {s.cue}
              </span>
            </button>
          ))}
        </div>

        <div
          id="ln-ship-panel"
          role="tabpanel"
          aria-labelledby={`ln-ship-tab-${stage.key}`}
          tabIndex={0}
          className="ln-ship-panel"
        >
          <div className="ln-ship-grid">
            {/* ── the route stage ── */}
            <div className="ln-ship-stage">
              <div className="ln-ship-route-wrap" ref={routeWrapRef}>
                <svg
                  className="ln-ship-route"
                  viewBox="0 0 640 300"
                  role="img"
                  aria-label={`مخطط رحلة الطلب — المرحلة الحالية: ${ORDER_STATUS_AR[stage.key]}`}
                >
                  {/* the route — a gentle S from the store gate (right) to
                      the home gate (left); RTL direction of travel */}
                  <path
                    className="ln-ship-route-base"
                    ref={routePathRef}
                    d="M 596 232 C 470 232, 470 150, 356 150 C 242 150, 242 68, 96 68"
                    fill="none"
                  />
                  {/* the lit leg — same path, dash-revealed by progress */}
                  <path
                    className="ln-ship-route-lit"
                    d="M 596 232 C 470 232, 470 150, 356 150 C 242 150, 242 68, 96 68"
                    fill="none"
                    pathLength={100}
                    style={{ strokeDashoffset: `${100 - progress * 100}` }}
                  />

                  {/* the store gate (journey start — right) */}
                  <g className="ln-ship-gate ln-ship-gate--store" aria-hidden="true">
                    <rect x="566" y="210" width="60" height="44" rx="10" />
                    <path d="M 578 232 l 0 -8 l 8 8 l 8 -8 l 8 8 l 8 -8 l 0 8 z" transform="translate(-4 0)" />
                    <text x="596" y="278" textAnchor="middle">المتجر</text>
                  </g>

                  {/* the home gate (journey end — left) */}
                  <g className="ln-ship-gate ln-ship-gate--home" aria-hidden="true">
                    <rect x="64" y="46" width="62" height="44" rx="10" />
                    <path d="M 95 56 l 14 12 l 0 14 l -10 0 l 0 -9 l -8 0 l 0 9 l -10 0 l 0 -14 z" />
                    <text x="95" y="118" textAnchor="middle">العميل</text>
                  </g>

                  {/* intermediate stage wells — small stations on the route */}
                  {[1, 2, 3].map((n) => (
                    <circle
                      key={n}
                      className={`ln-ship-well${n <= active ? ' is-passed' : ''}`}
                      cx={[456, 356, 242][n - 1]}
                      cy={[196, 150, 104][n - 1]}
                      r="5"
                      aria-hidden="true"
                    />
                  ))}
                </svg>

                {/* the package marker — positioned on the route path by
                    the effect above; purely decorative (the card + SVG
                    aria-label carry meaning) */}
                <span
                  className="ln-ship-package"
                  aria-hidden="true"
                  ref={packageRef}
                >
                  <span className="ln-ship-package-tape" />
                </span>
              </div>

              <div className="ln-ship-stage-media">
                <Image
                  src="/images/shipping/route.webp"
                  alt=""
                  fill
                  sizes="(max-width: 920px) 92vw, 560px"
                  className="ln-ship-stage-img"
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* ── the tracking-style status card ── */}
            <div className="ln-ship-card">
              <div className="ln-ship-card-inner" key={stage.key}>
                <span className="ln-ship-kicker ln-mono">
                  {`المرحلة ${active + 1} من ${COUNT}`}
                </span>
                <h3 className="ln-ship-status">{ORDER_STATUS_AR[stage.key]}</h3>
                <p className="ln-ship-desc">{stage.blurb}</p>
                <p className="ln-ship-note">
                  <RotateCcw size={15} aria-hidden="true" />
                  هذه آلة الحالات الحقيقية التي تشغّل لوحة التاجر وصفحة تتبّع
                  العميل في المنصّة — نفس الأسماء، نفس الترتيب.
                </p>
                <div className="ln-ship-actions">
                  <Link href="/store/demo-store" className="ln-btn-ghost ln-ship-cta-warm">
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
        </div>
      </RevealCssClass>
    </section>
  );
}
