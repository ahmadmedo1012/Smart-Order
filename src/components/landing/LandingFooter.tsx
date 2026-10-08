import Link from "next/link";

/* r128 Stage B (F4b) — the landing footer: the ground plate
 * (canonical landing.css:1486-1552 form, smart-link LandingFooter
 * anatomy). Real destinations only — the product footer's quick links,
 * services registry and support WhatsApp, on flat hairline rows. */

const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "218910089975";

const QUICK_LINKS = [
  { href: "/pricing", label: "الخطط" },
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

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="landing-footer">
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
      </div>

      <div className="landing-footer-bottom">
        <span>
          &copy; {year} الربط الذكي | Smart Order. جميع الحقوق محفوظة.
        </span>
        <span className="landing-footer-bottom-links">
          <Link href="/terms" className="landing-footer-link">الشروط</Link>
          <Link href="/privacy" className="landing-footer-link">الخصوصية</Link>
        </span>
      </div>
    </footer>
  );
}
