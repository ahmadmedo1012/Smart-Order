import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/auth";
import { ok, fail, handleError, readJson } from "@/lib/api";
import { uniqueSlug } from "@/lib/slug";
import { normalizeLibyanPhone } from "@/lib/phone";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(2, "أدخل اسمك الكامل").max(80),
  email: z.string().trim().toLowerCase().email("البريد الإلكتروني غير صحيح"),
  password: z
    .string()
    .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
    .max(100, "كلمة المرور طويلة جداً"),
  businessName: z.string().trim().min(2, "أدخل اسم العمل").max(100),
  city: z.string().trim().max(60).optional().default(""),
  phone: z.string().trim().max(20).optional().default(""),
  /** Optional plan preselection from the pricing wizard (must be a free plan — paid plans activate after payment approval). */
  planId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const rl = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
    if (!rl.ok) return fail("عدد كبير من المحاولات، حاول بعد قليل", 429);

    const body = await readJson(req);
    const input = schema.parse(body);

    const existing = await db.user.findUnique({ where: { email: input.email } });
    if (existing) return fail("هذا البريد الإلكتروني مسجل مسبقاً — سجّل الدخول", 409);

    if (input.phone) {
      const normalized = normalizeLibyanPhone(input.phone);
      if (!normalized) return fail("رقم الهاتف الليبي غير صحيح (مثال: 0912345678)", 422);
      input.phone = normalized;
    }

    const slug = await uniqueSlug(input.businessName, async (candidate) => {
      return !!(await db.business.findUnique({ where: { slug: candidate }, select: { id: true } }));
    });

    // Resolve the plan preselection (free plans only attach instantly;
    // paid plans attach on payment approval by the platform admin).
    let planId: string | null = null;
    if (input.planId) {
      const plan = await db.plan.findUnique({ where: { id: input.planId } });
      if (plan && plan.isActive && plan.price === 0) planId = plan.id;
    }

    const [user] = await db.$transaction([
      db.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash: hashPassword(input.password),
          phone: input.phone || null,
        },
      }),
    ]);

    const business = await db.business.create({
      data: {
        slug,
        name: input.businessName,
        city: input.city || null,
        phone: input.phone || null,
        onboardingStep: 2,
        planId,
        members: {
          create: { userId: user.id, role: "OWNER" },
        },
      },
    });

    // Sensible defaults: COD + cash payment methods so checkout works immediately after publish
    await db.paymentMethod.createMany({
      data: [
        { businessId: business.id, type: "COD", name: "الدفع عند التوصيل", sortOrder: 1, instructions: "ادفع نقداً لمندوب التوصيل عند وصول طلبك" },
        { businessId: business.id, type: "CASH", name: "نقداً في الفرع", sortOrder: 2, instructions: "ادفع نقداً عند استلام طلبك من الفرع" },
      ],
    });

    await db.auditLog.create({
      data: {
        businessId: business.id,
        userId: user.id,
        action: "BUSINESS_CREATED",
        entity: "Business",
        entityId: business.id,
      },
    });

    await createSession(user.id, ip, req.headers.get("user-agent") ?? undefined);

    return ok({ business: { id: business.id, slug: business.slug, name: business.name } }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
