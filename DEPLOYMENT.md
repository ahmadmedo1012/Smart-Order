# نشر Smart Order — دليل التشغيل الكامل

> **حالة الإنتاج (2026-09-18): منشور ويعمل** — `https://order.smart-link.ly` على Vercel + مشروع Neon مستقل باسم `Smart-Order` (aws-us-east-1, PostgreSQL 18). تم التحقق: E2E 30/30 ضد الإنتاج، تدفق كامل من التسجيل حتى التسليم عبر الواجهة، RTL/الوضع الليلي، رؤوس الأمان.

هذا الدليل يغطي نشر الإنتاج على **Vercel + Neon PostgreSQL**، مع بديل الاستضافة الذاتية على Render.

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

أمر البناء في `vercel.json` يولّد عميل Prisma بمحرك PostgreSQL ثم يبني Next.js:
`npx prisma generate --schema=prisma/schema.postgres.prisma && npm run build`

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

## 5. الاستضافة الذاتية (بديل — Render)

`render.yaml` جاهز: يستخدم `NEXT_OUTPUT=standalone` + `next start`. أضف `DATABASE_URL` من لوحة Render ثم Apply Blueprint. نفس أمر الصحة `/api/health` للمراقبة.

## 6. قائمة تحقق ما بعد النشر (إلزامية)

```bash
BASE="https://<deployment-url>"
curl -s $BASE/api/health                          # status ok, db up
node tests/e2e/api-e2e.js $BASE                   # 30/30 يجب أن تنجح
curl -sI $BASE | grep -i "x-frame\|x-content"     # رؤوس الأمان موجودة
curl -s $BASE/robots.txt                          # يسمح بالفهرسة
```

ثم يدوياً في المتصفح: تسجيل عمل → منتج → نشر → طلب → تتبع، وتأكيد RTL + الوضع الليلي + لا أخطاء في Console.
