// Public order creation — THE money path.
// Security model (from Smart-Menu hard lessons):
//  - client sends ONLY choices (ids/quantities); the server re-prices EVERYTHING
//  - idempotency key prevents double-submission duplicates
//  - daily-sequence order numbers with collision retry
//  - tenant ownership of every referenced product/variant/option/zone/payment method
//  - customer upsert keyed by (businessId, phone)

import { NextRequest } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { ok, fail, handleError, readJson, ApiFailError } from "@/lib/api";
import { normalizeLibyanPhone, toE164 } from "@/lib/phone";
import { dbRateLimit, clientIp } from "@/lib/rate-limit";
import { MAX_ORDER_ITEMS, MAX_ORDER_QUANTITY } from "@/lib/constants";
import { buildOrderMessage } from "@/lib/whatsapp";
import { tripoliDayStart, tripoliDateParts } from "@/lib/arabic";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

const itemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().nullable().optional(),
  optionIds: z.array(z.string()).max(20).optional().default([]),
  quantity: z.number().int().min(1).max(MAX_ORDER_QUANTITY),
  note: z.string().trim().max(200).optional().default(""),
});

const createSchema = z.object({
  slug: z.string().min(1).max(60),
  idempotencyKey: z.string().min(8).max(64),
  fulfillmentType: z.enum(["DELIVERY", "PICKUP"]),
  customerName: z.string().trim().min(2, "أدخل اسمك").max(80),
  customerPhone: z.string().trim().min(7, "أدخل رقم هاتف صحيح").max(20),
  city: z.string().trim().max(60).optional().default(""),
  area: z.string().trim().max(60).optional().default(""),
  addressLine: z.string().trim().max(200).optional().default(""),
  customerNote: z.string().trim().max(300).optional().default(""),
  deliveryZoneId: z.string().nullable().optional(),
  paymentMethodId: z.string().nullable().optional(),
  items: z.array(itemSchema).min(1, "سلة الطلب فارغة").max(MAX_ORDER_ITEMS),
});

