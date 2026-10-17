// Public tracking LOOKUP: order number + the phone used at order time →
// the unguessable publicToken (the customer is then routed to
// /track/[token], which renders the order).
//
// W2-D1 (P21-D's ONE open gap: the landing had no tracking entry point —
// publicToken is unguessable, so a customer with only the receipt's
// order number had no way back to their order). This route is the
// order-number side of the door; /track/[token] stays the renderer.
//
// WHY THE PHONE RIDES ALONG (schema truth, not friction):
// · orderNumber is @@unique([businessId, orderNumber]) — NOT globally
//   unique. Every business numbers its day from 0001, so a bare
//   «SO-20260617-0001» can belong to several orders at once; a
//   number-only lookup would have to pick one arbitrarily (wrong-order
//   risk on the money path).
// · The phone is the second factor the customer demonstrably owns
//   (checkout collected it, normalized via normalizeLibyanPhone) — it
//   disambiguates the match AND materially hardens enumeration of
//   other customers' tracking pages (name/area/contents live there).
// · Both factors must match exactly; any miss answers the SAME honest
//   404 — never «which one was wrong».
//
// Abuse surface: dbRateLimit 10/10min per IP (the family's public-auth
// budget, DB-backed across instances — see lib/rate-limit.ts), strict
// pre-DB format rejection (cheap 422s never reach the limiter's table),
// and no field-level hints in the miss copy.

import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handleError, readJson } from "@/lib/api";
import { dbRateLimit, clientIp } from "@/lib/rate-limit";
import { normalizeLibyanPhone } from "@/lib/phone";

export const runtime = "nodejs";

/* SO-YYYYMMDD-NNNN(+): the exact shape orderNumberFor() mints
 * (Tripoli-day date parts + a zero-padded sequence that can grow past
 * 9999). Rejecting anything else keeps garbage out of the rate-limit
 * round trip and out of the DB query. */
const lookupSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^SO-\d{4}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])-\d{4,6}$/,
      "صيغة رقم الطلب غير صحيحة — مثال: SO-20260617-0042",
    ),
  phone: z.string().trim().min(7, "أدخل رقم هاتف صحيح").max(20),
});

export async function POST(req: NextRequest) {
  try {
    /* Same budget as the login surface (10 per 10 min per IP, DB-backed
       so warm instances cannot multiply it). */
    const ip = clientIp(req);
    const rl = await dbRateLimit(`track-lookup:${ip}`, 10, 10 * 60 * 1000);
    if (!rl.ok) {
      return fail("محاولات كثيرة جداً في وقت قصير، انتظر قليلاً", 429, undefined, {
        "retry-after": String(rl.retryAfterSec),
      });
    }

    const input = lookupSchema.parse(await readJson(req));

    const phone = normalizeLibyanPhone(input.phone);
    if (!phone) {
      return fail("رقم الهاتف غير صحيح — مثال صحيح: 0912345678", 422, "VALIDATION");
    }

    /* Both factors match → the freshest matching order owns the number
       (a same-phone re-order on a recycled number is the customer's own
       newest receipt). Only the token leaves the server — the order data
       still ships exclusively from /api/public/track/[token]. */
    const match = await db.order.findFirst({
      where: { orderNumber: input.orderNumber, customerPhone: phone },
      orderBy: { createdAt: "desc" },
      select: { publicToken: true },
    });
    if (!match) return fail("لا يوجد طلب بهذه البيانات", 404, "NOT_FOUND");

    return ok({ token: match.publicToken });
  } catch (err) {
    return handleError(err);
  }
}
