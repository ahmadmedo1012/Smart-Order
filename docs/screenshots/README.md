# لقطات الشاشة — Smart-Order · Screenshots

> أصول مُوثّقة تحت إدارة الإصدارات — أُعيد التقاطها بالكامل في موجة W7-I-C
> (أكتوبر 2026) من نسخة الإنتاج الحالية لهوية «النهار التشغيلي — الطريق والعقدة»:
> بناء `next start` محلي بقاعدة SQLite للتطوير، بذرها `scripts/seed-family.js`
> (المتجر التجريبي «مخبز الواحة» + الخطط) + بذرة موجة الالتقاط: صور منتجات عبر
> مسار `/api/media` نفسه، تاجر مالك، و23 طلباً عبر آخر 7 أيام بحالات موثّقة —
> بلا أي تغيير في كود التطبيق. كل الأرقام الظاهرة في اللقطات (عدّادات الهيرو،
> مؤشرات اللوحة، أعمدة المخطط) حقيقية من قاعدة البيانات — سياسة الصدق العائليّة.
> لقطات الهيرو بإطار عرض 1440×990 (ارتفاع الإطار يُدخل لوحة الأرقام الحية
> كاملةً داخل الكادر)، ولقطات التطبيق بعرض 1440 بصفحة كاملة. الكل بتنسيق JPG
> بين 123 و179KB لكل ملف، والمسارات نسبية من جذر المستودع.
>
> Fully re-captured in wave W7-I-C (Oct 2026) from the current production
> build of the «Operational Daylight — Route & Node» identity: a local
> `next start` against the seeded dev SQLite (demo store + plans via
> scripts/seed-family.js; wave seed added product photos through the same
> `/api/media` path, an owner merchant, and 23 audited orders across the
> last 7 days — zero application-code changes). Every figure on screen
> (hero counters, KPIs, chart bars) is real data from the local database.
> Heroes are 1440×990 viewport frames (the live-figures board fits fully
> inside the frame); app shots are full-page at 1440 wide. All JPG,
> 123–179KB each, paths relative to the repo root.

