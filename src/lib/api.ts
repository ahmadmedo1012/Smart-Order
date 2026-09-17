// API helpers — uniform JSON envelope + safe Arabic error mapping.
// Public contract: { success, data } | { success: false, error: { message, code? } }

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth";

export interface OkOptions {
  status?: number;
  headers?: Record<string, string>;
  meta?: Record<string, unknown>;
}

export function ok<T>(data: T, opts?: OkOptions): NextResponse {
  const body = opts?.meta
    ? { success: true, data, meta: opts.meta }
    : { success: true, data };
  return NextResponse.json(body, {
    ...(opts?.status ? { status: opts.status } : {}),
    ...(opts?.headers ? { headers: opts.headers } : {}),
  });
}

export function okList<T>(data: T[], meta?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ success: true, data, meta: meta ?? { total: data.length } });
}

export function fail(message: string, status = 400, code?: string): NextResponse {
  return NextResponse.json({ success: false, error: { message, code } }, { status });
}

/** Map any thrown error to a safe Arabic response — never leak internals. */
export function handleError(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return fail(err.message, err.status, err.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN");
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const field = first?.path?.join(".");
    return fail(first ? `${first.message}${field ? ` (${field})` : ""}` : "بيانات غير صالحة", 422, "VALIDATION");
  }
  if (err instanceof Error) {
    // Prisma unique constraint
    if (err.message.includes("Unique constraint")) {
      return fail("هذا السجل موجود مسبقاً", 409, "DUPLICATE");
    }
    if (process.env.NODE_ENV === "development") {
      console.error("[api-error]", err.message);
    } else {
      console.error("[api-error]", err.constructor?.name, (err.message || "").slice(0, 120));
    }
  }
  return fail("حدث خطأ غير متوقع، حاول مرة أخرى", 500, "INTERNAL");
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("application/json")) throw new Error("not json");
    return await req.json();
  } catch {
    throw new ZodError([
      { code: "custom", path: [], message: "صيغة الطلب غير صالحة" },
    ] as never);
  }
}
