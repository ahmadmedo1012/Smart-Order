const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const businesses = await db.business.findMany({ select: { slug: true, name: true, isPublished: true, isActive: true }, take: 20 });
  console.log('businesses:', JSON.stringify(businesses, null, 1));
  const users = await db.user.findMany({ select: { email: true, isPlatformAdmin: true }, take: 10 });
  console.log('users:', JSON.stringify(users));
  await db.$disconnect();
})();
