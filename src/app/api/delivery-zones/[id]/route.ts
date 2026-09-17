import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireBusiness, requirePermission } from "@/lib/auth";
import { ok, fail, handleError, readJson } from "@/lib/api";
import { parseLyd } from "@/lib/money";

export const runtime = "nodejs";

const patchSchema = z.object({
  businessId: z.string().optional(),
  name: z.string().trim().min(1).max(60).optional(),
  fee: z.union([z.string(), z.number()]).transform((v) => {
    const m = parseLyd(v);
    if (m < 0 || m > 500_000) throw new Error("رسوم غير صحيحة");
    return m;
  }).optional(),
  minOrder: z.union([z.string(), z.number()]).optional().transform((v) => {
    if (v === undefined || v === null || v === "") return 0;
    const m = parseLyd(v);
    if (m < 0) throw new Error("قيمة غير صحيحة");
    return m;
  }).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireAuth();
    const input = patchSchema.parse(await readJson(req));
    const member = await requireBusiness(user, input.businessId);
    requirePermission(member, "delivery.manage");
    const zone = await db.deliveryZone.findFirst({ where: { id, businessId: member.businessId } });
    if (!zone) return fail("المنطقة غير موجودة", 404, "NOT_FOUND");
    const { businessId: _b, ...data } = input;
    const updated = await db.deliveryZone.update({ where: { id }, data });
    return ok({ zone: updated });
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
    requirePermission(member, "delivery.manage");
    const zone = await db.deliveryZone.findFirst({ where: { id, businessId: member.businessId } });
    if (!zone) return fail("المنطقة غير موجودة", 404, "NOT_FOUND");
    await db.deliveryZone.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
