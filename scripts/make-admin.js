// Create/verify a platform-admin user for QA (idempotent)
//
// P42-W6 (تدقيق §6 — أسرار/اعتمادات معروفة): هذا نص QA للـCI (تُشغَّله
// وظيفة E2E على قاعدة SQLite تجريبية طازجة) — لكنه كان يعمل على أي
// DATABASE_URL بلا أي حارس: تشغيله بالخطأ على الإنتاج يزرع أدمن منصة
// بكلمة مرور معروفة منشورة في المستودع ثم يطبعها في السجل. الحارس:
// يرفض NODE_ENV=production صراحةً — التجاوز المقصود الوحيد عبر
// MAKE_ADMIN_FORCE=1 (قرار موثق، لا صمت). CI غير متأثر (NODE_ENV غير
// مضبوط هناك عند تشغيل السكربت).
const { PrismaClient } = require('@prisma/client');
const { pbkdf2Sync, randomBytes } = require('crypto');

if (process.env.NODE_ENV === 'production' && process.env.MAKE_ADMIN_FORCE !== '1') {
  console.error(
    '[make-admin] REFUSED — NODE_ENV=production. هذا نص QA بكلمة مرور معروفة؛ ' +
      'زراعة أدمن إنتاج تتم بمعايير الإنتاج (كلمة مرور سرية من البيئة). ' +
      'التجاوز المقصود الوحيد: MAKE_ADMIN_FORCE=1.'
  );
  process.exit(1);
}

const db = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, 600000, 64, 'sha512');
  return `pbkdf2$600000$${salt.toString('base64')}$${hash.toString('base64')}`;
}

(async () => {
  const email = 'admin@smart-link.ly';
  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    user = await db.user.create({
      data: { email, name: 'Platform Admin', passwordHash: hashPassword('Admin@12345'), isPlatformAdmin: true },
    });
    console.log('created admin');
  } else if (!user.isPlatformAdmin) {
    user = await db.user.update({ where: { email }, data: { isPlatformAdmin: true } });
    console.log('promoted to admin');
  } else {
    console.log('admin exists');
  }
  console.log('login: admin@smart-link.ly / Admin@12345');
  await db.$disconnect();
})();
