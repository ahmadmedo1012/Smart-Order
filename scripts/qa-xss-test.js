// XSS injection test: create order with malicious payloads, then verify storage
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const prod = await p.product.findFirst({
    where: { isArchived: false },
    include: { variants: true, optionGroups: { include: { options: true } } },
  });
  const zone = await p.deliveryZone.findFirst();
  const pm = await p.paymentMethod.findFirst();

  const body = {
    slug: "mkhbz-alwaha",
    idempotencyKey: "xss-test-" + Date.now(),
    fulfillmentType: "DELIVERY",
    customerName: '<img src=x onerror=alert(1)>',
    customerPhone: "0923456789",
    city: "طرابلس",
    area: "test",
    addressLine: "<script>alert(2)</script> street",
    customerNote: "<svg/onload=alert(3)> note <b>bold</b>",
    deliveryZoneId: zone?.id ?? null,
    paymentMethodId: pm?.id ?? null,
    items: [
      {
        productId: prod.id,
        variantId: prod.variants[0]?.id ?? null,
        optionIds: prod.optionGroups[0]?.options.map((o) => o.id).slice(0, 1) ?? [],
        quantity: 1,
        note: "<b>item-note</b><script>alert(4)</script>",
      },
    ],
  };

  const res = await fetch("http://localhost:3000/api/public/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  console.log("HTTP", res.status);
  console.log(JSON.stringify(json, null, 1).slice(0, 600));

  if (json.success) {
    const stored = await p.order.findUnique({
      where: { id: json.data.order.id },
      select: { customerName: true, customerNote: true, addressLine: true, items: { select: { note: true } } },
    });
    console.log("STORED:", JSON.stringify(stored, null, 1));
  }
}

main().catch(console.error).finally(() => p.$disconnect());
