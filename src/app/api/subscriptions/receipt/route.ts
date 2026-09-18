import { NextRequest } from "next/server";
import { ok, fail, handleError } from "@/lib/api";
import { storeImage } from "@/lib/storage";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/subscriptions/receipt — public bank-receipt upload for the
 * subscription payment dialog (family /api/upload twin, scoped to receipts,
 * rate-limited, no auth needed since payment can happen pre-registration).
 */
export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const rl = rateLimit(`receipt:${ip}`, 20, 10 * 60 * 1000);
    if (!rl.ok) return fail("عدد كبير من الرفعات، انتظر قليلاً", 429);

    const body = await req.json().catch(() => null);
    const data = typeof body?.data === "string" ? body.data : "";
    if (!data) return fail("لا توجد بيانات صورة", 422, "VALIDATION");

    const media = await storeImage(data, { businessId: null });
    return ok(media, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "تعذر رفع الصورة";
    if (message.includes("كبير") || message.includes("نوع") || message.includes("صيغة")) {
      return fail(message, 422, "VALIDATION");
    }
    return handleError(err);
  }
}
