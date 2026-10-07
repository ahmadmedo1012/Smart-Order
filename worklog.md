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

---
Task ID: madarek-parity-lock
Agent: main (Super Z)
Task: MADAREK DESIGN SYSTEM PARITY — the authoritative family source (madarek repo) replaces the interim flame-orange ecosystem language

Work Log:
- Forensic audit of madarek/frontend/src/styles/: tokens.css (1095 lines, canonical), fonts.css (12-file IBM Plex set), shared-design-system.css + unified-smart-parity.css (cc03c2e "unified design system parity layer for all Smart projects"), MASTER.md superseded-notice
- Studied sibling precedents (prod-verified): SmartBot cfe6aea (same shadcn/Tailwind v4 architecture) + Smart-Link ee68324 (curated token bridge after the 25K-line mega-paste revert 195b05e)
- public/fonts/: +12 IBM Plex woff2 (Sans Arabic 400-700 ar/la, Serif italic 400/500 la, Mono 400/500 la), removed Cairo×3/Readex×2; fonts.css rewritten with --font-cairo shim repointed to "IBM Plex Sans Arabic"; Naskh/Noto blocks kept (.font-naskh consumer)
- globals.css: full Madarek token bridge — dark night #070B16 / sand #F2EFE6 / gold #E9B44C (accent-fg #05070F); light cream #FBFAF9 / ink #191918 / copper #B57438 (accent-ink #5C3416, accent-fg #1A0F06); Madarek -ink/-bg status pairs; charts series; sidebar gold-wash active; glass §1.8; scrim §5.10; grid/glow re-tinted; radius ladder 6/8/10/12/16/20/28 (lg=16 .card, md=10, xl=28, +2xl=20); elev-1..5 both modes; motion ladder --t-micro…--t-cinema + easings + --motion-direction; headings letter-spacing 0 (Arabic cursive ruling #2); [dir=rtl] flip + guards
- layout.tsx: preloads → plex-sans-arabic-400/700-arabic.woff2; themeColor → #FBFAF9/#070B16
- brand.tsx: flame gradient → Madarek gold metal (C9962F→E9B44C→C9962F, night glyph #05070F)
- manifest.json: theme_color #E9B44C, background_color #070B16
- QA: next build clean (all 30+ routes); live probe dark bg rgb(7,11,22)/ink rgb(242,239,230), light bg rgb(251,250,249)/ink rgb(25,25,24); font-family resolves IBM Plex Sans Arabic; login CTA rgb(233,180,76) on rgb(5,7,15); VLM screenshot review confirms night-indigo + gold identity; screenshots download/menu-home-{dark,light}.png, menu-login-dark.png, menu-pricing-dark.png

Stage Summary:
- Smart Order now renders on the Madarek canonical system, mirroring SmartBot + Smart-Link bridges. Commit 383cf50 (local). PUSH PENDING: PAT in ecosystem doc is revoked (401) — needs fresh token from owner to push origin/main.
