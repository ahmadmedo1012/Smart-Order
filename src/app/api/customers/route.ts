import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireBusiness, requirePermission } from "@/lib/auth";
import { ok, fail, handleError, readJson } from "@/lib/api";
import { normalizeLibyanPhone } from "@/lib/phone";

export const runtime = "nodejs";

const createSchema = z.object({
  businessId: z.string().optional(),
  name: z.string().trim().min(2, "أدخل اسم العميل").max(80),
  phone: z.string().trim().min(7, "أدخل رقم هاتف صحيح").max(20),
  notes: z.string().trim().max(500).optional().default(""),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const member = await requireBusiness(user, url.searchParams.get("businessId"));
    requirePermission(member, "customers.read");
    const q = (url.searchParams.get("q") ?? "").trim().slice(0, 60);

    const customers = await db.customer.findMany({
      where: {
        businessId: member.businessId,
        ...(q ? { OR: [{ name: { contains: q } }, { phone: { contains: q.replace(/\s/g, "") } }] } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true, name: true, phone: true, notes: true, createdAt: true,
        orders: {
          orderBy: { createdAt: "desc" },
          take: 200,
          select: { total: true, status: true, createdAt: true },
        },
      },
    });

    const enriched = customers.map((c) => {
      const orders = c.orders;
      const completed = orders.filter((o) => o.status === "DELIVERED");
      const totalSpent = completed.reduce((s, o) => s + o.total, 0);
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        notes: c.notes,
        createdAt: c.createdAt,
        orderCount: orders.length,
        totalSpent,
        avgOrder: completed.length > 0 ? Math.round(totalSpent / completed.length) : 0,
        lastOrderAt: orders[0]?.createdAt ?? null,
      };
    });

    return ok(enriched, { meta: { total: enriched.length } });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const input = createSchema.parse(await readJson(req));
    const member = await requireBusiness(user, input.businessId);
    requirePermission(member, "customers.manage");

    const phone = normalizeLibyanPhone(input.phone);
    if (!phone) return fail("رقم الهاتف غير صحيح — مثال: 0912345678", 422, "VALIDATION");

    const existing = await db.customer.findUnique({
      where: { businessId_phone: { businessId: member.businessId, phone } },
    });
    if (existing) return fail("هذا العميل مسجل مسبقاً بنفس الرقم", 409, "DUPLICATE");

    const customer = await db.customer.create({
      data: { businessId: member.businessId, name: input.name, phone, notes: input.notes || null },
    });
    return ok({ customer }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
