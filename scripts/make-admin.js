// Create/verify a platform-admin user for QA (idempotent)
const { PrismaClient } = require('@prisma/client');
const { pbkdf2Sync, randomBytes } = require('crypto');
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
