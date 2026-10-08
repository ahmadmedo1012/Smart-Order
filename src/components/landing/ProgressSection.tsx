"use client";

import { RevealCssClass } from "@/hooks/useReveal";
import { useSectionProgress } from "@/hooks/useSectionProgress";
import { CountUp } from "@/components/ui/CountUp";

/* r128 Stage B (F4b) — Chapter 03 «التقدّم»: the progress story
 * (PORT-KIT §5, smart-link ProgressSection anatomy). A SECOND
 * useSectionProgress instance scrubs the expanding ring system (scale /
 * ring opacity / violet core growth / milestone ignition, all pure CSS
 * on --sp), while CountUp carries the platform's REAL figures:
 * the two live DB counts the home has published since r126 (stores,
 * orders — the family honesty policy: no invented numbers), the three
 * cities the shipped testimonials name (طرابلس · بنغازي · مصراتة), and
 * the honest registration time (FAQ: «أقل من دقيقتين»).
 * NEVER Madarek's numbers. */

export function ProgressSection({
  stores,
  orders,
}: {
  stores: number;
  orders: number;
}) {
  /* the second --sp — written on #progress, consumed by the ring system. */
  const ref = useSectionProgress<HTMLElement>();

  const stats = [
    {
      value: stores > 0 ? `+${stores}` : `${stores}`,
      label: "متجر مسجل",
      note: "يستخدمون المتجر الرقمي على المنصّة",
    },
    {
      value: orders > 0 ? `+${orders}` : `${orders}`,
      label: "طلب مستقبَل",
      note: "طلبات منظمة وصلت أصحاب المتاجر",
    },
    { value: "3", label: "مدن", note: "طرابلس · بنغازي · مصراتة" },
    { value: "2", label: "دقيقة للتسجيل", note: "التسجيل يستغرق أقل من دقيقتين" },
  ];

  return (
    <section id="progress" ref={ref} className="ln-chapter ln-progress">
      <div className="ln-progress-grid">
        <div className="ln-progress-visual" aria-hidden="true">
          <div className="ln-progress-orbits">
            {/* expanding orbit system — scale / ring opacity / core growth /
                milestone ignition are all scrubbed by the section's --sp */}
            <span className="ln-progress-ring r0" />
            <span className="ln-progress-ring r1" />
            <span className="ln-progress-ring r2" />
            <span className="ln-progress-ring r3" />
            <span className="ln-progress-core" />
            <span className="ln-progress-milestone m0" />
            <span className="ln-progress-milestone m1" />
            <span className="ln-progress-milestone m2" />
            <span className="ln-progress-milestone m3" />
            <span className="ln-progress-label"><span className="ln-mono">GROW · الطلبات تتزايد</span></span>
          </div>
        </div>

        <div className="ln-progress-copy">
          <span className="ln-label">{"03 — التقدّم"}</span>
          <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
            متجرك يكبر مع <em>كلّ طلب</em>
          </RevealCssClass>
          <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
            إيراد اليوم ومتوسط الطلب وعملاء جدد وأداء الأسبوع على شاشة
            واحدة — أرقام تفهمها، من لوحة تحكم عربية، بصياغة تخدم قرارك.
          </RevealCssClass>

          <div className="ln-progress-stats">
            {stats.map((s, i) => (
              <RevealCssClass as="div" className="ln-stat" key={s.label} delay={(i + 1) as 1 | 2 | 3 | 4}>
                <div className="ln-stat-value"><CountUp value={s.value} /></div>
                <div className="ln-stat-label">{s.label}</div>
                <div className="ln-stat-note">{s.note}</div>
              </RevealCssClass>
            ))}
          </div>

          <RevealCssClass as="p" className="ln-progress-source" delay={4}>
            أرقام حقيقية — المتاجر والطلبات من قاعدة بيانات المنصّة لحظة فتح
            هذه الصفحة، لا أرقام تسويقية.
          </RevealCssClass>
        </div>
      </div>
    </section>
  );
}
