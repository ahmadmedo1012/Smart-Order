import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireBusiness, requirePermission } from "@/lib/auth";
import { ok, fail, handleError, readJson } from "@/lib/api";
import { normalizeLibyanPhone } from "@/lib/phone";

export const runtime = "nodejs";

const patchSchema = z.object({
  businessId: z.string().optional(),
  name: z.string().trim().min(2, "أدخل اسم العمل").max(100).optional(),
  description: z.string().trim().max(300).nullable().optional(),
  logoUrl: z.string().trim().max(300).nullable().optional(),
  coverUrl: z.string().trim().max(300).nullable().optional(),
  city: z.string().trim().max(60).nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  whatsappNumber: z.string().trim().max(20).nullable().optional(),
  address: z.string().trim().max(200).nullable().optional(),
  receiptFooter: z.string().trim().max(200).nullable().optional(),
  isPublished: z.boolean().optional(),
  onboardingStep: z.number().int().min(1).max(8).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    const input = patchSchema.parse(await readJson(req));
    const member = await requireBusiness(user, input.businessId);
    requirePermission(member, "settings.manage");

    const { businessId, ...data } = input;

    if (data.phone) {
      const normalized = normalizeLibyanPhone(data.phone);
      if (!normalized) return fail("رقم الهاتف غير صحيح — مثال صحيح: 0912345678", 422, "VALIDATION");
      data.phone = normalized;
    }
    if (data.whatsappNumber) {
      const normalized = normalizeLibyanPhone(data.whatsappNumber);
      if (!normalized) return fail("رقم واتساب غير صحيح — مثال صحيح: 0912345678", 422, "VALIDATION");
      data.whatsappNumber = normalized;
    }

    // Publishing requires minimum viability: at least one category + one available product
    if (data.isPublished === true) {
      const [catCount, prodCount] = await Promise.all([
        db.category.count({ where: { businessId: member.businessId, isArchived: false } }),
        db.product.count({ where: { businessId: member.businessId, isArchived: false, isAvailable: true } }),
      ]);
      if (catCount === 0 || prodCount === 0) {
        return ok(
          { published: false, reason: "أضف قسماً واحداً ومنتجاً واحداً على الأقل قبل النشر" },
          { status: 200 }
        );
      }
    }

    const business = await db.business.update({
      where: { id: member.businessId },
      data,
      select: {
        id: true, slug: true, name: true, description: true, logoUrl: true, coverUrl: true,
        city: true, phone: true, whatsappNumber: true, address: true, receiptFooter: true,
        isPublished: true, onboardingStep: true, isActive: true,
      },
    });

    if (data.isPublished !== undefined) {
      await db.auditLog.create({
        data: {
          businessId: member.businessId,
          userId: user.id,
          action: data.isPublished ? "STOREFRONT_PUBLISHED" : "STOREFRONT_UNPUBLISHED",
          entity: "Business",
          entityId: member.businessId,
        },
      });
    }

    return ok({ business });
  } catch (err) {
    return handleError(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const member = await requireBusiness(user, url.searchParams.get("businessId"));
    const business = await db.business.findUnique({
      where: { id: member.businessId },
      select: {
        id: true, slug: true, name: true, description: true, logoUrl: true, coverUrl: true,
        city: true, phone: true, whatsappNumber: true, address: true, receiptFooter: true,
        isPublished: true, onboardingStep: true, currency: true, createdAt: true,
      },
    });
    return ok({ business });
  } catch (err) {
    return handleError(err);
  }
}