function orderNumberFor(date: Date, seq: number): string {
  /* r136: أجزاء التاريخ بتوقيت طرابلس — كان يقرأ ساعة الخادم المحلية
   * (UTC على Vercel) فيحمل طلب 01:30 طرابلس تاريخ الأمس في رقمه. */
  const { y, m, d } = tripoliDateParts(date);
  return `SO-${y}${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}-${String(seq).padStart(4, "0")}`;
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    /* r133 (A2 N2): awaited authoritative twin (fail-closed) — the
       documented r132 handoff executed for the money path. */
    const rl = await dbRateLimit(`order:${ip}`, 8, 60 * 1000);
    // (r138) Retry-After من قيمة dbRateLimit المحسوبة أصلًا (كانت تُهدر)
    if (!rl.ok) return fail("طلبات كثيرة جداً في وقت قصير، انتظر قليلاً", 429, undefined, { "retry-after": String(rl.retryAfterSec) });

    const input = createSchema.parse(await readJson(req));

    const business = await db.business.findUnique({
      where: { slug: input.slug },
      select: { id: true, isActive: true, isPublished: true, name: true, slug: true, whatsappNumber: true },
    });
    if (!business || !business.isActive || !business.isPublished) {
      return fail("المتجر غير متاح حالياً", 404, "NOT_FOUND");
    }

    const phone = normalizeLibyanPhone(input.customerPhone);
    if (!phone) return fail("رقم الهاتف غير صحيح — مثال: 0912345678", 422, "VALIDATION");

    if (input.fulfillmentType === "DELIVERY" && (!input.city || !input.addressLine)) {
      return fail("أدخل المدينة والعنوان لطلب التوصيل", 422, "VALIDATION");
    }

    // Idempotency: replay the same order back instead of duplicating
    const idem = await db.order.findFirst({
      where: { businessId: business.id, idempotencyKey: input.idempotencyKey },
      select: { id: true, orderNumber: true, publicToken: true, status: true },
    });
    if (idem) {
      return ok({ order: { ...idem, replay: true }, business });
    }

    // ---- Server-side re-pricing (never trust client money) ----
    const productIds = Array.from(new Set(input.items.map((i) => i.productId)));
    const products = await db.product.findMany({
      where: { id: { in: productIds }, businessId: business.id, isArchived: false },
      include: { variants: { where: { isActive: true } }, optionGroups: { include: { options: { where: { isActive: true } } } } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const lineItems: Array<{
      productId: string;
      productName: string;
      variantId: string | null;
      variantName: string | null;
      unitPrice: number;
      quantity: number;
      lineTotal: number;
      note: string | null;
      optionsJson: string | null;
    }> = [];

    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product) return fail(`المنتج غير متاح (رمز غير صالح)`, 422, "VALIDATION");
      if (!product.isAvailable) return fail(`المنتج "${product.name}" غير متاح حالياً`, 422, "UNAVAILABLE");
      if (product.trackInventory) {
        if (product.stockQuantity < item.quantity) {
          return fail(`الكمية المتاحة من "${product.name}" هي ${product.stockQuantity} فقط`, 422, "STOCK");
        }
      }

      let unitPrice = product.price;
      let variantName: string | null = null;

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) return fail("خيار الحجم غير صالح", 422, "VALIDATION");
        unitPrice += variant.priceDelta;
        variantName = variant.name;
      }

      const chosenOptions: Array<{ name: string; priceDelta: number }> = [];
      if (item.optionIds && item.optionIds.length > 0) {
        // validate against groups: each option must belong to this product, respect min/max
        const groupSelections = new Map<string, string[]>();
        for (const optId of item.optionIds) {
          let found = false;
          for (const g of product.optionGroups) {
            const opt = g.options.find((o) => o.id === optId);
            if (opt) {
              found = true;
              const arr = groupSelections.get(g.id) ?? [];
              arr.push(optId);
              groupSelections.set(g.id, arr);
              chosenOptions.push({ name: opt.name, priceDelta: opt.priceDelta });
              unitPrice += opt.priceDelta;
              break;
            }
          }
          if (!found) return fail("إضافة غير صالحة في الطلب", 422, "VALIDATION");
        }
        for (const g of product.optionGroups) {
          const selected = groupSelections.get(g.id) ?? [];
          if (g.required && selected.length < Math.max(1, g.minSelect)) {
            return fail(`اختر ${g.name} للمنتج "${product.name}"`, 422, "VALIDATION");
          }
          if (selected.length > g.maxSelect) {
            return fail(`عدد اختيارات "${g.name}" يتجاوز الحد (${g.maxSelect})`, 422, "VALIDATION");
          }
        }
      } else {
        for (const g of product.optionGroups) {
          if (g.required && g.minSelect > 0) {
            return fail(`اختر ${g.name} للمنتج "${product.name}"`, 422, "VALIDATION");
          }
        }
      }

      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;
      lineItems.push({
        productId: product.id,
        productName: product.name,
        variantId: item.variantId ?? null,
        variantName,
        unitPrice,
        quantity: item.quantity,
        lineTotal,
        note: item.note || null,
        optionsJson: chosenOptions.length > 0 ? JSON.stringify(chosenOptions) : null,
      });
    }

    // ---- Delivery fee ----
    let deliveryFee = 0;
    let zoneName: string | null = null;
    if (input.fulfillmentType === "DELIVERY") {
      if (!input.deliveryZoneId) return fail("اختر منطقة التوصيل", 422, "VALIDATION");
      const zone = await db.deliveryZone.findFirst({
        where: { id: input.deliveryZoneId, businessId: business.id, isActive: true },
      });
      if (!zone) return fail("منطقة التوصيل غير متاحة", 422, "VALIDATION");
      if (zone.minOrder > 0 && subtotal < zone.minOrder) {
        return fail(`الحد الأدنى للطلب في ${zone.name} غير مستوفى`, 422, "MIN_ORDER");
      }
      deliveryFee = zone.fee;
      zoneName = zone.name;
    }

    // ---- Payment method ----
    let paymentMethod: { id: string; name: string; type: string } | null = null;
    if (input.paymentMethodId) {
      const pm = await db.paymentMethod.findFirst({
        where: { id: input.paymentMethodId, businessId: business.id, isActive: true },
      });
      if (!pm) return fail("طريقة الدفع غير متاحة", 422, "VALIDATION");
      paymentMethod = { id: pm.id, name: pm.name, type: pm.type };
    }

    const total = subtotal + deliveryFee;

    // ---- Persist (transaction + sequence retry) ----
    const publicToken = randomUUID();
    const runOrderTx = () =>
      db.$transaction(
        async (tx) => {
          // daily sequence per business — r136: الحد بوقت طرابلس (كان
          // يتبدل 02:00 ليبيا على خادم UTC)
          const dayStart = tripoliDayStart();
          const todayCount = await tx.order.count({
            where: { businessId: business.id, createdAt: { gte: dayStart } },
          });

          let created: { id: string; orderNumber: string; publicToken: string } | null = null;
          let lastErr: unknown = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            const seq = todayCount + 1 + attempt;
            try {
              created = await tx.order.create({
                data: {
                  businessId: business.id,
                  orderNumber: orderNumberFor(new Date(), seq),
                  publicToken,
                  status: "NEW",
                  fulfillmentType: input.fulfillmentType,
                  subtotal,
                  deliveryFee,
                  total,
                  paymentMethodId: paymentMethod?.id ?? null,
                  paymentMethodName: paymentMethod?.name ?? null,
                  paymentType: paymentMethod?.type ?? null,
                  paymentStatus: "UNPAID",
                  customerName: input.customerName,
                  customerPhone: phone,
                  city: input.city || null,
                  area: input.area || zoneName || null,
                  addressLine: input.addressLine || null,
                  customerNote: input.customerNote || null,
                  idempotencyKey: input.idempotencyKey,
                  source: "STOREFRONT",
                  items: { create: lineItems },
                  history: {
                    create: { fromStatus: null, toStatus: "NEW", note: "استُقبل الطلب من المتجر", changedByName: "النظام" },
                  },
                },
                select: { id: true, orderNumber: true, publicToken: true },
              });
              break;
            } catch (e) {
              lastErr = e;
              if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
              throw e;
            }
          }
          if (!created) throw lastErr ?? new Error("INSERT_FAILED");

          // customer upsert (reusable across orders)
          const customer = await tx.customer.upsert({
            where: { businessId_phone: { businessId: business.id, phone } },
            create: { businessId: business.id, name: input.customerName, phone },
            update: { name: input.customerName },
            select: { id: true },
          });
          await tx.order.update({ where: { id: created.id }, data: { customerId: customer.id } });
          if (input.fulfillmentType === "DELIVERY" && input.addressLine) {
            const existingAddr = await tx.customerAddress.findFirst({
              where: { customerId: customer.id, addressLine: input.addressLine, city: input.city || "" },
            });
            if (!existingAddr) {
              await tx.customerAddress.create({
                data: {
                  customerId: customer.id,
                  city: input.city || "",
                  area: input.area || null,
                  addressLine: input.addressLine,
                },
              });
            }
          }

          // inventory decrement
          for (const line of lineItems) {
            const p = productMap.get(line.productId)!;
            if (p.trackInventory) {
              /* r134 (W2 #1): the stock pre-check above runs OUTSIDE the tx
                 on a snapshot — two concurrent orders both passed it and
                 both decrements landed (negative stock). The decrement is
                 now CONDITIONAL inside the tx: gte guard + count assert
                 make check-and-decrement one atomic statement; a lost
                 race aborts the WHOLE order (no order rows, no decrement)
                 and re-surfaces the same STOCK copy the pre-check uses.
                 Products without stock tracking are untouched. */
              const res = await tx.product.updateMany({
                where: { id: p.id, stockQuantity: { gte: line.quantity } },
                data: { stockQuantity: { decrement: line.quantity } },
              });
              if (res.count !== 1) {
                const fresh = await tx.product.findUnique({
                  where: { id: p.id },
                  select: { stockQuantity: true },
                });
                throw new ApiFailError(
                  `الكمية المتاحة من "${p.name}" هي ${fresh?.stockQuantity ?? 0} فقط`,
                  422,
                  "STOCK"
                );
              }
            }
          }

          return { ...created, customerId: customer.id };
        },
        { isolationLevel: "Serializable" }
      );

    /* r134 (W2 #6): P2034 = serialization abort of the whole tx (the
       P2002 orderNumber loop above only handles collisions INSIDE the
       tx) — it previously escaped as a raw 500 and the storefront fell
       back to a generic internal-error toast. ONE retry of the whole tx
       (the idempotency replay above makes a re-run safe); a second
       conflict surfaces the family retry copy (checkout-client's exact
       fallback line). STOCK guards are business failures, not
       conflicts — they ride the generic throw → handleError path. */
    let order: Awaited<ReturnType<typeof runOrderTx>>;
    try {
      order = await runOrderTx();
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
        try {
          order = await runOrderTx();
        } catch (retryErr) {
          if (retryErr instanceof Prisma.PrismaClientKnownRequestError && retryErr.code === "P2034") {
            return fail("تعذّر إرسال الطلب، حاول مرة أخرى", 503, "WRITE_CONFLICT");
          }
          throw retryErr;
        }
      } else {
        throw err;
      }
    }

    // WhatsApp structured message (real channel — wa.me deep link)
    const waMessage = buildOrderMessage({
      orderNumber: order.orderNumber,
      customerName: input.customerName,
      customerPhone: phone,
      items: lineItems.map((l) => ({
        productName: l.productName,
        variantName: l.variantName,
        options: l.optionsJson ? (JSON.parse(l.optionsJson) as Array<{ name: string }>).map((o) => o.name).join("، ") : null,
        quantity: l.quantity,
        lineTotal: l.lineTotal,
      })),
      fulfillmentType: input.fulfillmentType,
      city: input.city || null,
      area: input.area || zoneName || null,
      addressLine: input.addressLine || null,
      subtotal,
      deliveryFee,
      total,
      paymentName: paymentMethod?.name ?? null,
      paymentType: paymentMethod?.type ?? null,
      customerNote: input.customerNote || null,
    });

    return ok(
      {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          publicToken: order.publicToken,
          subtotal,
          deliveryFee,
          total,
        },
        whatsapp: business.whatsappNumber
          ? { number: toE164(business.whatsappNumber), message: waMessage }
          : null,
      },
      { status: 201 }
    );
  } catch (err) {
    return handleError(err);
  }
}
