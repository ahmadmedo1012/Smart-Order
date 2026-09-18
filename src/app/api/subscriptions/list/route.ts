import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, handleError } from "@/lib/api";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/subscriptions/list?status=PENDING — platform-admin payment queue
 * (family twin of the Smart Menu admin subscriptions list).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user.isPlatformAdmin) return fail("غير مصرح — أدمن المنصة فقط", 403);

    const status = req.nextUrl.searchParams.get("status") || "PENDING";
    if (!["PENDING", "APPROVED", "REJECTED", "ALL"].includes(status)) {
      return fail("حالة غير صالحة", 422, "VALIDATION");
    }

    const payments = await db.subscriptionPayment.findMany({
      where: status === "ALL" ? {} : { status },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        planName: true,
        amount: true,
        provider: true,
        status: true,
        phone: true,
        senderAccountName: true,
        senderAccountNumber: true,
        receiptImageUrl: true,
        createdAt: true,
        reviewedAt: true,
        business: { select: { id: true, name: true, slug: true } },
      },
    });

    return ok({ payments });
  } catch (err) {
    return handleError(err);
  }
}
