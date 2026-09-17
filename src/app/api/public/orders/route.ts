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
import { ok, fail, handleError, readJson } from "@/lib/api";
import { normalizeLibyanPhone, phoneDigits, toE164 } from "@/lib/phone";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { MAX_ORDER_ITEMS, MAX_ORDER_QUANTITY } from "@/lib/constants";
import { buildOrderMessage } from "@/lib/whatsapp";
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
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `SO-${y}${m}${d}-${String(seq).padStart(4, "0")}`;
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const rl = rateLimit(`order:${ip}`, 8, 60 * 1000);
    if (!rl.ok) return fail("طلبات كثيرة جداً في وقت قصير، انتظر قليلاً", 429);

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
    const order = await db.$transaction(
      async (tx) => {
        // daily sequence per business
        const dayStart = new Date();
        dayStart.setHours(0, 0, 0, 0);
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
            await tx.product.update({
              where: { id: p.id },
              data: { stockQuantity: { decrement: line.quantity } },
            });
          }
        }

        return { ...created, customerId: customer.id };
      },
      { isolationLevel: "Serializable" }
    );

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
