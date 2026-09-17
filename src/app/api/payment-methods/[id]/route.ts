import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireBusiness, requirePermission } from "@/lib/auth";
import { ok, fail, handleError, readJson } from "@/lib/api";
import { normalizeLibyanPhone } from "@/lib/phone";

export const runtime = "nodejs";

const patchSchema = z.object({
  businessId: z.string().optional(),
  name: z.string().trim().min(1).max(60).optional(),
  instructions: z.string().trim().max(300).nullable().optional(),
  number: z.string().trim().max(20).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireAuth();
    const input = patchSchema.parse(await readJson(req));
    const member = await requireBusiness(user, input.businessId);
    requirePermission(member, "payments.manage");
    const method = await db.paymentMethod.findFirst({ where: { id, businessId: member.businessId } });
    if (!method) return fail("طريقة الدفع غير موجودة", 404, "NOT_FOUND");

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.instructions !== undefined) data.instructions = input.instructions;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.number !== undefined && input.number !== "") {
      const normalized = normalizeLibyanPhone(input.number);
      if (!normalized) return fail("رقم التحويل غير صحيح — مثال: 0912345678", 422, "VALIDATION");
      data.config = JSON.stringify({ number: normalized });
    }

    const updated = await db.paymentMethod.update({ where: { id }, data });
    return ok({ method: updated });
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
    requirePermission(member, "payments.manage");
    const method = await db.paymentMethod.findFirst({ where: { id, businessId: member.businessId } });
    if (!method) return fail("طريقة الدفع غير موجودة", 404, "NOT_FOUND");
    await db.paymentMethod.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
