# Smart Order — Mobile

تطبيق الهاتف الأصلي لمنصة Smart Order — **رحلة الضيف كاملة**: افتح متجرًا
برمزه، تصفّح القائمة بالتصنيفات، اختر الأصناف بنِسَبها وإضافاتها، اطلب
بتوصيل أو استلام، وتتبّع طلبك لحظة بلحظة. يتحدث إلى نفس واجهات الويب
الحيّة (`https://order.smart-link.ly`) — **عربي RTL أولًا**.

الويب والبنية الكاملة: `README.md` جذر المستودع.

## البنية

```
mobile/
├── app.json                  هوية التطبيق (ly.smartlink.smartorder) + App Links
├── src/app/                  مسارات expo-router
│   ├── index.tsx             بوابة المتاجر: الرمز + المتاجر الأخيرة
│   ├── store/[slug].tsx      واجهة المتجر: تصنيفات + أصناف + شريط السلة
│   ├── product/[id].tsx      الصنف: نِسَب + إضافات + كمية + ملاحظة
│   ├── cart.tsx              السلة + إتمام الطلب (توصيل/استلام/منطقة/عنوان)
│   └── track/[token].tsx     تتبّع الطلب: شريط حالة + سجل + استقصاء 15ث
├── src/services/storefront.ts  عميل API الموحد (envelope + مهلة + إعادة GET)
├── src/state/cart.ts         سلة zustand (بأسماء العرض + معادلة تسعير الخادم)
├── src/state/pricing.ts      معادلات التسعير النقية (نفس منطق إعادة التسعير)
├── src/constants/theme.ts    توكنات النحاس على الورق (نفس globals.css)
└── src/lib/money.ts          الدينار الليبي (أرقام غربية + تجميع ar-LY)
```

## عقد الـAPI (نفس مسارات الويب — لا اختراع)

| المسار | الاستخدام |
|---|---|
| `GET /api/public/store/[slug]` | القائمة والتصنيفات والمناطق (30ث stale) |
| `POST /api/public/orders` | إنشاء الطلب — idempotencyKey لكل إرسال |
| `GET /api/public/track/[token]` | تتبّع الطلب (استقصاء 15ث حتى الحالة النهائية) |

**التسعير من الخادم دائمًا**: التطبيق يحسب القيم للعرض فقط بمعادلة الخادم
نفسها (`state/pricing.ts` — مغطاة باختبارات)؛ `POST` يعيد التسعير كليًا.

## البطاقات الأمنية الموروثة من الويب

- **Idempotency**: مفتاح UUID لكل محاولة إرسال — النقر المزدوج لا يكرر
  الطلب أبدًا (قيد `(businessId, idempotencyKey)` في الخادم).
- **الحد الأدنى للمنطقة** يُفحص قبل الإرسال (نفس رسالة الرفض العربية).
- السلة **لا تُخزَّن محليًا** — الأسعار والأسهم تتغير على الخادم.

## إعداد

```bash
cd mobile
npm install            # Node 20+ (الويب يستخدم bun — كلاهما جنبًا إلى جنب)
npx expo start         # امسح QR بـ Expo Go أو افتح محاكيًا
```

متغير البيئة `EXPO_PUBLIC_API_URL` (اختياري — الافتراضي الإنتاج): وجه
بنية التطوير المحلية إلى `http://<IP-جهازك>:3000` (الجهاز الحقيقي لا
يرى localhost).

## البوابات

```bash
npm run typecheck      # tsc --noEmit — صفر أخطاء
npm run lint           # expo lint
npm run test           # vitest — معادلات التسعير + الدينار
```

## البناء (GitHub Actions — لا حساب EAS مطلوب)

سير عمل `mobile-release.yml` جذر المستودع يبني عند الوسم `mobile-v*` أو
يدويًا:

- **Android APK موقّع** — `expo prebuild` + Gradle على ubuntu runner،
  التوقيع من أسرار المستودع (`ANDROID_KEYSTORE_B64` وأخواته — راجع
  تعليقات السير للتكوين الأول).
- **iOS أرشيف غير موقّع** — macOS runner + `xcodebuild CODE_SIGNING_ALLOWED=NO`
  (ملف `.app` للتشغيل في المحاكي/التوقيع لاحقًا بحساب Apple Developer).

الملفات تُرفع كـ artifacts + GitHub Release باسم الوسم.
