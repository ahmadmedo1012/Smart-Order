import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handleError, readJson } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  planId: z.string().min(1),
  provider: z.enum(["libyana", "madar", "bank"]),
  amount: z.number().int().min(0).max(100000),
  phone: z.string().max(20).optional(),
  senderAccountName: z.string().max(120).optional(),
  senderAccountNumber: z.string().max(60).optional(),
  receiptImageUrl: z.string().max(500).optional(),
  businessId: z.string().optional(),
});

/**
 * POST /api/subscriptions — create a PENDING subscription payment
 * (family twin of Smart Menu /api/subscriptions). Requires a session;
 * attaches the business when provided. Admin approval resolves it.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const rl = rateLimit(`subpay:${ip}`, 10, 10 * 60 * 1000);
    if (!rl.ok) return fail("عدد كبير من المحاولات، انتظر قليلاً", 429);

    const user = await requireAuth();
    const input = schema.parse(await readJson(req));

    const plan = await db.plan.findUnique({ where: { id: input.planId } });
    if (!plan || !plan.isActive) return fail("الخطة غير موجودة", 404);

    if (plan.price === 0) return fail("الخطة المجانية لا تحتاج دفعاً", 422, "VALIDATION");

    // Amount must match the plan price (server is the source of truth)
    if (input.amount !== plan.price) return fail("المبلغ لا يطابق سعر الخطة", 422, "VALIDATION");

    // Wallet flow requires the sender phone; bank flow requires account fields
    if (input.provider !== "bank" && !input.phone?.trim()) {
      return fail("يرجى إدخال رقم هاتفك", 422, "VALIDATION");
    }
    if (input.provider === "bank") {
      if (!input.senderAccountName?.trim()) return fail("يرجى إدخال اسم صاحب الحساب", 422, "VALIDATION");
      if (!input.senderAccountNumber?.trim()) return fail("يرجى إدخال رقم الحساب", 422, "VALIDATION");
    }

    // Attach business if provided and user is a member
    let businessId: string | null = null;
    if (input.businessId) {
      const member = await db.businessMember.findFirst({
        where: { businessId: input.businessId, userId: user.id },
      });
      if (member) businessId = member.businessId;
    } else {
      const member = await db.businessMember.findFirst({
        where: { userId: user.id, role: "OWNER" },
      });
      if (member) businessId = member.businessId;
    }

    const payment = await db.subscriptionPayment.create({
      data: {
        planId: plan.id,
        planName: plan.name,
        amount: plan.price,
        provider: input.provider.toUpperCase(),
        phone: input.phone?.trim() || null,
        senderAccountName: input.senderAccountName?.trim() || null,
        senderAccountNumber: input.senderAccountNumber?.trim() || null,
        receiptImageUrl: input.receiptImageUrl || null,
        businessId,
        status: "PENDING",
      },
    });

    return ok({ id: payment.id, status: payment.status }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
