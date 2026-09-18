const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const u = await p.user.findFirst({
    where: { email: { contains: '@test.ly' } },
    select: { email: true, memberships: { select: { business: { select: { slug: true, name: true } } } } },
  });
  console.log(JSON.stringify(u));
  await p.$disconnect();
}
main().catch((e) => { console.error('ERR ' + e.message); process.exit(1); });
