import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireBusiness, requirePermission } from "@/lib/auth";
import { ok, fail, handleError, readJson } from "@/lib/api";
import { parseLyd } from "@/lib/money";

export const runtime = "nodejs";

const createSchema = z.object({
  businessId: z.string().optional(),
  name: z.string().trim().min(1, "أدخل اسم المنطقة").max(60),
  fee: z.union([z.string(), z.number()]).transform((v) => {
    const m = parseLyd(v);
    if (m < 0 || m > 500_000) throw new Error("رسوم التوصيل غير صحيحة");
    return m;
  }),
  minOrder: z.union([z.string(), z.number()]).optional().transform((v) => {
    if (v === undefined || v === null || v === "") return 0;
    const m = parseLyd(v);
    if (m < 0 || m > 999_999_000) throw new Error("الحد الأدنى غير صحيح");
    return m;
  }),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const member = await requireBusiness(user, url.searchParams.get("businessId"));
    requirePermission(member, "delivery.manage");
    const zones = await db.deliveryZone.findMany({
      where: { businessId: member.businessId },
      orderBy: { sortOrder: "asc" },
    });
    return ok({ zones });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const input = createSchema.parse(await readJson(req));
    const member = await requireBusiness(user, input.businessId);
    requirePermission(member, "delivery.manage");

    const count = await db.deliveryZone.count({ where: { businessId: member.businessId } });
    if (count >= 40) return fail("وصلت للحد الأقصى من مناطق التوصيل (40)", 422);

    const zone = await db.deliveryZone.create({
      data: {
        businessId: member.businessId,
        name: input.name,
        fee: input.fee,
        minOrder: input.minOrder,
        sortOrder: count,
      },
    });
    return ok({ zone }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
