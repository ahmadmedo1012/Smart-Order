import Link from "next/link";
import { CurrentYear } from "@/components/current-year";

/* r128 Stage B (F4b) — the landing footer: the ground plate
 * (canonical landing.css:1486-1552 form, smart-link LandingFooter
 * anatomy). Real destinations only — the product footer's quick links,
 * services registry and support WhatsApp, on flat hairline rows. */

const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "218910089975";

const QUICK_LINKS = [
  { href: "/pricing", label: "الباقات" },
  { href: "/store/demo-store", label: "متجر تجريبي" },
  { href: "/login", label: "تسجيل الدخول" },
  { href: "/register", label: "اشترك الآن" },
];

const SERVICES = [
  "متجر إلكتروني",
  "إدارة الطلبات",
  "توصيل بمناطق ورسوم",
  "مدفوعات مدار وليبيانا",
  "تتبع مباشر للعميل",
];

/* (phase4 W1-SO) صف الأشقاء — المنظومة كاملة: Smart Order كان يعيش معزولاً
 * عن أخوته رغم أن JSON-LD يعلنهم (sameAs). الأوصاف من Metadata كل منتج
 * نفسه — لا ادعاءات جديدة: SmartLink «منصة رقمية متكاملة»، Smart Menu
 * «المنيو الرقمي التفاعلي»، SmartBot «منصة إدارة فيسبوك الذكية».
 * r148 (19-AUDIT-CROSS R8): وصف سمارت بوت يركب كونون الأسطول حرفياً
 * (SL LandingFooter:29 · SM:15) — كان «بوت فيسبوك الذكي» وصفًا منحرفًا
 * لنفس المنتج في السطر الذي تعلن فيه العائلة وحدتها. */
const ECOSYSTEM = [
  { href: "https://smart-link.ly", label: "الربط الذكي — منصة الأعمال المتكاملة" },
  { href: "https://menu.smart-link.ly", label: "سمارت منيو — قوائم QR التفاعلية" },
  { href: "https://bot.smart-link.ly", label: "سمارت بوت — منصة إدارة فيسبوك الذكية" },
];

export function LandingFooter() {
  /* buildYear — يُخبَز في HTML (زوّار بلا JS تبقى لهم سنة صالحة)،
   * وجزيرة CurrentYear (توأم Smart-Link r126/r140) تُرطّب السنة الحية
   * بعد الترطيب — السنة لم تعد تتجمد زمن البناء (19-AUDIT-CROSS R8). */
  const year = new Date().getFullYear();

  return (
    <footer className="landing-footer">
      {/* (phase4 15-SO) الغلاف القانوني — canonical landing.css:1486-1552:
          الشريحة الأرضية تُحتوى بـ .marketing-container (مقاس أقصى 1200px +
          هوامش تلقائية + مزلاج 48px/20px) تمامًا كأصل العائلة. النقل في
          r128 أغفل هذا الغلاف فخرج الفوتر ممتلئًا بلا رحاب (h3 على x=0 في
          390/360) بينما سائر المحتوى يقف على رحاب الصفحة — والأعمدة الآن
          تشارك نفس الحيازة على كل المقاسات. */}
      <div className="marketing-container">
        <div className="landing-footer-grid">
          <div className="landing-footer-about">
            <Link href="/" className="landing-brand" aria-label="سمارت أوردر — الرئيسية">
              <span className="landing-brand-mark" aria-hidden="true">S</span>
              <span className="landing-brand-text">
                <span className="landing-brand-name">Smart Order</span>
                <span className="landing-brand-sub">منصّة الطلبات الرقمية</span>
              </span>
            </Link>
            <p className="landing-footer-desc">
              منصة الطلبات الرقمية للأعمال في ليبيا — متجر رقمي، طلبات عبر
              الويب وواتساب، لوحة تحكم كاملة.
            </p>
            <a
              href={`https://wa.me/${SUPPORT_WHATSAPP}`}
              target="_blank"
              rel="noopener noreferrer"
              className="landing-footer-link"
            >
              واتساب الدعم — على مدار الساعة
            </a>
          </div>

          <div className="landing-footer-col">
            <h3 className="landing-footer-heading">روابط سريعة</h3>
            {QUICK_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="landing-footer-link">
                {l.label}
              </Link>
            ))}
          </div>

          <div className="landing-footer-col">
            <h3 className="landing-footer-heading">الخدمات</h3>
            <div className="ln-footer-cluster">
              {SERVICES.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>

          <div className="landing-footer-col">
            <h3 className="landing-footer-heading">منظومة الربط الذكي</h3>
            {ECOSYSTEM.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="landing-footer-link"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>

        <div className="landing-footer-bottom">
          <span>
            &copy; <CurrentYear buildYear={year} /> الربط الذكي | Smart Order. جميع الحقوق محفوظة.
          </span>
          <span className="landing-footer-bottom-links">
            <Link href="/terms" className="landing-footer-link">الشروط</Link>
            <Link href="/privacy" className="landing-footer-link">الخصوصية</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
