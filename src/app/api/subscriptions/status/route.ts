import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, handleError } from "@/lib/api";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/subscriptions/status?id=… — payment status poll (family
 * usePaymentStatusPoll twin). Session-scoped: only the payer or a platform
 * admin can read the record. Poll pauses when the tab is hidden (client).
 */
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id") || "";
    if (!id) return fail("معرّف الدفع مطلوب", 422, "VALIDATION");

    const user = await requireAuth();
    const payment = await db.subscriptionPayment.findUnique({ where: { id } });
    if (!payment) return fail("طلب الدفع غير موجود", 404);

    const isReviewer = user.isPlatformAdmin;
    // Payer = member of the business the payment belongs to (reviewers are admins)
    let isPayer = false;
    if (payment.businessId) {
      const member = await db.businessMember.findFirst({
        where: { businessId: payment.businessId, userId: user.id },
      });
      isPayer = !!member;
    }
    if (!isReviewer && !isPayer) return fail("غير مصرح", 403);

    return ok({
      id: payment.id,
      status: payment.status,
      note: payment.reviewNote,
      planName: payment.planName,
    });
  } catch (err) {
    return handleError(err);
  }
}
