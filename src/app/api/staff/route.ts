// Staff management — create accounts with role, enforce OWNER-only management.
// Password set at creation by owner (invitation-less flow for non-technical owners).

import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth, requireBusiness, requirePermission } from "@/lib/auth";
import { ok, fail, handleError, readJson, ApiFailError } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

/* ── W2-D2 (plan-truth) — the business's CURRENT plan ──
 *
 * Resolved exactly the way the subscription state itself does (no second
 * invention): `business.planId` is written by the platform-admin approval
 * (/api/subscriptions/[id]/review), `subscriptionEnds` is that approval's
 * expiry — a paid plan past its window falls back to Free («يظل متجرك
 * نشطاً حتى نهاية الفترة المدفوعة»), and a null planId (the register
 * flow writes none) resolves to the Free plan ROW, the seeded catalog
 * being the single source of the promised numbers. The 15/100 literal
 * tail only covers a cold, never-seeded plans table — the schema's own
 * column defaults, so the gate fails closed instead of fail-open. */
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

/* W2-D2 (honesty note): the plans table carries NO team-seat column — the
 * pricing cards are the only source of the promise: Premium sells
 * «حسابات فريق (3 أعضاء)» and Pro sells «فريق غير محدود»; Free and Basic
 * make NO team promise at all (the owner account alone). Seats are derived
 * from the plan NAME against the family catalog and fail CLOSED — an
 * unrecognized plan gets owner-only. 9999 is the family's «unlimited»
 * convention (plan-types UNLIMITED_*). This is the closest truthful
 * enforcement of the copy, documented rather than silently invented. */
const UNLIMITED_SEATS = 9999;
const TEAM_SEATS_BY_PLAN: Record<string, number> = { Premium: 3, Pro: UNLIMITED_SEATS };

function teamSeatsFor(planName: string): number {
  return TEAM_SEATS_BY_PLAN[planName] ?? 1; // Free / Basic / unknown: owner only
}

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

    /* W2-D2 (plan-truth, R1 audit finding #1): the cards promise team
     * seats per plan («حسابات فريق (3 أعضاء)» on Premium / «فريق غير
     * محدود» on Pro) — this route had no gate at all. The seat count and
     * the membership insert now share ONE transaction (the Smart-Menu
     * in-tx reference pattern), and the user row is created only when a
     * seat is actually available — a refused add no longer leaves an
     * orphan account behind (the old flow created the user first).
     *
     * W3-F (P21-W3-F): READ COMMITTED still admits the phantom race
     * (two adds at seats−1 both count, both insert) — same portable row
     * lock as the products gate: the business-row UPDATE holds the X
     * lock to commit on BOTH engines (SQLite write lock / Postgres row
     * lock), so the twin re-counts after the first commits and the
     * gate fires. */
    const membership = await db.$transaction(async (tx) => {
      await tx.business.update({ where: { id: member.businessId }, data: { updatedAt: new Date() } });
      const plan = await currentPlan(tx, member.businessId);
      const seats = teamSeatsFor(plan.name);
      const memberCount = await tx.businessMember.count({ where: { businessId: member.businessId } });
      if (memberCount >= seats) {
        if (seats <= 1) {
          throw new ApiFailError(
            "حسابات الفريق متاحة من باقة بريميوم — قم بترقية خطتك لإضافة أعضاء الفريق",
            409,
            "PLAN_LIMIT",
          );
        }
        throw new ApiFailError(
          `لقد وصلت للحد الأقصى لأعضاء الفريق (${seats}) في خطة «${plan.nameAr}». قم بترقية خطتك لإضافة المزيد.`,
          409,
          "PLAN_LIMIT",
        );
      }

      const existingUser = await tx.user.findUnique({ where: { email: input.email } });
      const userId =
        existingUser?.id ??
        (
          await tx.user.create({
            data: { email: input.email, name: input.name, passwordHash: hashPassword(input.password) },
          })
        ).id;

      const existingMembership = await tx.businessMember.findUnique({
        where: { businessId_userId: { businessId: member.businessId, userId } },
      });
      if (existingMembership) throw new ApiFailError("هذا المستخدم عضو في الفريق مسبقاً", 409, "DUPLICATE");

      const created = await tx.businessMember.create({
        data: { businessId: member.businessId, userId, role: input.role },
        include: { user: { select: { id: true, email: true, name: true } } },
      });
      /* W3-F: the audit row rides the same tx as the mutation it
         describes (the r134/W2-#13 doctrine — the orders PATCH route is
         the executed precedent). */
      await tx.auditLog.create({
        data: {
          businessId: member.businessId,
          userId: user.id,
          action: "STAFF_ADDED",
          entity: "BusinessMember",
          entityId: created.id,
          metadata: JSON.stringify({ role: input.role, email: input.email }),
        },
      });
      return created;
    });

    return ok({ staff: membership }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
