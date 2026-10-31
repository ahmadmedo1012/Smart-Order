import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireBusiness, requirePermission } from "@/lib/auth";
import { ok, fail, handleError, readJson } from "@/lib/api";
import { PAYMENT_TYPES } from "@/lib/constants";
import { normalizeLibyanPhone } from "@/lib/phone";

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

/* ── P36 Phase C (C4) — reorder: the checkout screen's display order ──
 *
 * The merchant decides which methods the customer sees first (sortOrder
 * rides the public storefront payload). The web surface never exposed a
 * reorder verb; the mobile payments screen needs one. Contract: the
 * client submits the FULL ordered id list of the business's methods —
 * a foreign id is indistinguishable from a missing one (404, the
 * tenant-isolation no-oracle law), an incomplete or duplicated list is
 * refused (422) so sortOrder can never end up ambiguous. Writes carry
 * businessId in their own WHERE (the categories/[id] CAS doctrine — a
 * write can never cross tenants even if the pre-check raced) and share
 * one transaction, so the reorder is atomic. */
const reorderSchema = z.object({
  businessId: z.string().optional(),
  order: z.array(z.string().trim().min(1)).max(PAYMENT_TYPES.length),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    const input = reorderSchema.parse(await readJson(req));
    const member = await requireBusiness(user, input.businessId);
    requirePermission(member, "payments.manage");

    const methods = await db.paymentMethod.findMany({
      where: { businessId: member.businessId },
      select: { id: true },
    });
    const known = new Set(methods.map((m) => m.id));
    if (input.order.some((id) => !known.has(id))) {
      return fail("طريقة الدفع غير موجودة", 404, "NOT_FOUND");
    }
    if (new Set(input.order).size !== input.order.length || input.order.length !== methods.length) {
      return fail("أرسل ترتيب جميع طرق الدفع", 422, "VALIDATION");
    }

    await db.$transaction(
      input.order.map((id, i) =>
        db.paymentMethod.updateMany({ where: { id, businessId: member.businessId }, data: { sortOrder: i } }),
      ),
    );
    const list = await db.paymentMethod.findMany({
      where: { businessId: member.businessId },
      orderBy: { sortOrder: "asc" },
    });
    return ok({ methods: list });
  } catch (err) {
    return handleError(err);
  }
}
