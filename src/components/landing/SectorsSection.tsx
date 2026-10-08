import { Globe } from "lucide-react";
import { RevealCssClass } from "@/hooks/useReveal";
import {
  SectorsConstellation,
  type SectorPin,
} from "@/components/landing/SectorsConstellation";

/* r128 Stage B (F4b) — Chapter 01 «الاكتشاف»: the sectors constellation
 * (colleges→products→SECTORS per PORT-KIT §6). The sky chart is a static
 * SVG (dashed hairline rings) + DOM overlay dots with CSS-only tooltips;
 * the real names live in the pins, the mobile chips strip and the note.
 * Content = the clients section's REAL registry: the five sectors the
 * shipped partners actually operate (مطاعم، مقاهي، بيتزيريا، برغر،
 * متاجر تجزئة) with honest per-sector counts — nothing invented.
 *
 * r129 (F4) geometry discipline (audit S-13): pins are ON-RING pure
 * trigonometry now (ring index + angle → SectorsConstellation computes
 * the position on the ring's exact radius — the former hand-placed
 * percentages floated 145/220/188px off-track vs the 130/200/270
 * radii), and the stage carries the canonical resting-life cycle. */

const LIME_DOT = "var(--ln-lime)";
const DIM_DOT = "rgba(245,243,231,0.45)";

/** The five real sectors — every pin traces to a shipped partner.
 * ring/angle: pure trig — distance from the stage center (500,320)
 * equals the ring radius exactly; per-ring phases keep every pin on a
 * distinct ray (canonical CollegeConstellation discipline). */
const SECTORS: SectorPin[] = [
  { name: "مطاعم", partners: "مطعم الأصيل · Kubaba", count: "02", ring: 0, angle: 220, dot: LIME_DOT },
  { name: "مقاهي", partners: "SOHO · Empire", count: "02", ring: 0, angle: 320, dot: LIME_DOT },
  { name: "بيتزيريا", partners: "Telepizza · بيتزا روما", count: "02", ring: 1, angle: 168, dot: LIME_DOT },
  { name: "برغر", partners: "The Cheese", count: "01", ring: 1, angle: 12, dot: LIME_DOT },
  { name: "متاجر تجزئة", partners: "متجر الواحة", count: "01", ring: 2, angle: 90, dot: DIM_DOT },
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
          {/* the sky chart — dashed hairline rings, flat violet heart;
              client island: on-ring pins + the 4s resting-life cycle
              (RM-gated, offscreen-paused) */}
          <SectorsConstellation sectors={SECTORS} />

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
