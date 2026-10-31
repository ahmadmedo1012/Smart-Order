// P36 Phase C (C3) — native login: mints a device-session credential.
//
// The web login (api/auth/login) sets an httpOnly cookie the RN app
// cannot store; this route answers with the raw Bearer token (shown
// exactly ONCE) plus the selection context the app boots from
// (memberships with RESOLVED permissions — the same permissionsFor the
// dashboard shell resolves server-side). Identity is NOT duplicated:
// same User table, same PBKDF2 verification with dummy-hash timing
// equalization, same Arabic error copy, same dbRateLimit pattern
// (fresh `mobile-login:` budget, 10/10min/IP, fail-closed).

import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/password";
import { createMobileSession, permissionsFor } from "@/lib/auth";
import { ok, fail, handleError, readJson } from "@/lib/api";
import { dbRateLimit, clientIp } from "@/lib/rate-limit";
import type { Role } from "@/lib/constants";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(1, "أدخل كلمة المرور").max(100),
  platform: z.enum(["ios", "android", "unknown"]).default("unknown"),
  deviceName: z.string().trim().max(80).optional(),
  appVersion: z.string().trim().max(40).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    /* The web login's awaited authoritative twin (fail-closed), on a
       dedicated mobile budget — a native attacker's brute force never
       eats the web budget and vice versa. */
    const rl = await dbRateLimit(`mobile-login:${ip}`, 10, 10 * 60 * 1000);
    if (!rl.ok) {
      return fail("عدد كبير من محاولات الدخول، انتظر قليلاً ثم حاول مجدداً", 429, undefined, {
        "retry-after": String(rl.retryAfterSec),
      });
    }

    const input = schema.parse(await readJson(req));

    const user = await db.user.findUnique({
      where: { email: input.email },
      include: {
        memberships: {
          include: {
            business: { select: { id: true, slug: true, name: true, isPublished: true, onboardingStep: true } },
          },
        },
      },
    });
    // Constant-ish time: always run a verification even when user missing
    // (the web login's timing-equalization recipe verbatim).
    const hash = user?.passwordHash ?? hashPassword("dummy-password-for-timing");
    const valid = verifyPassword(input.password, hash);
    if (!user || !valid) {
      return fail("البريد الإلكتروني أو كلمة المرور غير صحيحة", 401);
    }

    const { token, sessionId, expiresAt } = await createMobileSession(user.id, {
      platform: input.platform,
      deviceName: input.deviceName,
      appVersion: input.appVersion,
      ip,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "MOBILE_LOGIN",
        entity: "MobileSession",
        entityId: sessionId,
        metadata: JSON.stringify({ platform: input.platform }),
      },
    });

    return ok({
      token,
      tokenType: "Bearer",
      expiresAt,
      user: { id: user.id, email: user.email, name: user.name, isPlatformAdmin: user.isPlatformAdmin },
      memberships: user.memberships.map((m) => ({
        businessId: m.businessId,
        role: m.role,
        extraPerms: m.extraPerms,
        permissions: permissionsFor(m.role as Role, m.extraPerms),
        business: m.business,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}
