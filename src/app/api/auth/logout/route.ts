import { NextRequest } from "next/server";
import { destroySession, requireAuth, getAuthUser } from "@/lib/auth";
import { ok, handleError } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  try {
    await destroySession();
    return ok({ loggedOut: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function GET(_req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return ok({ user: null });
    return ok({ user });
  } catch (err) {
    return handleError(err);
  }
}
