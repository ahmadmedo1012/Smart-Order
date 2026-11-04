// P43 SO-2 — merchant coupon CRUD (edit/toggle + delete).
//
// The categories/[id] contract adapted to coupons:
//  · tenant isolation rides businessId in EVERY where clause (a write
//    can never cross tenants even if the pre-check raced);
//  · DELETE honors the UI's promise «يُحذف إن لم يُستخدم، وإلا يُوقَّف» —
//    a coupon that already discounted real orders is part of the books
//    (Order.couponCode snapshots it), so it can only be deactivated,
//    never erased;
//  · the money path's redemption (usedCount) is the merchant's OWN
//    counter — PATCH never touches it (edits change the rules for
//    FUTURE redemptions only, the family's snapshot law).

import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireBusiness, requirePermission } from "@/lib/auth";
import { ok, fail, handleError, readJson } from "@/lib/api";
import { parseLyd } from "@/lib/money";
import {
  COUPON_CODE_MIN,
  COUPON_TYPES,
  isValidCouponCode,
  normalizeCouponCode,
  couponCodeEquals,
} from "@/lib/coupon";

export const runtime = "nodejs";

const MAX_COUPON_VALUE = 999_999_000; // the products route's family cap

const patchSchema = z.object({
  businessId: z.string().optional(),
  code: z.string().trim().min(1, "أدخل كود الخصم").max(40).optional(),
  type: z.enum(COUPON_TYPES).optional(),
  value: z.union([z.string(), z.number()]).optional(),
  minOrder: z.union([z.string(), z.number()]).optional(),
  maxUses: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .nullable()
    .transform((v) => {
      if (v === null || v === undefined || v === "") return null;
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isInteger(n) || n < 1) throw new Error("أدخل عدداً صحيحاً للاستخدامات (1 أو أكثر)");
      return n;
    }),
  startsAt: z.string().datetime({ message: "تاريخ بداية غير صحيح" }).nullable().optional(),
  expiresAt: z.string().datetime({ message: "تاريخ انتهاء غير صحيح" }).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireAuth();
    const input = patchSchema.parse(await readJson(req));
    const member = await requireBusiness(user, input.businessId);
    requirePermission(member, "products.manage");

    const current = await db.coupon.findFirst({
      where: { id, businessId: member.businessId },
    });
    if (!current) return fail("كود الخصم غير موجود", 404, "NOT_FOUND");

    const updates: Record<string, unknown> = {};

    if (input.code !== undefined) {
      const code = normalizeCouponCode(input.code);
      if (!isValidCouponCode(code)) {
        return fail(
          `الكود يجب أن يكون ${COUPON_CODE_MIN} إلى 24 حرفاً أو رقماً (حروف وأرقام وشرطة فقط، بلا فراغات)`,
          422,
          "VALIDATION",
        );
      }
      /* the case-insensitive duplicate guard — excluding THIS row */
      const existing = await db.coupon.findMany({
        where: { businessId: member.businessId, id: { not: id } },
        select: { code: true },
      });
      if (existing.some((c) => couponCodeEquals(c.code, code))) {
        return fail("هذا الكود مستخدم مسبقاً", 409, "DUPLICATE");
      }
      updates.code = code;
    }

    /* type/value arrive together from the dialog (the value's meaning
       depends on the type); the effective type is the PATCHed one or the
       row's own. */
    const effectiveType = (input.type ?? current.type) as (typeof COUPON_TYPES)[number];
    if (input.type !== undefined) updates.type = input.type;
    if (input.value !== undefined) {
      if (effectiveType === "PERCENT") {
        const n = typeof input.value === "number" ? input.value : Number(String(input.value).trim());
        if (!Number.isInteger(n) || n < 1 || n > 100) {
          return fail("النسبة المئوية بين 1 و100", 422, "VALIDATION");
        }
        updates.value = n;
      } else if (effectiveType === "FIXED") {
        let m: number;
        try {
          m = parseLyd(input.value);
        } catch {
          return fail("أدخل قيمة خصم صحيحة — مثال: 5 أو 5.500", 422, "VALIDATION");
        }
        if (m <= 0) return fail("قيمة الخصم يجب أن تكون أكبر من صفر", 422, "VALIDATION");
        if (m > MAX_COUPON_VALUE) return fail("قيمة الخصم كبيرة جداً", 422, "VALIDATION");
        updates.value = m;
      } else {
        updates.value = 0; // FREE_DELIVERY: the value is nothing
      }
    } else if (input.type !== undefined) {
      /* the type CHANGED but no value arrived — the old value's unit is
         now meaningless; the honest default is the type's neutral value
         (merchant edits the value next). */
      updates.value = effectiveType === "PERCENT" ? 10 : effectiveType === "FIXED" ? 1_000 : 0;
    }

    if (input.minOrder !== undefined) {
      let m: number;
      try {
        m = parseLyd(input.minOrder);
      } catch {
        return fail("الحد الأدنى للطلب غير صحيح", 422, "VALIDATION");
      }
      if (m < 0) return fail("الحد الأدنى للطلب لا يمكن أن يكون سالباً", 422, "VALIDATION");
      if (m > MAX_COUPON_VALUE) return fail("الحد الأدنى للطلب كبير جداً", 422, "VALIDATION");
      updates.minOrder = m;
    }

    /* maxUses can be cleared (null = unlimited) but never set below the
       redemptions that already happened — the counter is history, and a
       cap under usedCount would make every future read look violated. */
    if (input.maxUses !== undefined) {
      if (input.maxUses !== null && input.maxUses < current.usedCount) {
        return fail(
          `استُخدم هذا الكود ${current.usedCount} مرة — لا يمكن خفض الحد دونها`,
          422,
          "VALIDATION",
        );
      }
      updates.maxUses = input.maxUses;
    }

    const startsAt = input.startsAt !== undefined ? (input.startsAt ? new Date(input.startsAt) : null) : current.startsAt;
    const expiresAt = input.expiresAt !== undefined ? (input.expiresAt ? new Date(input.expiresAt) : null) : current.expiresAt;
    if (startsAt && expiresAt && startsAt.getTime() >= expiresAt.getTime()) {
      return fail("تاريخ البداية يجب أن يسبق تاريخ الانتهاء", 422, "VALIDATION");
    }
    if (input.startsAt !== undefined) updates.startsAt = startsAt;
    if (input.expiresAt !== undefined) updates.expiresAt = expiresAt;

    if (input.isActive !== undefined) updates.isActive = input.isActive;

    if (Object.keys(updates).length === 0) {
      return fail("لا توجد تغييرات", 400);
    }

    /* businessId rides the write's own WHERE (the CAS doctrine) */
    const updated = await db.coupon.update({
      where: { id },
      data: updates as { code?: string; type?: string; value?: number; minOrder?: number; maxUses?: number | null; startsAt?: Date | null; expiresAt?: Date | null; isActive?: boolean },
    });
    await db.auditLog.create({
      data: {
        businessId: member.businessId,
        userId: user.id,
        action: "COUPON_UPDATED",
        entity: "Coupon",
        entityId: id,
        metadata: JSON.stringify({ ...updates, code: updated.code }),
      },
    });
    return ok({ coupon: updated });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireAuth();
    const url = new URL(req.url);
    const member = await requireBusiness(user, url.searchParams.get("businessId"));
    requirePermission(member, "products.manage");

    const coupon = await db.coupon.findFirst({
      where: { id, businessId: member.businessId },
    });
    if (!coupon) return fail("كود الخصم غير موجود", 404, "NOT_FOUND");

    /* The UI's promise: used → deactivate (the books keep the code's
       history via Order.couponCode snapshots), unused → hard delete. */
    if (coupon.usedCount > 0) {
      await db.coupon.updateMany({
        where: { id, businessId: member.businessId },
        data: { isActive: false },
      });
      await db.auditLog.create({
        data: {
          businessId: member.businessId,
          userId: user.id,
          action: "COUPON_DEACTIVATED",
          entity: "Coupon",
          entityId: id,
          metadata: JSON.stringify({ code: coupon.code, usedCount: coupon.usedCount }),
        },
      });
      return ok({ deleted: false, deactivated: true });
    }

    await db.coupon.deleteMany({ where: { id, businessId: member.businessId } });
    await db.auditLog.create({
      data: {
        businessId: member.businessId,
        userId: user.id,
        action: "COUPON_DELETED",
        entity: "Coupon",
        entityId: id,
        metadata: JSON.stringify({ code: coupon.code }),
      },
    });
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
