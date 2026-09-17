import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireBusiness, requirePermission } from "@/lib/auth";
import { ok, fail, handleError, readJson } from "@/lib/api";
import { storeImage } from "@/lib/storage";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  businessId: z.string().optional(),
  data: z.string().min(10, "لا توجد بيانات صورة"),
});

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const rl = rateLimit(`upload:${ip}`, 30, 10 * 60 * 1000);
    if (!rl.ok) return fail("عدد كبير من الرفعات، انتظر قليلاً", 429);

    const user = await requireAuth();
    const input = schema.parse(await readJson(req));
    const member = await requireBusiness(user, input.businessId);
    requirePermission(member, "products.manage");

    const media = await storeImage(input.data, { businessId: member.businessId });
    return ok(media, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "تعذر رفع الصورة";
    if (message.includes("كبير") || message.includes("نوع") || message.includes("صيغة")) {
      return fail(message, 422, "VALIDATION");
    }
    return handleError(err);
  }
}
