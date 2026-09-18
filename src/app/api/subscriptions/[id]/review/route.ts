import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handleError, readJson } from "@/lib/api";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  note: z.string().max(300).optional(),
});

/**
 * POST /api/subscriptions/[id]/review — platform-admin approval flow
 * (family twin of the Smart Menu admin subscription approvals). On APPROVE:
 * the business is upgraded to the plan with subscriptionEnds = now + period.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    if (!user.isPlatformAdmin) return fail("غير مصرح — أدمن المنصة فقط", 403);

    const input = schema.parse(await readJson(req));
    const payment = await db.subscriptionPayment.findUnique({ where: { id } });
    if (!payment) return fail("طلب الدفع غير موجود", 404);
    if (payment.status !== "PENDING") return fail("تمت مراجعة هذا الطلب مسبقاً", 409);

    if (input.action === "APPROVE") {
      const plan = await db.plan.findUnique({ where: { id: payment.planId } });
      const ends =
        plan && plan.periodDays > 0 ? new Date(Date.now() + plan.periodDays * 24 * 60 * 60 * 1000) : null;

      await db.$transaction([
        db.subscriptionPayment.update({
          where: { id },
          data: {
            status: "APPROVED",
            reviewedById: user.id,
            reviewNote: input.note || null,
            reviewedAt: new Date(),
          },
        }),
        ...(payment.businessId
          ? [
              db.business.update({
                where: { id: payment.businessId },
                data: { planId: payment.planId, subscriptionEnds: ends },
              }),
            ]
          : []),
      ]);

      return ok({ status: "APPROVED" });
    }

    await db.subscriptionPayment.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewedById: user.id,
        reviewNote: input.note || null,
        reviewedAt: new Date(),
      },
    });
    return ok({ status: "REJECTED" });
  } catch (err) {
    return handleError(err);
  }
}
