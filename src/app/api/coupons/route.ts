// P43 SO-2 — merchant coupon CRUD (list + create).
//
// أكواد الخصم: the merchant's marketing surface. Auth/permission = the
// family shell (requireAuth → requireBusiness → products.manage —
// coupons are a catalog-pricing surface, so the OWNER/ADMIN
// products.manage set owns them; STAFF never touches money pricing).
// Every query is businessId-scoped (tenant isolation law), every
// mutation writes an AuditLog row, and the math/type rules live in
// lib/coupon.ts — ONE source shared with the money path.
//
// DOCUMENTED DECISION (no plan gate): coupons ship WITHOUT a plan cap —
// adding a feature without new commercial restrictions. The pricing
// cards never promised «أكواد خصم» as a paid tier; gating a new surface
// retroactively would be inventing commerce, not enforcing it.

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

/* r140 (P3-2) family cap: same 999_999_000 millimes ceiling as product
   prices — a FIXED coupon larger than any sellable order is a typo, not
   marketing. */
const MAX_COUPON_VALUE = 999_999_000;

const createSchema = z.object({
  businessId: z.string().optional(),
  code: z.string().trim().min(1, "أدخل كود الخصم").max(40),
  type: z.enum(COUPON_TYPES),
  /* PERCENT → integer 1..100 · FIXED → LYD string ("5" / "5.500" /
     «٣٫٥٠») parsed to millimes · FREE_DELIVERY → ignored. */
  value: z.union([z.string(), z.number()]).optional().default("0"),
  minOrder: z.union([z.string(), z.number()]).optional().default("0"),
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
  isActive: z.boolean().optional().default(true),
});

/** Parse the type-specific value into its stored integer. Arabic copy on
 *  every refusal — these are merchant-facing form errors. */
function parseCouponValue(type: string, raw: string | number | undefined): number {
  if (type === "PERCENT") {
    const n = typeof raw === "number" ? raw : Number(String(raw).trim());
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      throw new Error("النسبة المئوية بين 1 و100");
    }
    return n;
  }
  if (type === "FIXED") {
    let m: number;
    try {
      m = parseLyd(raw ?? "");
    } catch {
      throw new Error("أدخل قيمة خصم صحيحة — مثال: 5 أو 5.500");
    }
    if (m <= 0) throw new Error("قيمة الخصم يجب أن تكون أكبر من صفر");
    if (m > MAX_COUPON_VALUE) throw new Error("قيمة الخصم كبيرة جداً");
    return m;
  }
  return 0; // FREE_DELIVERY: no value
}

function parseMillimes(raw: string | number | undefined, label: string): number {
  let m: number;
  try {
    m = parseLyd(raw ?? "0");
  } catch {
    throw new Error(`${label} غير صحيح`);
  }
  if (m < 0) throw new Error(`${label} لا يمكن أن يكون سالباً`);
  if (m > MAX_COUPON_VALUE) throw new Error(`${label} كبير جداً`);
  return m;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const member = await requireBusiness(user, url.searchParams.get("businessId"));
    requirePermission(member, "products.manage");
    /* Usage stats ride the row itself (usedCount/maxUses) — the list is
       the whole dashboard surface. Newest first. */
    const coupons = await db.coupon.findMany({
      where: { businessId: member.businessId },
      orderBy: { createdAt: "desc" },
    });
    return ok({ coupons });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const input = createSchema.parse(await readJson(req));
    const member = await requireBusiness(user, input.businessId);
    requirePermission(member, "products.manage");

    /* Code: normalize (strip spaces) then validate the charset/length —
       display case preserved, comparisons case-insensitive. */
    const code = normalizeCouponCode(input.code);
    if (!isValidCouponCode(code)) {
      return fail(
        `الكود يجب أن يكون ${COUPON_CODE_MIN} إلى 24 حرفاً أو رقماً (حروف وأرقام وشرطة فقط، بلا فراغات)`,
        422,
        "VALIDATION",
      );
    }

    let value: number;
    let minOrder: number;
    try {
      value = parseCouponValue(input.type, input.value);
      minOrder = parseMillimes(input.minOrder, "الحد الأدنى للطلب");
    } catch (e) {
      return fail((e as Error).message, 422, "VALIDATION");
    }

    const startsAt = input.startsAt ? new Date(input.startsAt) : null;
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (startsAt && expiresAt && startsAt.getTime() >= expiresAt.getTime()) {
      return fail("تاريخ البداية يجب أن يسبق تاريخ الانتهاء", 422, "VALIDATION");
    }

    /* Case-insensitive duplicate guard: @@unique([businessId, code]) is
       byte-sensitive, so the route checks the normalized compare in JS
       over the business's (few) rows first; the DB constraint remains
       the hard stop for the exact-duplicate race. */
    const existing = await db.coupon.findMany({
      where: { businessId: member.businessId },
      select: { code: true },
    });
    if (existing.some((c) => couponCodeEquals(c.code, code))) {
      return fail("هذا الكود مستخدم مسبقاً", 409, "DUPLICATE");
    }

    const coupon = await db.coupon.create({
      data: {
        businessId: member.businessId,
        code,
        type: input.type,
        value,
        minOrder,
        maxUses: input.maxUses ?? null,
        startsAt,
        expiresAt,
        isActive: input.isActive ?? true,
      },
    });
    await db.auditLog.create({
      data: {
        businessId: member.businessId,
        userId: user.id,
        action: "COUPON_CREATED",
        entity: "Coupon",
        entityId: coupon.id,
        metadata: JSON.stringify({ code, type: input.type, value }),
      },
    });
    return ok({ coupon }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
