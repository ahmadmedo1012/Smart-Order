// Staff management — create accounts with role, enforce OWNER-only management.
// Password set at creation by owner (invitation-less flow for non-technical owners).

import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireBusiness, requirePermission } from "@/lib/auth";
import { ok, fail, handleError, readJson } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

const createSchema = z.object({
  businessId: z.string().optional(),
  name: z.string().trim().min(2, "أدخل اسم الموظف").max(80),
  email: z.string().trim().toLowerCase().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل").max(100),
  role: z.enum(ROLES).default("STAFF"),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const member = await requireBusiness(user, url.searchParams.get("businessId"));
    requirePermission(member, "staff.manage");

    const staff = await db.businessMember.findMany({
      where: { businessId: member.businessId },
      include: {
        user: { select: { id: true, email: true, name: true, phone: true, createdAt: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return ok({
      staff: staff.map((s) => ({
        id: s.id,
        role: s.role,
        extraPerms: s.extraPerms,
        createdAt: s.createdAt,
        user: s.user,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const input = createSchema.parse(await readJson(req));
    const member = await requireBusiness(user, input.businessId);
    requirePermission(member, "staff.manage");
    if (input.role === "OWNER") return fail("لا يمكن إنشاء مالك إضافي بهذه الطريقة", 403);

    const existingUser = await db.user.findUnique({ where: { email: input.email } });
    const userId =
      existingUser?.id ??
      (
        await db.user.create({
          data: { email: input.email, name: input.name, passwordHash: hashPassword(input.password) },
        })
      ).id;

    const existingMembership = await db.businessMember.findUnique({
      where: { businessId_userId: { businessId: member.businessId, userId } },
    });
    if (existingMembership) return fail("هذا المستخدم عضو في الفريق مسبقاً", 409, "DUPLICATE");

    const membership = await db.businessMember.create({
      data: { businessId: member.businessId, userId, role: input.role },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    await db.auditLog.create({
      data: {
        businessId: member.businessId,
        userId: user.id,
        action: "STAFF_ADDED",
        entity: "BusinessMember",
        entityId: membership.id,
        metadata: JSON.stringify({ role: input.role, email: input.email }),
      },
    });

    return ok({ staff: membership }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
