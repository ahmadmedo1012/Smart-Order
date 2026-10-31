// P36 Phase C (C3) — native logout: revokes the presenting device only.
//
// The web cookie logout (api/auth/logout) is untouched and independent —
// logging out on the phone must never kill the dashboard session and
// vice versa (separate transports, separate credentials). Revocation is
// a soft stamp (revokedAt): the row is immediately dead to authz and is
// swept after 7d (createMobileSession housekeeping).

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireMobileSession, revokeMobileSessionById } from "@/lib/auth";
import { ok, handleError } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  try {
    const { user, session } = await requireMobileSession();
    await revokeMobileSessionById(user.id, session.id);
    await db.auditLog.create({
      data: { userId: user.id, action: "MOBILE_LOGOUT", entity: "MobileSession", entityId: session.id },
    });
    return ok({ loggedOut: true });
  } catch (err) {
    return handleError(err);
  }
}
