import { Globe } from "lucide-react";
import { RevealCssClass } from "@/hooks/useReveal";

/* r128 Stage B (F4b) — Chapter 01 «الاكتشاف»: the sectors constellation
 * (colleges→products→SECTORS per PORT-KIT §6). Server component: the sky
 * chart is a static SVG (dashed hairline rings) + DOM overlay dots with
 * CSS-only tooltips; the real names live in the pins, the mobile chips
 * strip and the note. Content = the clients section's REAL registry:
 * the five sectors the shipped partners actually operate (مطاعم، مقاهي،
 * بيتزيريا، برغر، متاجر تجزئة) with honest per-sector counts —
 * nothing invented. */

const LIME_DOT = "var(--ln-lime)";
const DIM_DOT = "rgba(245,243,231,0.45)";

/** The five real sectors — every pin traces to a shipped partner. */
const SECTORS = [
  { name: "مطاعم", partners: "مطعم الأصيل · Kubaba", count: "02", left: "38.8%", top: "35.6%", dot: LIME_DOT },
  { name: "مقاهي", partners: "SOHO · Empire", count: "02", left: "61.2%", top: "35.6%", dot: LIME_DOT },
  { name: "بيتزيريا", partners: "Telepizza · بيتزا روما", count: "02", left: "28.5%", top: "57.5%", dot: LIME_DOT },
  { name: "برغر", partners: "The Cheese", count: "01", left: "71.5%", top: "57.5%", dot: LIME_DOT },
  { name: "متاجر تجزئة", partners: "متجر الواحة", count: "01", left: "50%", top: "79.4%", dot: DIM_DOT },
];

/** The full registry for the mobile chips strip (all 5, accessible). */
const CHIPS = SECTORS.map((s) => ({ name: s.name, count: s.count, dot: s.dot }));

export function SectorsSection() {
  return (
    <section id="sectors" className="ln-chapter ln-sectors">
      <div className="ln-chapter-head">
        <span className="ln-label">{"01 — القطاعات"}</span>
        <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
          خمسة قطاعات في <em>مدارٍ واحد</em>
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
          مدار Smart Order تنتظم فيه متاجر تعمل الآن — من المطاعم والمقاهي
          إلى البيتزيريا والبرغر ومتاجر التجزئة، كلّها من متجرٍ رقمي واحد.
        </RevealCssClass>
      </div>

      <RevealCssClass as="div" delay={2}>
        <div className="ln-constellation">
          {/* the sky chart — dashed hairline rings, flat violet heart */}
          <div className="ln-constellation-stage">
            <svg className="ln-constellation-svg" viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
              <circle className="ln-constellation-ring" style={{ ["--ln-ri" as string]: 0 }} cx={500} cy={320} r={130} />
              <circle className="ln-constellation-ring" style={{ ["--ln-ri" as string]: 1 }} cx={500} cy={320} r={200} />
              <circle className="ln-constellation-ring" style={{ ["--ln-ri" as string]: 2 }} cx={500} cy={320} r={270} />
            </svg>

            {/* the sectors — decorative pins (the names live in the chips
                strip below, which is the accessible copy) */}
            {SECTORS.map((s, i) => (
              <span
                key={s.name}
                className="ln-constellation-dot"
                aria-hidden="true"
                style={{ left: s.left, top: s.top, ["--dot" as string]: s.dot, ["--ln-ci" as string]: i }}
              >
                <span className="ln-constellation-tip">
                  <b>{s.name}</b>
                  <i>{s.partners}</i>
                </span>
              </span>
            ))}
          </div>

          {/* the domain strip — carries the full registry accessibly
              (desktop keeps the sky chart; phones get these chips) */}
          <ul className="ln-constellation-strip">
            {CHIPS.map((c) => (
              <li key={c.name} className="ln-constellation-chip">
                <span className="ln-constellation-chip-dot" style={{ background: c.dot }} aria-hidden="true" />
                <span className="ln-constellation-chip-label">{c.name}</span>
                <span className="ln-constellation-chip-count">{c.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </RevealCssClass>

      <RevealCssClass as="p" className="ln-sectors-note" delay={3}>
        <Globe size={14} aria-hidden="true" />
        عربي أولاً · مصمّم لليبيا: الأسعار بالدينار بدقة القرش، مدفوعات مدار
        وليبيانا، وواتساب قناة أساسية — نظام بُني لطريقة عملنا هنا.
      </RevealCssClass>
    </section>
  );
}
