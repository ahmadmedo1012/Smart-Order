# لقطات الشاشة — Smart-Order · Screenshots

> أصول مُوثّقة تحت إدارة الإصدارات (دفعة r132 W3-6) — لقطات الهيرو مقصوصة من
> `download/shots-r130/smart-order-landing-{light,dark}.png` (دفعة r130) بأعلى
> إطار العرض 1440×900، ولقطات التطبيق ملتقطة من نسخة محلية تعمل ببيانات المتجر
> التجريبي «مخبز الواحة» على منفذ محلي بالوضع الليلي (night/gold). الكل بتنسيق
> JPG أقل من 300KB لكل ملف، والمسارات نسبية من جذر المستودع.
> Versioned assets (r132 W3-6): heroes are 1440×900 crops of the r130 landing
> captures; app shots were taken from a locally-seeded demo store in the night
> theme. All exported as JPG under 300KB each, paths relative to the repo root.

| الملف | المقاس | الحجم | التعليق |
|---|---|---|---|
| [`hero-light.jpg`](hero-light.jpg) | 1440×900 | 66KB | الصفحة الرئيسية بالوضع النهاري (cream/copper) — العنوان «متجر رقمي لمتجرك — الطلبات تصلك في لوحة واحدة» مع مجسّم هاتف يعرض واجهة الطلبات · Landing hero in light mode with the phone mockup |
| [`hero-dark.jpg`](hero-dark.jpg) | 1440×900 | 68KB | الصفحة الرئيسية بالوضع الليلي (night/gold `#070B16`/`#E9B44C`) — نفس الشريط بالهوية الليلية · Landing hero in dark mode |
| [`storefront.jpg`](storefront.jpg) | 1440×900 | 114KB | واجهة المتجر العامة «مخبز الواحة» التجريبي — بحث فوري، مرشّحات أقسام، وشبكة منتجات بصور وأسعار بالدينار (millimes داخليًا) · Public storefront of the seeded demo store: search, category filters, product grid |
| [`checkout.jpg`](checkout.jpg) | 1440×900 | 39KB | صفحة إتمام الطلب — بيانات التواصل، العنوان، مناطق التوصيل بالرسوم والحد الأدنى، طرق الدفع المحلية (نقدي/عند التسليم/ليبيانا/مدار)، وملخص السلة · Checkout page: delivery zones, local payment methods, cart summary |
| [`dashboard.jpg`](dashboard.jpg) | 1440×900 | 60KB | لوحة تحكم صاحب المتجر — إحصائيات اليوم، التنبيهات القابلة للتنفيذ، أحدث الطلبات بشارات الحالة، ومخطط المبيعات · Owner dashboard: today's stats, actionable alerts, recent orders with status badges, sales chart |

## المصدر · Source

- الهيرو: أعلى إطار العرض (0–900px) من `smart-order-landing-{light,dark}.png`
  بدفعة `download/shots-r130/` (r130).
- لقطات التطبيق: متصفح headless بدقة 1440×900 على نسخة تطوير محلية (قاعدة
  بيانات SQLite تجريبية) بذرها W3-6: 8 منتجات بصور، 5 طلبات في حالات مختلفة
  (NEW → DELIVERED) عبر `/api/auth/register` + سكربت بذر مباشر — لا تغييرات في
  كود التطبيق نفسه.

## الاستخدام · Usage

```markdown
![الصفحة الرئيسية بالوضع الليلي](docs/screenshots/hero-dark.jpg)
```
