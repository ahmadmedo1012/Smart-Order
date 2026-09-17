import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireBusiness, requirePermission } from "@/lib/auth";
import { ok, fail, handleError, readJson } from "@/lib/api";
import { PAYMENT_TYPES } from "@/lib/constants";
import { normalizeLibyanPhone, toE164 } from "@/lib/phone";

export const runtime = "nodejs";

const createSchema = z.object({
  businessId: z.string().optional(),
  type: z.enum(PAYMENT_TYPES),
  name: z.string().trim().min(1, "أدخل الاسم الظاهر للعملاء").max(60),
  instructions: z.string().trim().max(300).optional().default(""),
  number: z.string().trim().max(20).optional().default(""), // transfer number (Madar/Libyana/manual)
});

function paymentConfig(type: string, number: string): string | null {
  if ((type === "MADAR" || type === "LIBYANA" || type === "MANUAL" || type === "WHATSAPP") && number) {
    const normalized = normalizeLibyanPhone(number);
    if (!normalized) throw Object.assign(new Error("رقم التحويل غير صحيح — مثال: 0912345678"), { status: 422 });
    return JSON.stringify({ number: normalized });
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const member = await requireBusiness(user, url.searchParams.get("businessId"));
    requirePermission(member, "payments.manage");
    const methods = await db.paymentMethod.findMany({
      where: { businessId: member.businessId },
      orderBy: { sortOrder: "asc" },
    });
    return ok({ methods });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const input = createSchema.parse(await readJson(req));
    const member = await requireBusiness(user, input.businessId);
    requirePermission(member, "payments.manage");

    const existing = await db.paymentMethod.findUnique({
      where: { businessId_type: { businessId: member.businessId, type: input.type } },
    });
    if (existing) return fail("طريقة الدفع هذه مفعّلة مسبقاً", 409, "DUPLICATE");

    let config: string | null;
    try {
      config = paymentConfig(input.type, input.number);
    } catch (e) {
      return fail((e as Error).message, 422, "VALIDATION");
    }

    const count = await db.paymentMethod.count({ where: { businessId: member.businessId } });
    const method = await db.paymentMethod.create({
      data: {
        businessId: member.businessId,
        type: input.type,
        name: input.name,
        instructions: input.instructions || null,
        config,
        sortOrder: count,
      },
    });
    return ok({ method }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
