// P43 SO-2 — the public coupon PREVIEW (checkout's «تطبيق الكود»).
//
// This is a display-only surface: the customer types a code at checkout,
// this endpoint answers what it does (description + discount + the
// honest total) so the money the customer SEES matches what the order
// route will COMMIT. The subtotal/deliveryFee arrive from the CLIENT
// (the server cannot know the cart) — which is fine BY DESIGN because
// nothing here writes money: the REAL validation, the real server-priced
// subtotal, and the atomic usedCount increment all live inside the
// order-creation transaction (POST /api/public/orders). A stale preview
// (cart edited after applying) can never produce a wrong order — the
// order route recomputes everything from its own re-pricing.
//
// Guardrails: same store-availability law as the storefront/orders
// routes (isActive + isPublished), the family's dbRateLimit
// (fail-closed), and the FREE_DELIVERY-on-pickup refusal that keeps a
// useless redemption from burning a use.

import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handleError, readJson } from "@/lib/api";
import { dbRateLimit, clientIp } from "@/lib/rate-limit";
import {
  computeCouponDiscount,
  couponCodeEquals,
  couponDescribeAr,
  couponUseError,
  normalizeCouponCode,
  type CouponShape,
} from "@/lib/coupon";

export const runtime = "nodejs";

const schema = z.object({
  slug: z.string().min(1).max(60),
  code: z.string().trim().min(1, "أدخل كود الخصم").max(40),
  fulfillmentType: z.enum(["DELIVERY", "PICKUP"]),
  /* display-only numbers from the live cart evaluation (W2-ORD-2) —
     bounded like every public input; the order route never trusts them */
  subtotal: z.number().int().min(0).max(999_999_000),
  deliveryFee: z.number().int().min(0).max(999_999_000),
});

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    /* same budget class as the checkout's own typing surface — generous
       enough for a customer retrying a flyer code, tight enough that a
       scraper cannot enumerate a business's codes */
    const rl = await dbRateLimit(`coupon-validate:${ip}`, 12, 60 * 1000);
    if (!rl.ok) return fail("طلبات كثيرة جداً في وقت قصير، انتظر قليلاً", 429, undefined, { "retry-after": String(rl.retryAfterSec) });

    const input = schema.parse(await readJson(req));

    const business = await db.business.findUnique({
      where: { slug: input.slug },
      select: { id: true, isActive: true, isPublished: true },
    });
    if (!business || !business.isActive || !business.isPublished) {
      return fail("المتجر غير متاح حالياً", 404, "NOT_FOUND");
    }

    const normalized = normalizeCouponCode(input.code);
    /* case-insensitive match (SQLite has no insensitive mode — the
       business's coupons are few; fetch + match in memory, the same
       recipe the money path uses inside its transaction) */
    const rows = await db.coupon.findMany({
      where: { businessId: business.id },
      select: { code: true, type: true, value: true, minOrder: true, maxUses: true, usedCount: true, startsAt: true, expiresAt: true, isActive: true },
    });
    const row = rows.find((c) => couponCodeEquals(c.code, normalized)) ?? null;
    const useErr = couponUseError(row as CouponShape | null, { now: new Date(), subtotal: input.subtotal });
    if (useErr) return fail(useErr, 422, "COUPON");
    const coupon = row as CouponShape;
    if (coupon.type === "FREE_DELIVERY" && input.fulfillmentType !== "DELIVERY") {
      return fail("هذا الكود لطلبات التوصيل — احوّل طلبك إلى توصيل للاستفادة منه", 422, "COUPON");
    }

    const discount = computeCouponDiscount(coupon, input.subtotal, input.deliveryFee);
    return ok({
      /* the MERCHANT's canonical code spelling (the customer may have
         typed save10 — the receipt and WhatsApp ride SAVE10) */
      code: coupon.code,
      type: coupon.type,
      description: couponDescribeAr(coupon),
      discount,
      subtotal: input.subtotal,
      deliveryFee: input.deliveryFee,
      total: input.subtotal + input.deliveryFee - discount,
      minOrder: coupon.minOrder,
    });
  } catch (err) {
    return handleError(err);
  }
}
