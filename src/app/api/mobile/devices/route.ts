// P38 (Phase F) — push-token registry for native devices.
//
// POST   { token, platform }  — register/refresh (upsert by token;
//        lastSeenAt touch = the device is still alive). Bearer-auth'd
//        via requireMobileSession: a token can only ever attach to the
//        user who presented the live session.
// DELETE { token }            — opt-out/revoke (the settings toggle's
//        off path, or a device uninstalling). Idempotent.
//
// The registry is credential-independent: registering + fanning out
// works today; DELIVERY requires FCM v1 (Android) + APNs (iOS)
// credentials on the EAS project (documented external blocker).

import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireMobileSession } from "@/lib/auth";
import { ok, fail, handleError, readJson } from "@/lib/api";

export const runtime = "nodejs";

const registerSchema = z.object({
  token: z.string().trim().min(16, "توكن إشعار غير صالح").max(512),
  // ExpoPushToken strings start with "ExponentPushToken[" — validate the
  // shape loosely (the push service is the final judge).
  platform: z.enum(["ios", "android", "unknown"]).default("unknown"),
});

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireMobileSession();
    const input = registerSchema.parse(await readJson(req));
    if (!input.token.startsWith("ExponentPushToken[")) {
      return fail("توكن إشعار غير صالح", 422, "VALIDATION");
    }
    const record = await db.pushToken.upsert({
      where: { token: input.token },
      create: { token: input.token, platform: input.platform, userId: user.id },
      update: { userId: user.id, platform: input.platform, lastSeenAt: new Date(), revokedAt: null },
      select: { id: true, platform: true, lastSeenAt: true },
    });
    return ok({ device: record });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user } = await requireMobileSession();
    const input = z.object({ token: z.string().trim().min(16) }).parse(await readJson(req));
    // Ownership: a user may only revoke THEIR OWN tokens.
    const result = await db.pushToken.updateMany({
      where: { token: input.token, userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return ok({ revoked: result.count > 0 });
  } catch (err) {
    return handleError(err);
  }
}
