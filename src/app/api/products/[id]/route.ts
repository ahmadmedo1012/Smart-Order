import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireBusiness, requirePermission } from "@/lib/auth";
import { ok, fail, handleError, readJson } from "@/lib/api";
import { parseLyd } from "@/lib/money";

export const runtime = "nodejs";

const patchSchema = z.object({
  businessId: z.string().optional(),
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  imageUrl: z.string().trim().max(300).nullable().optional(),
  categoryId: z.string().nullable().optional(),
  price: z.union([z.string(), z.number()]).transform((v) => {
    const m = parseLyd(v);
    if (m < 0) throw new Error("السعر لا يمكن أن يكون سالباً");
    return m;
  }).optional(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  trackInventory: z.boolean().optional(),
  stockQuantity: z.number().int().min(0).max(1_000_000).optional(),
  isArchived: z.boolean().optional(),
  variants: z.array(z.object({
    id: z.string().optional(),
    name: z.string().trim().min(1).max(60),
    priceDelta: z.union([z.string(), z.number()]).transform((v) => { try { return parseLyd(v); } catch { throw new Error("سعر غير صحيح"); } }),
  })).max(20).optional(),
  optionGroups: z.array(z.object({
    id: z.string().optional(),
    name: z.string().trim().min(1).max(60),
    minSelect: z.number().int().min(0).max(10),
    maxSelect: z.number().int().min(1).max(10),
    required: z.boolean(),
    options: z.array(z.object({
      id: z.string().optional(),
      name: z.string().trim().min(1).max(60),
      priceDelta: z.union([z.string(), z.number()]).transform((v) => { try { return parseLyd(v); } catch { throw new Error("سعر غير صحيح"); } }),
    })).max(20),
  })).max(10).optional(),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireAuth();
    const url = new URL(req.url);
    const member = await requireBusiness(user, url.searchParams.get("businessId"));
    requirePermission(member, "products.read");
    const product = await db.product.findFirst({
      where: { id, businessId: member.businessId }, // tenant isolation
      include: {
        category: { select: { id: true, name: true } },
        variants: { orderBy: { sortOrder: "asc" } },
        optionGroups: { include: { options: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } },
      },
    });
    if (!product) return fail("المنتج غير موجود", 404, "NOT_FOUND");
    return ok({ product });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireAuth();
    const input = patchSchema.parse(await readJson(req));
    const member = await requireBusiness(user, input.businessId);
    requirePermission(member, "products.manage");

    const product = await db.product.findFirst({ where: { id, businessId: member.businessId } });
    if (!product) return fail("المنتج غير موجود", 404, "NOT_FOUND");

    if (input.categoryId) {
      const cat = await db.category.findFirst({ where: { id: input.categoryId, businessId: member.businessId } });
      if (!cat) return fail("القسم المحدد غير موجود", 422, "VALIDATION");
    }

    const { businessId: _b, variants, optionGroups, ...scalar } = input;

    const updated = await db.$transaction(async (tx) => {
      const p = await tx.product.update({ where: { id }, data: scalar });

      if (variants) {
        // replace-all strategy (simple, correct for editor UX)
        await tx.productVariant.deleteMany({ where: { productId: id } });
        if (variants.length > 0) {
          await tx.productVariant.createMany({
            data: variants.map((v, i) => ({ productId: id, name: v.name, priceDelta: v.priceDelta, sortOrder: i })),
          });
        }
      }

      if (optionGroups) {
        const existingGroups = await tx.optionGroup.findMany({ where: { productId: id }, select: { id: true } });
        await tx.optionItem.deleteMany({ where: { groupId: { in: existingGroups.map((g) => g.id) } } });
        await tx.optionGroup.deleteMany({ where: { productId: id } });
        for (const [gi, g] of optionGroups.entries()) {
          const createdGroup = await tx.optionGroup.create({
            data: {
              productId: id, name: g.name, minSelect: g.minSelect,
              maxSelect: g.maxSelect, required: g.required, sortOrder: gi,
            },
          });
          if (g.options.length > 0) {
            await tx.optionItem.createMany({
              data: g.options.map((o, oi) => ({ groupId: createdGroup.id, name: o.name, priceDelta: o.priceDelta, sortOrder: oi })),
            });
          }
        }
      }

      return tx.product.findUnique({
        where: { id },
        include: {
          category: { select: { id: true, name: true } },
          variants: { orderBy: { sortOrder: "asc" } },
          optionGroups: { include: { options: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } },
        },
      });
    });

    return ok({ product: updated });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireAuth();
    const url = new URL(req.url);
    const member = await requireBusiness(user, url.searchParams.get("businessId"));
    requirePermission(member, "products.manage");
    const product = await db.product.findFirst({ where: { id, businessId: member.businessId } });
    if (!product) return fail("المنتج غير موجود", 404, "NOT_FOUND");
    // archive, never hard-delete (orders reference snapshots but analytics benefit)
    await db.product.update({ where: { id }, data: { isArchived: true, isAvailable: false } });
    return ok({ archived: true });
  } catch (err) {
    return handleError(err);
  }
}
