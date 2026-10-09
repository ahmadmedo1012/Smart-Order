"use client";

// Typed client-side API helper — uniform envelope unwrap + Arabic error extraction.

import { toast } from "sonner";

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  meta?: Record<string, unknown>;
  error?: { message: string; code?: string };
}

/* r132 (A2 F5): session-expiry handling lives HERE so every api.* consumer
   inherits it. Before this branch a 401 surfaced as a manual-dismiss toast
   ("يجب تسجيل الدخول للمتابعة") while the page stayed a dead surface —
   every action kept failing identically and only a full navigation
   recovered. Now the FIRST 401/UNAUTHENTICATED (outside /api/auth/*, so a
   wrong password on login never triggers it):
     1. clears the stale server session — the cookie is httpOnly, so only
        the server can drop it: fire-and-forget POST /api/auth/logout with
        keepalive (the request survives the navigation below);
     2. tells the user why they are leaving (Arabic toast — error toasts
        are manual-dismiss app-wide, so it stays readable);
     3. lands on /login?expired=1 (replace(): the dead page never enters
        Back history). The beat before replace() keeps the toast
        perceivable; deduped once per page load so parallel failures
        (poll + mutation) trigger a single redirect. */
let sessionExpiryHandled = false;

function handleSessionExpired(): void {
  if (sessionExpiryHandled) return;
  sessionExpiryHandled = true;
  fetch("/api/auth/logout", { method: "POST", keepalive: true }).catch(() => {});
  toast.error("انتهت الجلسة، يرجى تسجيل الدخول");
  window.setTimeout(() => window.location.replace("/login?expired=1"), 1200);
}

function isSessionExpiry(path: string, status: number, code?: string): boolean {
  if (path.startsWith("/api/auth/")) return false;
  return status === 401 || code === "UNAUTHENTICATED";
}

async function request<T>(path: string, init?: RequestInit): Promise<{ data: T; meta?: Record<string, unknown> }> {
  /* r133 (A2 N1): a network-level fetch failure (offline, DNS, dropped
     mobile data) used to rethrow the raw engine TypeError — "Failed to
     fetch" / "Load failed" — which the ~30 `e instanceof Error ?
     e.message` catch sites then printed inside Arabic toasts (money
     path included). Wrapped once HERE, every api.* consumer inherits
     the Arabic ApiError (SM r120-U5 getErrorMessage twin, one seam). */
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "تعذّر الاتصال بالشبكة — تحقّق من اتصالك وحاول مرة أخرى",
      0,
    );
  }
  let body: Envelope<T>;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    throw new ApiError("تعذّر الاتصال بالخادم، تحقّق من الشبكة", res.status);
  }
  if (!res.ok || !body.success) {
    if (isSessionExpiry(path, res.status, body.error?.code)) handleSessionExpired();
    throw new ApiError(body.error?.message ?? "حدث خطأ غير متوقع", res.status, body.error?.code);
  }
  return { data: body.data as T, meta: body.meta };
}

export const api = {
  get<T>(path: string) {
    return request<T>(path);
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
  },
  patch<T>(path: string, body?: unknown) {
    return request<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) });
  },
  delete<T>(path: string) {
    return request<T>(path, { method: "DELETE" });
  },
};
