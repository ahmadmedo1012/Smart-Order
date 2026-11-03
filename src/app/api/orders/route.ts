import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireBusiness, requirePermission } from "@/lib/auth";
import { ok, handleError } from "@/lib/api";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/constants";

export const runtime = "nodejs";

const listQuery = z.object({
  businessId: z.string().optional(),
  /* P43 SO-1 (لوحة الطلبات المباشرة): النشط = الحالات الخمس قيد
   * المعالجة — معامل إضافي واحد على العقد القائم (قيمة حرفية "ACTIVE"
   * إلى جانب أسماء الحالات المفردة)، فتستطلع اللوحة الحية كل مساراتها
   * بطلب واحد كل 10 ثوان بدل خمسة. لا تغيير لأي مستهلك قائم (مفرد
   * كما كان). */
  status: z
    .union([z.enum(ORDER_STATUSES), z.literal("ACTIVE")])
    .optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  fulfillment: z.enum(["DELIVERY", "PICKUP"]).optional(),
  q: z.string().trim().max(80).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/* الحالات الخمس «على القضيب» — نفس قائمة ممرات اللوحة الحية. */
const ACTIVE_STATUSES = ["NEW", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"] as const;

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const q = listQuery.parse(Object.fromEntries(url.searchParams.entries()));
    const member = await requireBusiness(user, q.businessId);
    requirePermission(member, "orders.read");

    const where: Record<string, unknown> = { businessId: member.businessId };
    if (q.status) {
      where.status = q.status === "ACTIVE" ? { in: [...ACTIVE_STATUSES] } : q.status;
    }
    if (q.paymentStatus) where.paymentStatus = q.paymentStatus;
    if (q.fulfillment) where.fulfillmentType = q.fulfillment;
    if (q.from || q.to) {
      where.createdAt = {
        ...(q.from ? { gte: new Date(q.from) } : {}),
        ...(q.to ? { lte: new Date(q.to) } : {}),
      };
    }
    if (q.q) {
      // search across order number, customer name, phone
      where.OR = [
        { orderNumber: { contains: q.q } },
        { customerName: { contains: q.q } },
        { customerPhone: { contains: q.q.replace(/\s/g, "") } },
      ];
    }

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        select: {
          id: true, orderNumber: true, status: true, fulfillmentType: true,
          total: true, paymentStatus: true, paymentType: true,
          customerName: true, customerPhone: true, city: true, area: true,
          createdAt: true, customerConfirmedAt: true, _count: { select: { items: true } },
          /* P43 SO-1: ملخص الأصناف للبطاقة الحية — أعلى سطرين قيمةً
           * (orderBy lineTotal) + العدّ الكامل من _count أعلاه. حقلان
           * إضافيان على الشكل القائم (المستهلكات القديمة لا تقرأهما؛
           * تطبيق الجوال يتسلم JSON إضافيًا — حقول تراكمية بلا كسر). */
          items: {
            select: { productName: true, quantity: true },
            orderBy: { lineTotal: "desc" },
            take: 2,
          },
        },
      }),
      db.order.count({ where }),
    ]);

    return ok(orders, {
      meta: { total, page: q.page, pageSize: q.pageSize, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) },
    });
  } catch (err) {
    return handleError(err);
  }
}
