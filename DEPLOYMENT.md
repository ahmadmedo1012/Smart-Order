# نشر Smart Order — دليل التشغيل الكامل

> **حالة الإنتاج (2026-10-08): منشور ويعمل — آخر نشر إنتاجي c59a335 (سلسلة fdd57ff)، /api/health = ok/db up، الخطط والبذر التجريبي مثبتون حياً.**

هذا الدليل يغطي نشر الإنتاج على **Vercel + Neon PostgreSQL**، مع بديل الاستضافة الذاتية عبر خرج `standalone`.

---

## 1. متغيرات البيئة المطلوبة

| المتغير | القيمة في الإنتاج | ملاحظات |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=require` | اتصال Neon PostgreSQL — **لا تُضمَّن في المستودع أبداً** |
| `NEXT_PUBLIC_SITE_URL` | `https://order.smart-link.ly` | URL أساسي للـ SEO / Open Graph / sitemap |

لا توجد مفاتيح دفع أو واتساب API — الدفع يدوي/COD (حسب التصميم: لا نجاحات دفع وهمية) وواتساب عبر روابط wa.me.

## 2. النشر على Vercel (المسار الأساسي)

```bash
# من جذر المستودع — يتطلب VERCEL_TOKEN (أو `vercel login` تفاعلياً)
npm i -g vercel

# ربط المشروع + أول نشر
vercel link                    # أنشئ مشروعاً باسم smart-order
vercel env add DATABASE_URL production          # الصق رابط Neon
vercel env add NEXT_PUBLIC_SITE_URL production  # https://order.smart-link.ly

# تطبيق مخطط قاعدة البيانات على Neon (مرة واحدة + عند تغيير المخطط)
DATABASE_URL="<neon-url>" npx prisma db push --schema=prisma/schema.postgres.prisma

# النشر
vercel --prod
```

### أمر البناء الحقيقي (vercel.json)

```json
"buildCommand": "node scripts/vercel-db-sync.mjs && npx prisma generate --schema=prisma/schema.postgres.prisma && npm run build"
```

السلسلة بترتيبها:
1. **`scripts/vercel-db-sync.mjs`** — مزامنة المخطط المرنة (إصلاح تجميد النشر ٣ أسابيع، commit `fdd57ff`):
   - `DATABASE_URL` غير موجود → `[DB-SYNC] SKIPPED` والنشر يستمر.
   - فشل عابر (P1001/P1002/ECONN*…) → إعادة محاولة ×3 (انتظار 10s/20s لإيقاظ Neon البارد) ثم استمرار مع لافتة تحذير.
   - خطأ مخطط حقيقي → الافتراض الكامل في لافتة `[DB-SYNC]` + `exit 0` (حجب النشر لم يصلح شيئاً قط — الشفافية + الاستمرار أفضل مقايضة).
   - النجاح → `[DB-SYNC] ✓ schema synced`.
   كل نتيجة تُطبع بسطر واحد قابل للـ grep يبدأ بـ `[DB-SYNC]` — فك شفرة أي سجل بناء من سطر واحد.
2. **`prisma generate`** بمحرك PostgreSQL.
3. **`npm run build`** — البناء لا يحتاج قاعدة بيانات إطلاقاً (كل مسارات DB هي `force-dynamic`؛ عدّادات الصفحة الرئيسية محمية بـ try/catch).

> **تحقق بعد النشر:** `curl https://<deployment-url>/api/health` يجب أن يعيد `{"status":"ok","db":"up"}` ثم شغّل `npm run test:e2e` مع تمرير رابط الإنتاج: `node tests/e2e/api-e2e.js https://<deployment-url>`

## 3. قاعدة البيانات — Neon PostgreSQL

1. أنشئ مشروعاً على [neon.tech](https://neon.tech) (الخطة المجانية تكفي للانطلاق).
2. انسخ Connection String (تأكد من `?sslmode=require`).
3. طبّق المخطط: `npx prisma db push --schema=prisma/schema.postgres.prisma`
4. أضفه كمتغير `DATABASE_URL` في Vercel لبيئات Production و Preview.

ملاحظات معمارية:
- كل المبالغ **مليّمات صحيحة** (Int) — لا فواصل عائمة، لا تغيير مطلوب عند الترحيل.
- الجداول مستقلة عن أي مشروع شقيق في نفس حساب Neon (أسماء جداول خاصة بـ Smart Order).
- Migrations: `prisma/schema.prisma` للتطوير المحلي (SQLite)، `schema.postgres.prisma` للإنتاج — المخططان متطابقان نموذجياً.

## 4. النطاق order.smart-link.ly (اختياري، لاحقاً)

على لوحة تحكم Vercel: **Domains → Add → order.smart-link.ly** ثم اتبع تعليمات DNS:
- إذا كان نطاق smart-link.ly مديراً في نفس حساب Vercel → إضافة سجل `CNAME` باسم `order`指向 `cname.vercel-dns.com` (تلقائية عبر Vercel DNS).
- إذا كان DNS خارجياً (Cloudflare وغيرها) → سجل `CNAME` لـ `order` إلى `cname.vercel-dns.com` مع تعطيل الوكيل (DNS only) حتى إصدار الشهادة، ثم يمكن تفعيله.
- **لا تجري أي تغيير DNS مدمراً** — إضافة سجل جديد لا تمس السجلات القائمة (menu. / bot. / api. تعمل كما هي).

## 5. الاستضافة الذاتية (بديل — Docker/VPS)

> `render.yaml` أُزيل من المستودع نهائياً (كان يُفسَّر كـ services بواسطة Vercel CLI ويفشل النشر). لا توجد ملفات Render بعد الآن.

المسار المدعوم ذاتياً: سكربتات `build:selfhost` و `start:selfhost` الموجودة في `package.json` (خرج `standalone` عبر `NEXT_OUTPUT=standalone` + `next start` على المنفذ من `PORT`). أضف `DATABASE_URL` (Neon أو أي PostgreSQL) ثم شغّل:

```bash
NEXT_OUTPUT=standalone npm run build:selfhost
PORT=3000 npm run start:selfhost
```

نفس أمر الصحة `/api/health` للمراقبة. مزامنة المخطط يدوياً قبل التشغيل: `npx prisma db push --schema=prisma/schema.postgres.prisma`.

## 6. قائمة تحقق ما بعد النشر (إلزامية)

```bash
BASE="https://<deployment-url>"
curl -s $BASE/api/health                          # status ok, db up
node tests/e2e/api-e2e.js $BASE                   # 30/30 يجب أن تنجح
curl -sI $BASE | grep -i "x-frame\|x-content"     # رؤوس الأمان موجودة
curl -s $BASE/robots.txt                          # يسمح بالفهرسة
```

ثم يدوياً في المتصفح: تسجيل عمل → منتج → نشر → طلب → تتبع، وتأكيد RTL + الوضع الليلي + لا أخطاء في Console.
