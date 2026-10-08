"use client";

import { Search, ShoppingBag, Send, ChefHat, Radar } from "lucide-react";
import { RevealCssClass } from "@/hooks/useReveal";
import { useSectionProgress } from "@/hooks/useSectionProgress";
import { JourneyLightPath } from "@/components/landing/JourneyLightPath";

/* r128 Stage B (F4b) — Chapter 02 «الطلب»: the 5-station journey
 * (PORT-KIT §5 skeleton, smart-link JourneySection anatomy), mapped to
 * how ordering works: browse → cart → order → kitchen → track. Every
 * station folds the home's REAL shipped copy (how-it-works 3 steps, FAQ
 * answers, features bento) — nothing invented:
 *  01 browse   — how-it-works «شارك الرابط… الطلبات تصلك» + features «متجر يبيع فعلاً»
 *  02 cart     — how-it-works «أقسام، صور، أسعار، أحجام وإضافات»
 *  03 order    — FAQ «الدفع نقداً عند الاستلام، أو تحويل عبر مدار وليبيانا» + local «واتساب قناة أساسية»
 *  04 kitchen  — FAQ «كل طلب يصل فوراً إلى لوحة التحكم مع تنبيه» + features «طلبات منظمة»
 *  05 track    — FAQ «مشاركة رابط التتبع المباشر» + features «تتبع مباشر للعميل عبر رابط خاص»
 * Client component: useSectionProgress writes --sp on the section,
 * JourneyLightPath's lit thread scrubs with it
 * (stroke-dashoffset: calc(1 - var(--sp))) — pure CSS scrub, native
 * scrolling, no hijacking. */

const STATIONS: Array<{
  n: string;
  icon: typeof Search;
  title: string;
  desc: string;
  tag: string;
}> = [
  {
    n: "01", icon: Search, title: "تصفّح المتجر",
    desc: "العميل يفتح رابط متجرك من واتساب أو فيسبوك — صفحة سريعة بصور وأسعار وأقسام، تعمل من أي رابط.",
    tag: "التصفح",
  },
  {
    n: "02", icon: ShoppingBag, title: "أضف إلى السلة",
    desc: "يختار المنتجات بأحجامها وإضافاتها ويرى الإجمالي فوراً — من هاتفه مباشرة، بدون تطبيق ولا تسجيل.",
    tag: "الاختيار",
  },
  {
    n: "03", icon: Send, title: "أرسل الطلب",
    desc: "الدفع نقداً عند الاستلام أو تحويل مدار/ليبيانا، ورسالة واتساب منسقة تصل المتجر بضغطة واحدة.",
    tag: "الطلب",
  },
  {
    n: "04", icon: ChefHat, title: "المطبخ يستقبل",
    desc: "كل طلب يصل فوراً إلى لوحة التحكم مع تنبيه — حالات موحدة من الاستلام حتى التسليم بسجل زمني.",
    tag: "الاستقبال",
  },
  {
    n: "05", icon: Radar, title: "تابع الطلب",
    desc: "رابط تتبع مباشر يشاركه العميل يعرف منه حالة طلبه لحظة بلحظة — والأخطاء أقل بكثير.",
    tag: "التتبع",
  },
];

export function JourneySection() {
  /* --sp on this section scrubs the light path (and the chapter wash). */
  const ref = useSectionProgress<HTMLElement>();

  return (
    <section id="journey" ref={ref} className="ln-chapter ln-journey">
      <div className="ln-chapter-head">
        <span className="ln-label">{"02 — الطلب"}</span>
        <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
          من التصفح إلى <em>التتبع</em> — خمس محطات
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
          خطّ ضوءٍ واحد يربط محطات طلبك؛ كل محطة تبني على ما قبلها.
        </RevealCssClass>
      </div>

      <div className="ln-journey-stage">
        {/* the light path — computed from the real station-node layout */}
        <JourneyLightPath />

        <ol className="ln-journey-stations">
          {STATIONS.map((s, i) => (
            <RevealCssClass
              as="li"
              key={s.n}
              className={`ln-station${i % 2 === 0 ? " from-start" : " from-end"}`}
              delay={(i + 1) as 1 | 2 | 3 | 4 | 5}
            >
              <article className="ln-station-card">
                <span className="ln-station-node" aria-hidden="true">
                  <span className="ln-station-node-core" />
                </span>
                <header className="ln-station-head">
                  <span className="ln-mono ln-station-n">{s.n}</span>
                  <span className="ln-station-ico" aria-hidden="true"><s.icon size={20} /></span>
                  <span className="ln-station-tag">{s.tag}</span>
                </header>
                <h3 className="ln-station-title">{s.title}</h3>
                <p className="ln-station-desc">{s.desc}</p>
              </article>
            </RevealCssClass>
          ))}
        </ol>
      </div>
    </section>
  );
}
