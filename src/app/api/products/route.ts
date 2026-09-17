import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireBusiness, requirePermission } from "@/lib/auth";
import { ok, fail, handleError, readJson } from "@/lib/api";
import { parseLyd } from "@/lib/money";

export const runtime = "nodejs";

const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "أدخل اسم الحجم/الخيار").max(60),
  priceDelta: z.union([z.string(), z.number()]).transform((v) => {
    try { return parseLyd(v); } catch { throw new Error("سعر إضافي غير صحيح"); }
  }),
});

const optionItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(60),
  priceDelta: z.union([z.string(), z.number()]).transform((v) => {
    try { return parseLyd(v); } catch { throw new Error("سعر إضافي غير صحيح"); }
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

    const count = await db.product.count({ where: { businessId: member.businessId, isArchived: false } });
    if (count >= 500) return fail("وصلت للحد الأقصى من المنتجات (500)", 422);

    // categoryId ownership check
    if (input.categoryId) {
      const cat = await db.category.findFirst({
        where: { id: input.categoryId, businessId: member.businessId },
      });
      if (!cat) return fail("القسم المحدد غير موجود", 422, "VALIDATION");
    }

    const product = await db.product.create({
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

    await db.auditLog.create({
      data: { businessId: member.businessId, userId: user.id, action: "PRODUCT_CREATED", entity: "Product", entityId: product.id, metadata: JSON.stringify({ name: product.name }) },
    });

    return ok({ product }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
