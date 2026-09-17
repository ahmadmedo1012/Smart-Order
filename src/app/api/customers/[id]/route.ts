import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireBusiness, requirePermission } from "@/lib/auth";
import { ok, fail, handleError, readJson } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireAuth();
    const url = new URL(req.url);
    const member = await requireBusiness(user, url.searchParams.get("businessId"));
    requirePermission(member, "customers.read");

    const customer = await db.customer.findFirst({
      where: { id, businessId: member.businessId }, // tenant isolation
      include: {
        addresses: true,
        orders: {
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            id: true, orderNumber: true, status: true, total: true,
            paymentStatus: true, fulfillmentType: true, createdAt: true,
          },
        },
      },
    });
    if (!customer) return fail("العميل غير موجود", 404, "NOT_FOUND");

    const completed = customer.orders.filter((o) => o.status === "DELIVERED");
    const totalSpent = completed.reduce((s, o) => s + o.total, 0);

    return ok({
      customer: {
        ...customer,
        stats: {
          orderCount: customer.orders.length,
          totalSpent,
          avgOrder: completed.length > 0 ? Math.round(totalSpent / completed.length) : 0,
        },
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

const patchSchema = z.object({
  businessId: z.string().optional(),
  name: z.string().trim().min(2).max(80).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireAuth();
    const input = patchSchema.parse(await readJson(req));
    const member = await requireBusiness(user, input.businessId);
    requirePermission(member, "customers.manage");
    const customer = await db.customer.findFirst({ where: { id, businessId: member.businessId } });
    if (!customer) return fail("العميل غير موجود", 404, "NOT_FOUND");
    const { businessId: _b, ...data } = input;
    const updated = await db.customer.update({ where: { id }, data });
    return ok({ customer: updated });
  } catch (err) {
    return handleError(err);
  }
}
