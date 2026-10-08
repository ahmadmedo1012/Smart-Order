import { Store, ClipboardList, MessageCircle } from "lucide-react";
import { RevealCssClass } from "@/hooks/useReveal";

/* r128 Stage B (F4b) — Chapter 05 «الأدوار»: the roles ledger
 * (canonical LandingPage.tsx:616 anatomy, smart-link RolesSection
 * form). Smart-Order's three real audience segments — the store owner,
 * the store staff, and the customer. Desc lines fold shipped copy from
 * the features bento + FAQ; the owner quote is verbatim from the
 * clients section (أحمد المبروك، متجر الواحة). */

const ROLES = [
  {
    icon: Store, tone: "gold", name: "صاحب المتجر", index: "01",
    desc: "متجرك بصورك وأسعارك ومناطق توصيلك — وإيراد اليوم ومتوسط الطلب وعملاء جدد على شاشة واحدة.",
    quote: "الزبائن صاروا يطلبون مباشرة من المتجر دون الاتصال بنا. الطلبات تصل مرتبة وواضحة.",
    cite: "أحمد المبروك — متجر الواحة، طرابلس",
  },
  {
    icon: ClipboardList, tone: "azure", name: "فريق المتجر", index: "02",
    desc: "حالات موحدة من الاستلام حتى التسليم مع سجل زمني وتنبيهات لما يحتاج انتباهك الآن.",
    quote: "كل طلب يصل فوراً إلى لوحة التحكم مع تنبيه — لا ورقة ضائعة ولا طلب منسي.",
    cite: "إدارة الطلبات — لوحة التحكم",
  },
  {
    icon: MessageCircle, tone: "mist", name: "عميلك", index: "03",
    desc: "يطلب من رابط متجرك بدون تطبيق ولا تسجيل، ويرى الإجمالي فوراً بأحجام وإضافات ما يختاره.",
    quote: "رسالة طلب منسقة عبر واتساب بضغطة واحدة، وتتبع مباشر لحالة الطلب عبر رابط خاص.",
    cite: "تجربة العميل — من الهاتف",
  },
];

export function RolesSection() {
  return (
    <section id="roles" className="ln-chapter ln-roles">
      <div className="ln-chapter-head">
        <span className="ln-label">{"05 — الأدوار"}</span>
        <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
          ثلاثة أدوار <em>ومتجرٌ واحد</em>
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
          ما يقوله أصحاب المتاجر عن إدارة الطلبات والتوصيل يومياً — كل دور
          يجد أدواته جاهزة بالعربية.
        </RevealCssClass>
      </div>

      <ul className="ln-roles-list">
        {ROLES.map((r, i) => (
          <RevealCssClass as="li" key={r.name} className="ln-role-row" delay={(i + 1) as 1 | 2 | 3}>
            <span className="ln-role-key">
              <span className={`ln-role-ico ${r.tone}`} aria-hidden="true">
                <r.icon size={26} strokeWidth={1.7} />
              </span>
              <span className="ln-role-name">{r.name}</span>
              <span className="ln-role-index ln-mono">{r.index}</span>
            </span>
            <div>
              <p className="ln-role-desc">{r.desc}</p>
              <blockquote className="ln-role-quote">
                <span className="ln-role-quote-mark" aria-hidden="true">”</span>
                {r.quote}
              </blockquote>
              <span className="ln-role-cite ln-mono">{r.cite}</span>
            </div>
          </RevealCssClass>
        ))}
      </ul>
    </section>
  );
}
