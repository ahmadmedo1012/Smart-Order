// P36 Phase C (C3) — the mobile session probe.
//
// Deliberately NOT the web /api/auth/me shape ({user} | {user:null},
// 200 either way): a native client needs a hard 401 it can intercept
// once for token death (expired/revoked/absent) — silent-null probing
// is how zombie tokens survive in device storage. Bearer-only by
// contract (requireMobileSession): a cookie never authenticates here.

import { NextRequest } from "next/server";
import { requireMobileSession, permissionsFor } from "@/lib/auth";
import { ok, handleError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  try {
    const { user, session } = await requireMobileSession();
    return ok({
      user: { id: user.id, email: user.email, name: user.name, isPlatformAdmin: user.isPlatformAdmin },
      memberships: user.memberships.map((m) => ({
        businessId: m.businessId,
        role: m.role,
        extraPerms: m.extraPerms,
        permissions: permissionsFor(m.role, m.extraPerms),
        business: m.business,
      })),
      session,
    });
  } catch (err) {
    return handleError(err);
  }
}
