import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireBusiness, requirePermission } from "@/lib/auth";
import { ok, fail, handleError, readJson } from "@/lib/api";
import { ROLES, ROLE_PERMISSIONS } from "@/lib/constants";

export const runtime = "nodejs";

const patchSchema = z.object({
  businessId: z.string().optional(),
  role: z.enum(ROLES).optional(),
  extraPerms: z.array(z.string()).max(12).optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireAuth();
    const input = patchSchema.parse(await readJson(req));
    const member = await requireBusiness(user, input.businessId);
    requirePermission(member, "staff.manage");

    const target = await db.businessMember.findFirst({
      where: { id, businessId: member.businessId },
    });
    if (!target) return fail("العضو غير موجود", 404, "NOT_FOUND");
    if (target.role === "OWNER") return fail("لا يمكن تعديل صلاحيات المالك", 403);

    const data: Record<string, unknown> = {};
    if (input.role && input.role !== "OWNER") data.role = input.role;
    if (input.extraPerms) {
      const valid = ROLE_PERMISSIONS.STAFF; // extra perms meaningful mostly for staff
      data.extraPerms = input.extraPerms.filter((p) => (valid as readonly string[]).includes(p)).join(",");
    }

    const updated = await db.businessMember.update({ where: { id }, data });
    return ok({ staff: updated });
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
    requirePermission(member, "staff.manage");
    const target = await db.businessMember.findFirst({ where: { id, businessId: member.businessId } });
    if (!target) return fail("العضو غير موجود", 404, "NOT_FOUND");
    if (target.role === "OWNER") return fail("لا يمكن إزالة المالك", 403);
    await db.businessMember.delete({ where: { id } });
    return ok({ removed: true });
  } catch (err) {
    return handleError(err);
  }
}
