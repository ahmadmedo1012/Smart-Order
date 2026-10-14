import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireBusiness, requirePermission } from "@/lib/auth";
import { ok, fail, handleError, readJson } from "@/lib/api";

export const runtime = "nodejs";

/* P13-2d (P0, audit NEW finding): /api/categories/[id] never existed —
 * the dashboard categories page PATCH (categories/page.tsx:258) + DELETE
 * (:162) and onboarding DELETE (onboarding/page.tsx:362) all 404'd while
 * the ConfirmDialog promised archive-if-products semantics
 * («سيُؤرشف القسم إن كان يحتوي منتجات، وإلا يُحذف نهائياً»).
 * Modeled on delivery-zones/[id] + products/[id]: tenant isolation rides
 * businessId in every where clause (the writes themselves carry it —
 * CAS-style updateMany/deleteMany, so a write can never cross tenants
 * even if the pre-check raced), permission = categories.manage
 * (the POST verb's own guard). Category.isArchived already exists
 * (schema.prisma:146 / schema.postgres.prisma:148) and every category
 * list/read path already filters it — no migration needed. */

const patchSchema = z.object({
  businessId: z.string().optional(),
  name: z.string().trim().min(1, "أدخل اسم القسم").max(60).optional(),
  description: z.string().trim().max(200).nullable().optional(),
  imageUrl: z.string().trim().max(300).nullable().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireAuth();
    const input = patchSchema.parse(await readJson(req));
    const member = await requireBusiness(user, input.businessId);
    requirePermission(member, "categories.manage");
    const category = await db.category.findFirst({ where: { id, businessId: member.businessId } });
    if (!category) return fail("القسم غير موجود", 404, "NOT_FOUND");
    const { businessId: _b, ...data } = input;
    const updated = await db.category.update({ where: { id }, data });
    return ok({ category: updated });
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
    requirePermission(member, "categories.manage");
    const category = await db.category.findFirst({ where: { id, businessId: member.businessId } });
    if (!category) return fail("القسم غير موجود", 404, "NOT_FOUND");

    /* The UI's promise: products inside → archive, else hard delete.
     * ALL products count (archived ones included): a row that still
     * references the category must never lose it to a hard delete —
     * the archive branch keeps products' categoryId valid (the
     * products/[id] DELETE «archive, never hard-delete» recipe). */
    const products = await db.product.count({
      where: { categoryId: id, businessId: member.businessId },
    });

    if (products > 0) {
      await db.category.updateMany({
        where: { id, businessId: member.businessId },
        data: { isArchived: true, isActive: false },
      });
      return ok({ archived: true });
    }

    await db.category.deleteMany({ where: { id, businessId: member.businessId } });
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
