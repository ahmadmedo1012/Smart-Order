import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireBusiness, requirePermission } from "@/lib/auth";
import { ok, fail, handleError, readJson, ApiFailError } from "@/lib/api";
import { canTransition, canMarkPaid, isTerminal } from "@/lib/order-machine";
import { ORDER_STATUSES, PAYMENT_STATUSES, type OrderStatus, type PaymentStatus } from "@/lib/constants";

export const runtime = "nodejs";

const patchSchema = z.object({
  businessId: z.string().optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  internalNote: z.string().trim().max(500).nullable().optional(),
  statusNote: z.string().trim().max(300).optional(),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireAuth();
    const url = new URL(req.url);
    const member = await requireBusiness(user, url.searchParams.get("businessId"));
    requirePermission(member, "orders.read");

    const order = await db.order.findFirst({
      where: { id, businessId: member.businessId }, // tenant isolation — IDOR-safe
      include: {
        items: true,
        history: { orderBy: { createdAt: "asc" } },
        customer: { select: { id: true, name: true, phone: true, notes: true } },
        business: { select: { id: true, name: true, slug: true, whatsappNumber: true, phone: true } },
      },
    });
    if (!order) return fail("الطلب غير موجود", 404, "NOT_FOUND");
    return ok({ order });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireAuth();
    const input = patchSchema.parse(await readJson(req));
    const member = await requireBusiness(user, input.businessId);

    const order = await db.order.findFirst({
      where: { id, businessId: member.businessId },
      select: { id: true, status: true, paymentStatus: true, fulfillmentType: true, orderNumber: true },
    });
    if (!order) return fail("الطلب غير موجود", 404, "NOT_FOUND");

    const updates: Record<string, unknown> = {};

    if (input.status && input.status !== order.status) {
      requirePermission(member, "orders.update");
      const to = input.status as OrderStatus;
      const from = order.status as OrderStatus;
      if (isTerminal(from)) {
        return fail("لا يمكن تغيير حالة طلب منتهٍ", 409, "INVALID_TRANSITION");
      }
      if (!canTransition(from, to, order.fulfillmentType as "DELIVERY" | "PICKUP")) {
        return fail("انتقال غير صالح لهذه الحالة", 409, "INVALID_TRANSITION");
      }
      /* r134 (W2 #2): destructive transitions additionally need
         orders.cancel — the permission was declared (constants.ts) but
         never enforced, so STAFF (orders.update only) could cancel /
         reject orders straight through the API even though the UI
         hides those actions. */
      if (to === "CANCELLED" || to === "REJECTED") {
        requirePermission(member, "orders.cancel");
      }
      updates.status = to;
    }

    if (input.paymentStatus && input.paymentStatus !== order.paymentStatus) {
      requirePermission(member, "payments.manage");
      const to = input.paymentStatus as PaymentStatus;
      if (to === "PAID" && !canMarkPaid(order.status as OrderStatus)) {
        return fail("لا يمكن وضع علامة مدفوع على طلب ملغي", 409, "INVALID_TRANSITION");
      }
      /* r134 (W2 #4): the payment-state machine had server gaps the UI
         already blocks (orders/[id]/page.tsx shows REFUNDED only on PAID):
         REFUNDED requires the order to be PAID first, and REFUNDED is
         terminal — no payment transitions out of it (covers
         PAID-from-REFUNDED). */
      if (order.paymentStatus === "REFUNDED") {
        return fail("لا يمكن تغيير حالة الدفع لطلب مسترجع المبلغ", 409, "INVALID_TRANSITION");
      }
      if (to === "REFUNDED" && order.paymentStatus !== "PAID") {
        return fail("لا يمكن تسجيل استرجاع المبلغ لطلب غير مدفوع", 409, "INVALID_TRANSITION");
      }
      updates.paymentStatus = to;
    }

    if (input.internalNote !== undefined) {
      requirePermission(member, "orders.update");
      updates.internalNote = input.internalNote;
    }

    if (Object.keys(updates).length === 0) {
      return fail("لا توجد تغييرات", 400);
    }

    const updated = await db.$transaction(async (tx) => {
      /* r134 (W2 #5): CAS — the guards above validated the request
         against the snapshot read at the top; the write is now
         CONDITIONAL on that snapshot still holding (`status` in the
         where clause), so a concurrent PATCH that moved the row between
         the read and the write wins for its request and this one
         surfaces the existing transition-conflict copy (Smart-Menu's
         orders updateMany recipe). updateMany returns only a count —
         the row is re-read for the response. */
      const cas = await tx.order.updateMany({
        where: { id, status: order.status },
        data: updates,
      });
      if (cas.count !== 1) {
        throw new ApiFailError("انتقال غير صالح لهذه الحالة", 409, "INVALID_TRANSITION");
      }
      const o = await tx.order.findUnique({ where: { id } });
      if (!o) throw new ApiFailError("الطلب غير موجود", 404, "NOT_FOUND");
      if (updates.status) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: id,
            fromStatus: order.status,
            toStatus: updates.status as string,
            note: input.statusNote ?? null,
            changedById: user.id,
            changedByName: user.name,
          },
        });
      }
      if (updates.paymentStatus) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: id,
            fromStatus: null,
            toStatus: updates.status ? (updates.status as string) : order.status,
            note:
              updates.paymentStatus === "PAID"
                ? "تم تأكيد استلام الدفع"
                : updates.paymentStatus === "REFUNDED"
                  ? "تم تسجيل استرجاع المبلغ"
                  : "أُعيدت حالة الدفع إلى غير مدفوع",
            changedById: user.id,
            changedByName: user.name,
          },
        });
      }
      /* r134 (W2 #13): the audit row used to be written AFTER the
         transaction — a crash between the two left the mutation
         un-audited. It now rides the same $transaction and commits
         atomically with the mutation it describes. */
      await tx.auditLog.create({
        data: {
          businessId: member.businessId,
          userId: user.id,
          action: "ORDER_UPDATED",
          entity: "Order",
          entityId: id,
          metadata: JSON.stringify({ ...updates }),
        },
      });
      return o;
    });

    return ok({ order: updated });
  } catch (err) {
    return handleError(err);
  }
}
