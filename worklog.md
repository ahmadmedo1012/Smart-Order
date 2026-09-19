---
Task ID: deep-round-2
Agent: main (Super Z)
Task: ECOSYSTEM IDENTITY LOCK — round 2, user-demanded deeper pass (top bar, buttons, plans, effects, payment, verification — everything literal, copy from Smart Menu/SmartBot where possible)

Work Log:
- Re-cloned refs: Smart-Menu (private, via token), SmartBot, impeccable, gstack → /home/z/my-project/refs/
- Deep-studied family sources: Header.tsx (tubelight nav + hide-on-scroll + mobile menu w/ focus trap), button.tsx (shine sweep + ambient glow, orange/flame/outline), PricingClient.tsx (plan cards, yearly toggle, FAQ, CTA), PaymentDialog.tsx (ProviderPicker libyana/madar/bank, USSD, receipt upload, 4-step + polling), LoginForm.tsx (glass card, SmartBot inputs, forgot dialog), HeroSection.tsx (split hero + phone mockup + floating glass cards + layered glows), FeaturesSection (bento), Footer (4-col), ThemeToggle (motion spring), StepIndicator + PlanSelector (subscribe wizard), ScrollReveal/ScrollParallax/Eyebrow/motion-icons, payment-constants (WALLET_CAP_LYD=99, phones, USSD formulas)
- Live-site audits + screenshots: menu.smart-link.ly (+/pricing), bot.smart-link.ly, order.smart-link.ly → download/qa-2026-09-18/
- VLM compare ref vs current → confirmed gaps: header layout, hero split w/ phone, bento features, missing pricing page, footer, effects depth
- Found critical bug: src/components/shared/theme-toggle.tsx line ~10 destructuring broken (`const ounted, setMounted]`)
- Smart Order status: tokens done (globals.css family twin ✓), button family twin ✓, Eyebrow/motion/SectionContainer/SectionHeader/ScrollReveal exist; MISSING: family header/tubelight/mobile-menu, split hero+phone, bento, /pricing+plans+payment flow, wizard register, login twin, footer twin, checkout ProviderPicker restyle, plan usage badge, admin approval page

Stage Summary:
- Full diff matrix established; build order: primitives → layout (header/footer/toggle) → landing → plans/pricing/payment → wizard register → login → checkout restyle → dashboard badge/admin → QA → deploy

---
Task ID: deep-round-2-build
Agent: main (Super Z)
Task: تنفيذ جولة التطابق العميقة — كل مكونات العائلة

