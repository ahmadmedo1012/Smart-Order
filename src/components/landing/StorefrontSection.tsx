import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RevealCssClass } from "@/hooks/useReveal";
import { StorefrontScene } from "@/components/landing/storefront-scene";

/* r142 «الخط» — StorefrontSection «متجر يعمل فوراً» (chapter 02):
 * the working store, not a promise about one. The client scene island
 * runs the REAL storefront UI on the phone (categories, products with
 * د.ل prices, cart bar, WhatsApp send) beside the scan-to-order QR
 * plate and the customer cart with the real local payment methods.
 * Server chapter shell: zero JS beyond the one island. */

const PROOF = [
  {
    title: "يفتح في نفس الجلسة",
    desc: "تسجيل بأقل من دقيقتين، ثم منتجات بصور وأسعار من الهاتف — متجرك يعمل قبل أن تُغلق التبويب.",
  },
  {
    title: "يستقبل من كل مكان",
    desc: "الطلبات تصل من رابط متجرك أو واتساب — بصور وملاحظات وعنوان، بلا مكالمات ولا قص ولصق.",
  },
  {
    title: "بمناطق ورسوم واضحة",
    desc: "عرّف مناطق التوصيل ورسوم كل منطقة — العميل يرى قيمة التوصيل قبل أن يؤكد طلبه.",
  },
];

export function StorefrontSection() {
  return (
    <section id="store" className="ln-chapter ln-store">
      <div className="ln-chapter-head">
        <span className="ln-route-stop" data-route-stop aria-hidden="true" />
        <span className="ln-label">{'02 — المتجر'}</span>
        <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
          متجر يعمل فوراً، <em>لا وعد عن متجر</em>
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
          هذا هو المتجر كما يراه عميلك: صفحة منتجات بأسعارها، سلة تُبنى
          مباشرة، وطلب يُرسل إلى لوحتك في اللحظة نفسها.
        </RevealCssClass>
      </div>

      <RevealCssClass as="div" delay={2}>
        <StorefrontScene />
      </RevealCssClass>

      <RevealCssClass as="div" delay={3}>
        <ul className="ln-store-proof">
          {PROOF.map((p) => (
            <li key={p.title} className="ln-store-proof-item ln-bracket">
              <strong>{p.title}</strong>
              <span>{p.desc}</span>
            </li>
          ))}
        </ul>
      </RevealCssClass>

      <RevealCssClass as="div" delay={4}>
        <div className="ln-store-cta">
          <Link href="/store/demo-store" className="ln-btn-ghost">
            افتح المتجر التجريبي كامل الشاشة
            <ArrowLeft size={15} aria-hidden="true" />
          </Link>
        </div>
      </RevealCssClass>
    </section>
  );
}
