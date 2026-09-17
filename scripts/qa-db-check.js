// DB inspection helper for Smart Order QA
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const order = await p.order.findFirst({
    select: {
      orderNumber: true, status: true, paymentStatus: true, total: true,
      history: {
        orderBy: { createdAt: "asc" },
        select: { fromStatus: true, toStatus: true, changedByName: true, note: true },
      },
    },
  });
  console.log("ORDER:", JSON.stringify(order, null, 1));
  const biz = await p.business.findFirst({ select: { name: true, slug: true, isPublished: true } });
  console.log("BUSINESS:", JSON.stringify(biz));
}

main().catch(console.error).finally(() => p.$disconnect());
