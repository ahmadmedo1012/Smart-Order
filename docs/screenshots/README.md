# لقطات الشاشة — Smart-Order · Screenshots

> أصول مُوثّقة تحت إدارة الإصدارات (دفعة r132 W3-6، ثم المرحلة 5) — لقطات
> الهيرو مقصوصة من `download/shots-r130/smart-order-landing-{light,dark}.png`
> (دفعة r130) بأعلى إطار العرض 1440×900، ولقطات التطبيق ملتقطة من نسخة محلية
> تعمل ببيانات المتجر التجريبي «مخبز الواحة» على منفذ محلي. الكل بتنسيق JPG
> أقل من 300KB لكل ملف، والمسارات نسبية من جذر المستودع.
>
> ⚠️ **حقيقة الأصول:** كل اللقطات أدناه مُلتقطة قبل انقلاب هوية المرحلة
> الخامسة (r152 «النهار التشغيلي — الطريق والعقدة») — أي أن البكسلات لا
> تزال تحمل عالم ما قبل الانقلاب (كان مدارك night/gold). التعليقات
> المحدّثة أدناه تصف المنتج الحالي، لا البكسلات القديمة؛ تجديد الالتقاط
> (Playwright) معلّق لمهمة لاحقة في المرحلة 6.
> Versioned assets (r132 W3-6): heroes are 1440×900 crops of the r130 landing
> captures; app shots were taken from a locally-seeded demo store. HONEST NOTE:
> the pixels predate the Phase 5 identity flip — re-capture is PENDING (a later
> agent with Playwright); the updated captions describe the current product.
> All exported as JPG under 300KB each, paths relative to the repo root.

| الملف | المقاس | الحجم | التعليق |
|---|---|---|---|
| [`hero-light.jpg`](hero-light.jpg) | 1440×900 | 66KB | الصفحة الرئيسية بالوضع النهاري — «النهار التشغيلي»: ورق وحبر كحلي وبرتقالي توصيل؛ العنوان «متجر رقمي لمتجرك — الطلبات تصلك في لوحة واحدة» مع مجسّم هاتف يعرض واجهة الطلبات · Landing hero in light mode (the operational-daylight identity) with the phone mockup — لقطة ما قبل الانقلاب، التجديد معلّق |
| [`hero-dark.jpg`](hero-dark.jpg) | 1440×900 | 68KB | الصفحة الرئيسية بالوضع الليلي — الوضع الحالي هو «إرساليات الليل» (كحلي عميق `#0D1626` + برتقالي مضيء `#FF7A38`) · Landing hero in dark mode (night dispatch) — لقطة ما قبل الانقلاب، التجديد معلّق |
| [`storefront.jpg`](storefront.jpg) | 1440×900 | 114KB | واجهة المتجر العامة «مخبز الواحة» التجريبي — بحث فوري، مرشّحات أقسام، وشبكة منتجات بصور وأسعار بالدينار (millimes داخليًا) · Public storefront of the seeded demo store: search, category filters, product grid |
| [`checkout.jpg`](checkout.jpg) | 1440×900 | 39KB | صفحة إتمام الطلب — بيانات التواصل، العنوان، مناطق التوصيل بالرسوم والحد الأدنى، طرق الدفع المحلية (نقدي/عند التسليم/ليبيانا/مدار)، وملخص السلة · Checkout page: delivery zones, local payment methods, cart summary |
| [`dashboard.jpg`](dashboard.jpg) | 1440×900 | 60KB | لوحة تحكم صاحب المتجر — إحصائيات اليوم، التنبيهات القابلة للتنفيذ، أحدث الطلبات بطوابع الحالة المربعة، ومخطط المبيعات · Owner dashboard: today's stats, actionable alerts, recent orders with square status stamps, sales chart — لقطة ما قبل الانقلاب، التجديد معلّق |

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
