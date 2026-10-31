// P36 Phase C (C3) — device management: list this user's ACTIVE device
// sessions (freshest use first, current device flagged). Never exposes
// tokens or hashes — only the metadata a "devices" screen renders.

import { NextRequest } from "next/server";
import { requireMobileSession, listMobileSessions } from "@/lib/auth";
import { ok, handleError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  try {
    const { user, session } = await requireMobileSession();
    const sessions = await listMobileSessions(user.id, session.id);
    return ok({ sessions });
  } catch (err) {
    return handleError(err);
  }
}
