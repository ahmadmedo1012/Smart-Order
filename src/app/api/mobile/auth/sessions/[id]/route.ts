// P36 Phase C (C3) — device management: revoke ONE device session by id
// (remote logout — "this device" uses POST /api/mobile/auth/logout).
// Ownership is enforced in the CAS itself (userId in the where clause):
// another user's session id is indistinguishable from a missing one
// (404, no cross-user oracle).

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireMobileSession, revokeMobileSessionById } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/api";

export const runtime = "nodejs";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { user, session } = await requireMobileSession();
    const revoked = await revokeMobileSessionById(user.id, id);
    if (!revoked) return fail("الجلسة غير موجودة", 404, "NOT_FOUND");
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "MOBILE_SESSION_REVOKED",
        entity: "MobileSession",
        entityId: id,
        metadata: JSON.stringify({ self: id === session.id }),
      },
    });
    return ok({ revoked: true });
  } catch (err) {
    return handleError(err);
  }
}