Work Log:
- Primitives: motion-icons, animated-icons (useAnimate hover), scroll-parallax, iphone-mockup, theme-toggle motion twin (أصلح خلل destructuring حرج)
- Layout: header.tsx (tubelight nav + layoutId + hide-on-scroll + mobile drawer w/ focus trap), footer.tsx (4-col + sunken bottom bar)
- Landing: page.tsx server + hero-section (split + glows + parallax + CSS LCP), hero-phone (iPhone mockup + floating glass cards: order ticket/growth/verified), features-bento (bento 2x2 hero + zap + corner glow), how-it-works, local-section, faq (details grid-rows), final-cta (flame top line)
- Plans: Prisma Plan + SubscriptionPayment (+Business.planId/subscriptionEnds), /api/plans (self-seeding), /pricing + pricing-client twin (price-swap, yearly capsule, FAQ), seed-family.js
- Payment: payment-constants (WALLET_CAP 99/USSD verbatim), provider-picker, receipt-upload, payment-dialog (4 steps + polling + USSD copy/dial + bank fields + receipt), /api/subscriptions (POST/status/list/review/receipt)
- Register wizard: step-indicator (flame nodes), plan-selector (family cards), register/page.tsx wizard + PaymentDialog for paid
- Login: family twin (glass card, SmartBot inputs, eye toggle, forgot dialog, top gradient bar)
- Checkout: payment section → ProviderPicker tiles + number copy + USSD row (tested: total 81 د.ل → *122*218942119637*81000*1#)
- Dashboard: plan-usage-badge, stats API +plan+monthOrders, admin payments approvals page + ADMIN_NAV, layout passes isPlatformAdmin
- Terms + Privacy pages (family footer links)
- /api/seed (admin/secret) للمتجر التجريبي
- E2E 30/30 PASS · build PASS · tsc PASS
- E2E full payment flow verified: register paid → dialog → waiting poll → admin approve → dialog flips approved → DB: Basic + 30d

Stage Summary:
- الهوية الآن على مستوى المنتج كاملاً (شريط/أزرار/باقات/دفع/تحقق/مؤثرات) لا الألوان فقط
- TODO: commit+push, deploy Vercel, db push prod, seed prod, production QA

---
Task ID: deep-round-2-deploy
Agent: main (Super Z)
Task: نشر الإنتاج + التحقق النهائي

Work Log:
- أصلح gitignore (كان .next/.env/refs تتسرب) + نظّف الفهرس
- commit 57559f0 + 8604174 → GitHub main
- اكتشف أن render.yaml كان يفسّر كـ services بواسطة Vercel CLI → أُزيل من المستودع
- vercel.json: build يطبّق prisma db push (additive) قبل التوليد → الجداول الجديدة تُنشأ عند النشر
- نشر إنتاجي ×3 → order.smart-link.ly
- env: SEED_SECRET + NEXT_PUBLIC_SUPPORT_WHATSAPP أُضيفا عبر API
- بذر إنتاجي: POST /api/seed → {store:true, products:6, paymentMethods:3, zones:2}
- التحقق الإنتاجي:
  * /api/plans → 4 خطط ✓
  * /pricing → بطاقات + كبسولة سنوي/شهري (وفّر 17%) ✓
  * المتجر التجريبي يعمل ✓
  * E2E إنتاجي 30/30 PASS ✓
  * لقطات PROD-* + مقارنات COMPARE-* في download/qa-2026-09-18/
- VLM توأم التقييم: 8/10 — الفروق المتبقية فروق منتج مقصودة (نصوص/محتوى الهاتف/العلامة) لا فروق هوية

Stage Summary:
- الإنتاج live بالهوية العائلية الكاملة: شريط tubelight، بطل منقسم + هاتف + بطاقات زجاجية، bento، بااقات، دفع عائلي (USSD/بنكي/محفظة)، تحقق بالموافقة، footer رباعي
- جاهز للمستخدم؛ الخطوة التالية المقترحة: جلسة تلميع صغيرة إذا طلب المستخدم (نسخ نصية أو تعديل أسعار الخطط من قاعدة البيانات مباشرة)

---
Task ID: deep-round-3
Agent: main (Super Z)
Task: الجولة الثالثة الأعمق — تطابق جنائي على مستوى البكسل (شعار العائلة الحقيقي + إصلاح جذرري للحركات + أقسام مفقودة + نشر إنتاجي)

Work Log:
- أعد استنساخ refs/ (Smart-Menu, SmartBot, impeccable, gstack) بعد فقدانها
- ثبّت واستخدم gstack (browse binary بُني + جلسة تصفح كاملة) و impeccable (61 قاعدة كاشفة مستخرجة كقائمة تدقيق في scripts/impeccable-61-rules.txt)
- تدقيق جنائي بالبكسل للشعار العائلي: تحليل مكونات متصلة (Connected Components) أثبت القالب = 4 أقواس L متدرجة (#ffb000→#ff7c00) + معيّن مركزي متدرج + أيقونة بيضاء صلبة (الشوكة/الروبوت)
- ولّد شعار Smart Order: إطار المرجع نفسه بكسلًا-بكسل (menu frame) + حقيبة تسوق بيضاء (3 نسخ متتالية حكم VLM: 2/10 → 5/10 → 9/10) + كل الأحجام + favicon.ico + manifest + og-default (عبر HTML→screenshot لعربية HarfBuzz سليمة)
- اكتشاف وإصلاح الخلل الجذري: تطبيق يستورد m من motion/react بلا LazyMotion features → كل حركات whileInView/animate كانت مجمّدة على opacity:0 (بطاقات الأسعار! البطاقات العائمة!) → أُضيف LazyMotionProvider (domAnimation) في الجذر + LayoutMotion (domMax) للـ tubelight (توأم حرفي لآلية Smart Menu)
- الهيدر: شعار العائلة Image + إزالة زر CTA (العائلة = theme-toggle فقط) + درج موبايل 3 روابط فقط
- البطل: CTA عائلي (ابدأ مجاناً + تسجيل الدخول) + keyframe r92-hero-settle + رقم بلا فواصل
- الجسم: توهج شعاعي علوي --background-radial (آلية SmartBot الحرفية) في الوضعين
- أقسام جديدة عائلية: StatsSection (عدادات صادقة متحركة)، ShowcaseSection (لقطة متجر حقيقية إطار + انجراف تمرير)، ClientsSection (شبكة شركاء + شهادات دوّارة + حبوب تنقل)
- Login/Register/NotFound/DashboardShell: brand-icon.png العائلي
- Metadata: manifest + أيقونات + apple-touch + og-default + apple-web-app
- tsc نظيف · build ناجح · E2E محلي 30/30 · E2E إنتاجي 29 ناجح 0 فاشل (1 متجاهل: rate-limit بIP مشترك)
- إعادة ربط vercel بالمشروع الصحيح (smart-order) بعد فقدان .vercel → نشر إنتاجي → order.smart-link.ly
- تدقيق VLM نهائي: الهبوط 9/10 · الأسعار 9/10 · تسجيل الدخول 9/10 · التسجيل 9/10 · المحمول 9/10 — الفروق المتبقية كلها فروق منتج مقصودة (نصوص/محتوى الهاتف) + هلوسة الشبكة (نُفيت بفحص بكسلي: كلا الموقعين grain فقط)

Stage Summary:
- الهوية الآن على مستوى العلامة الحرفية (ش quaternion العائلة نفسه) + كل الحركات حية (كانت ميتة) + بنية الصفحة الكاملة مطابقة للعائلة
- المثالية المطلوبة: تحقيقها يتطلب من المستخدم تقديم عدد المتاجر الحقيقي/شهادات حقيقية إن أراد أرقامًا غير صفرية في الإنتاج
