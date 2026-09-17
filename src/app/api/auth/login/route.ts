import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/password";
import { createSession } from "@/lib/auth";
import { ok, fail, handleError, readJson } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(1, "أدخل كلمة المرور").max(100),
});

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const rl = rateLimit(`login:${ip}`, 10, 10 * 60 * 1000);
    if (!rl.ok) return fail("عدد كبير من محاولات الدخول، انتظر قليلاً ثم حاول مجدداً", 429);

    const input = schema.parse(await readJson(req));

    const user = await db.user.findUnique({ where: { email: input.email } });
    // Constant-ish time: always run a verification even when user missing
    const hash = user?.passwordHash ?? hashPassword("dummy-password-for-timing");
    const valid = verifyPassword(input.password, hash);
    if (!user || !valid) {
      return fail("البريد الإلكتروني أو كلمة المرور غير صحيحة", 401);
    }

    await createSession(user.id, ip, req.headers.get("user-agent") ?? undefined);
    await db.auditLog.create({
      data: { userId: user.id, action: "LOGIN", entity: "User", entityId: user.id },
    });

    return ok({
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    return handleError(err);
  }
}