| الملف | المقاس | الحجم | التعليق |
|---|---|---|---|
| [`hero-light.jpg`](hero-light.jpg) | 1440×990 | 151KB | الصفحة الرئيسية بالوضع النهاري «النهار التشغيلي» — العنوان «الطريق مفتوح: متجرك يستقبِل ويوصّل» فوق مجسّم الكرة النقطية بقوسات مدن برتقالية يخرج من الزاوية العلوية، زرّا الإجراء «ابدأ مجاناً» و«اطلب من متجر تجريبي»، شارة «أكثر من 3 متجر يثقون بنا»، ولوحة الأرقام الحية أسفل الكادر: «+3 متجر على الطريق · +23 طلب عبر المنصّة · 6 طرق دفع» · Landing hero in light mode with the dotted-route globe, both CTAs, the trust pill, and the live-figures roadmark board |
| [`hero-dark.jpg`](hero-dark.jpg) | 1440×990 | 146KB | الكادر نفسه بالوضع الليلي «إرساليات الليل» (ليل عميق `#0D1626` + برتقالي مضيء `#FF7A38`) — الكرة النقطية وأقواس المسارات البرتقالية تتوهّج على الخلفية الليلية · The same hero frame in the Night Dispatch dark mode — luminous orange route arcs over deep night |
| [`storefront.jpg`](storefront.jpg) | 1440×1327 | 179KB | واجهة المتجر العام «مخبز الواحة — تجريبي» (صفحة كاملة): بحث فوري «ابحث في المنتجات»، رقاقات الأقسام (الكل/بيتزا/برجر/مشروبات)، قسم «مميز» و«كل المنتجات» بشبكة 6 منتجات بصور حقيقية وأسعار بالدينار (بيتزا مارغريتا 45 د.ل، برجر دجاج كبير 23.500 د.ل…) · Public storefront, full page: instant search, category chips, featured + full grid of 6 products with photos and LYD prices |
| [`checkout.jpg`](checkout.jpg) | 1440×1656 | 123KB | صفحة إتمام الطلب «طلبك على بعد خطوة من الإرسال» (صفحة كاملة): طريقة الاستلام (توصيل/استلام)، بيانات الزبون، العنوان مع أزرار مناطق التوصيل «تاجوراء 8 د.ل — حد أدنى 30 د.ل» و«وسط المدينة 5 د.ل — حد أدنى 20 د.ل»، طرق الدفع المحلية (الدفع عند التوصيل / ليبيانا محدّدة مع رقم التحويل / مدار)، وملخص السلة (4 عناصر، منها 2× بيتزا مارغريتا 90 د.ل) · Checkout, full page: fulfillment, contact details, delivery-zone buttons with fees and minimums, the three Libyan payment methods with Libyana selected, and the 4-item cart summary |
| [`dashboard.jpg`](dashboard.jpg) | 1440×1449 | 164KB | لوحة تحكم صاحب المتجر «عمليات اليوم» (صفحة كاملة): تنبيهان قابلان للتنفيذ (5 طلبات بانتظار المعالجة + منتج يقترب من النفاد — برجر لحم كلاسيك)، بطاقات المؤشرات (طلبات اليوم 8 · بانتظار الإجراء 5 · إيراد اليوم 101 د.ل · متوسط الطلب 50.500 د.ل)، مخطط «إيراد آخر 7 أيام» بأعمدة حقيقية (الذروة 218.500 د.ل)، قائمة «أحدث الطلبات» بأرقام `SO-…` وشارات الحالة المربعة، وشريط حالة الإعداد (6 منتج · 3 أقسام · 2 منطقة توصيل · 1 ملغي/2 مكتمل اليوم) · Owner dashboard, full page: two actionable alerts, the four KPI cards, the real 7-day revenue chart, the latest-orders feed with square status stamps, and the setup-status strip |

## المصدر · Source

- الهيروان: إطار عرض المتصفح 1440×990 على `http://localhost:<port>/`، مرة
  بوضع `light` ومرة بوضع `dark` عبر مفتاح السمة المعياري
  (`localStorage["smart-order-theme"]` — الافتراضي ليلي، والنهار صريح)،
  مع انتظار اكتمال خط Tajawal/Barlow واستقرار مجسّم الكرة (canvas).
- لقطات التطبيق: صفحة كاملة بعرض 1440 من المتصفح، بعد اكتمال الصور
  (`/_next/image` فوق `/api/media/{id}`) وحسابات المؤشرات.
- البيانات: `node scripts/seed-family.js` (المتجر + الخطط + 3 طرق دفع
  + منطقتان) ثم بذرة موجة الالتقاط: 6 صور منتجات (صفوف `Media` بنفس عقد
  `storeImage`: فحص البايت السحري وسقف 500KB)، حساب تاجر مالك
  (`owner@demo.smart-order.ly`)، 5 عملاء، و23 طلباً بأرقام `SO-YYYYMMDD-NNNN`
  بتوقيت طرابلس وحالات من «جديد» حتى «تم التسليم» + ملغي واحد، مع سجل
  تدقيق لكل حالة — لا تغييرات في كود التطبيق نفسه.
- Heroes: a 1440×990 browser viewport on the landing, once per theme via
  the standard theme switch (`localStorage["smart-order-theme"]`), waiting
  for self-hosted fonts and the dotted-globe canvas to settle.
- App shots: full-page captures at 1440 wide after images and stats settled.
- Data: seed-family.js + the wave seed (product photos as `Media` rows on
  the same `storeImage` contract, an owner merchant, 5 customers, 23
  audited Tripoli-dated orders across all real statuses).

## الاستخدام · Usage

```markdown
![الصفحة الرئيسية بالوضع الليلي](docs/screenshots/hero-dark.jpg)
```
