import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handleError, readJson, ApiFailError } from "@/lib/api";
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

      /* W3-F (P21-W3-F): the PENDING pre-check above is a read-then-write
         window — two platform admins reviewing the same payment
         concurrently both passed it and both approvals applied (the
         business row written twice, one payment silently double-applied).
         The write is now CONDITIONAL on the snapshot still holding
         (status: "PENDING" in the updateMany where clause — the orders
         PATCH CAS recipe), and the business upgrade rides the SAME
         transaction so the plan change and the approval stamp commit
         atomically. The loser gets the same "already reviewed" copy the
         pre-check serves. */
      const result = await db.$transaction(async (tx) => {
        const cas = await tx.subscriptionPayment.updateMany({
          where: { id, status: "PENDING" },
          data: {
            status: "APPROVED",
            reviewedById: user.id,
            reviewNote: input.note || null,
            reviewedAt: new Date(),
          },
        });
        if (cas.count !== 1) {
          throw new ApiFailError("تمت مراجعة هذا الطلب مسبقاً", 409, "ALREADY_REVIEWED");
        }
        if (payment.businessId) {
          await tx.business.update({
            where: { id: payment.businessId },
            data: { planId: payment.planId, subscriptionEnds: ends },
          });
        }
        return { status: "APPROVED" as const };
      });

      return ok(result);
    }

    /* W3-F: same CAS for the reject branch — the plain update could
       overwrite a concurrent APPROVE (a rejection stamping over an
       approved payment that already upgraded the business). */
    const casReject = await db.subscriptionPayment.updateMany({
      where: { id, status: "PENDING" },
      data: {
        status: "REJECTED",
        reviewedById: user.id,
        reviewNote: input.note || null,
        reviewedAt: new Date(),
      },
    });
    if (casReject.count !== 1) {
      return fail("تمت مراجعة هذا الطلب مسبقاً", 409, "ALREADY_REVIEWED");
    }
    return ok({ status: "REJECTED" });
  } catch (err) {
    return handleError(err);
  }
}
