const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
async function main() {
  const r = await p.business.findMany({ where: { isPublished: true }, select: { slug: true, name: true }, take: 8 });
  console.log(JSON.stringify(r));
  await p.$disconnect();
}
main().catch((e) => { console.error("ERR " + e.message.slice(0, 100)); process.exit(1); });
