import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth, requireBusiness, requirePermission } from "@/lib/auth";
import { ok, fail, handleError, readJson, ApiFailError } from "@/lib/api";
import { parseLyd } from "@/lib/money";

export const runtime = "nodejs";

/* ── W2-D2 (plan-truth) — the business's CURRENT plan ──
 *
 * Resolved exactly the way the money path's own state does (no second
 * invention): `business.planId` is written by the platform-admin
 * subscription approval (/api/subscriptions/[id]/review), and
 * `subscriptionEnds` is that approval's expiry — a paid plan past its
 * window falls back to Free («يظل متجرك نشطاً حتى نهاية الفترة المدفوعة»).
 * A null planId (fresh/Free business — the register flow writes none)
 * resolves to the Free plan ROW: the seeded catalog is the single source
 * of the promised numbers, never a hand-rolled constant. The literal
 * 15/100 tail only covers a cold, never-seeded plans table (the /api/plans
 * self-seed may not have run) — they are the schema's own column defaults,
 * so the gate fails closed instead of fail-open. */
type PlanCaps = { name: string; nameAr: string; maxProducts: number; maxOrders: number };

async function currentPlan(tx: Prisma.TransactionClient, businessId: string): Promise<PlanCaps> {
  const biz = await tx.business.findUnique({
    where: { id: businessId },
    select: {
      subscriptionEnds: true,
      plan: { select: { name: true, nameAr: true, maxProducts: true, maxOrders: true } },
    },
  });
  const expired = !!biz?.subscriptionEnds && biz.subscriptionEnds.getTime() <= Date.now();
  if (biz?.plan && !expired) return biz.plan;
  const free = await tx.plan.findFirst({
    where: { name: "Free" },
    select: { name: true, nameAr: true, maxProducts: true, maxOrders: true },
  });
  return free ?? { name: "Free", nameAr: "مجاني", maxProducts: 15, maxOrders: 100 };
}

const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "أدخل اسم الحجم/الخيار").max(60),
  priceDelta: z.union([z.string(), z.number()]).transform((v) => {
    /* r140 (P3-2): سقف مثل سقف السعر — بلا سقف كان تاجر يدخل
       «999999999999999» فيتجاوز lineTotal (unit×99) حد
       MAX_SAFE_INTEGER ويفسد العرض والإجماليات. */
    let m: number;
    try {
      m = parseLyd(v);
    } catch {
      throw new Error("سعر إضافي غير صحيح");
    }
    if (m > 999_999_000) throw new Error("السعر الإضافي كبير جداً");
    return m;
  }),
});

const optionItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(60),
  priceDelta: z.union([z.string(), z.number()]).transform((v) => {
    // r140 (P3-2): نفس سقف السعر 999_999_000 — نفس صنف الحماية أعلاه
    let m: number;
    try {
      m = parseLyd(v);
    } catch {
      throw new Error("سعر إضافي غير صحيح");
    }
    if (m > 999_999_000) throw new Error("سعر الإضافة كبير جداً");
    return m;
  }),
});

const optionGroupSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "أدخل اسم مجموعة الإضافات").max(60),
  minSelect: z.number().int().min(0).max(10).default(0),
  maxSelect: z.number().int().min(1).max(10).default(1),
  required: z.boolean().default(false),
  options: z.array(optionItemSchema).max(20).default([]),
});

