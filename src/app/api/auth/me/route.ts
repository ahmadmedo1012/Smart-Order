import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { ok, handleError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  try {
    const user = await getAuthUser();
    return ok({ user });
  } catch (err) {
    return handleError(err);
  }
}