const createSchema = z.object({
  businessId: z.string().optional(),
  name: z.string().trim().min(1, "أدخل اسم المنتج").max(100),
  description: z.string().trim().max(500).optional().default(""),
  imageUrl: z.string().trim().max(300).optional().default(""),
  categoryId: z.string().trim().min(1).nullable().optional(),
  price: z.union([z.string(), z.number()]).transform((v) => {
    const m = parseLyd(v);
    if (m < 0) throw new Error("السعر لا يمكن أن يكون سالباً");
    if (m > 999_999_000) throw new Error("السعر كبير جداً");
    return m;
  }),
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  trackInventory: z.boolean().default(false),
  stockQuantity: z.number().int().min(0).max(1_000_000).default(0),
  variants: z.array(variantSchema).max(20).default([]),
  optionGroups: z.array(optionGroupSchema).max(10).default([]),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const member = await requireBusiness(user, url.searchParams.get("businessId"));
    requirePermission(member, "products.read");
    const products = await db.product.findMany({
      where: { businessId: member.businessId, isArchived: false },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        category: { select: { id: true, name: true } },
        variants: { orderBy: { sortOrder: "asc" } },
        optionGroups: { include: { options: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } },
      },
    });
    return ok({ products });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const input = createSchema.parse(await readJson(req));
    const member = await requireBusiness(user, input.businessId);
    requirePermission(member, "products.manage");

    // categoryId ownership check (P13-2d: archived categories are dead —
    // new products can only join a live one)
    if (input.categoryId) {
      const cat = await db.category.findFirst({
        where: { id: input.categoryId, businessId: member.businessId, isArchived: false },
      });
      if (!cat) return fail("القسم المحدد غير موجود", 422, "VALIDATION");
    }

    /* W2-D2 (plan-truth, R1 audit finding #1): the pricing cards promise
     * PER-PLAN maxProducts (مجاني 15 / أساسي 100 / بريميوم واحترافي
     * «غير محدود» = 9999) — the gate that lived here was a GLOBAL 500 no
     * card ever promised: a Free business could stack 485 products past
     * its promise, while a Premium business would be stopped 499 short of
     * the 9999 its card sells. The cap is now the plan's OWN maxProducts,
     * and the count runs INSIDE the create transaction — the Smart-Menu
     * reference pattern (items route, round90-F1): count and insert share
     * one tx, so two concurrent POSTs at cap−1 cannot both pass. The 500
     * backstop is retired with it: the plan cap IS the ceiling, and 9999
     * (the family's «unlimited» convention) is the sanity bound it
     * carries. Rejections answer 409 PLAN_LIMIT with the family's exact
     * cap copy (Smart-Menu plan-limit-error wording). */
    const product = await db.$transaction(async (tx) => {
      const plan = await currentPlan(tx, member.businessId);
      const count = await tx.product.count({ where: { businessId: member.businessId, isArchived: false } });
      if (count >= plan.maxProducts) {
        throw new ApiFailError(
          `لقد وصلت للحد الأقصى للمنتجات (${plan.maxProducts}) في خطتك. قم بترقية خطتك لإضافة المزيد.`,
          409,
          "PLAN_LIMIT",
        );
      }
      return tx.product.create({
        data: {
          businessId: member.businessId,
          name: input.name,
          description: input.description || null,
          imageUrl: input.imageUrl || null,
          categoryId: input.categoryId || null,
          price: input.price,
          isAvailable: input.isAvailable,
          isFeatured: input.isFeatured,
          trackInventory: input.trackInventory,
          stockQuantity: input.stockQuantity,
          sortOrder: count,
          variants: {
            create: input.variants.map((v, i) => ({ name: v.name, priceDelta: v.priceDelta, sortOrder: i })),
          },
          optionGroups: {
            create: input.optionGroups.map((g, gi) => ({
              name: g.name,
              minSelect: g.minSelect,
              maxSelect: g.maxSelect,
              required: g.required,
              sortOrder: gi,
              options: { create: g.options.map((o, oi) => ({ name: o.name, priceDelta: o.priceDelta, sortOrder: oi })) },
            })),
          },
        },
        include: {
          category: { select: { id: true, name: true } },
          variants: true,
          optionGroups: { include: { options: true } },
        },
      });
    });

    await db.auditLog.create({
      data: { businessId: member.businessId, userId: user.id, action: "PRODUCT_CREATED", entity: "Product", entityId: product.id, metadata: JSON.stringify({ name: product.name }) },
    });

    return ok({ product }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
