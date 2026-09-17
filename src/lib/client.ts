"use client";

// Typed client-side API helper — uniform envelope unwrap + Arabic error extraction.

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

async function request<T>(path: string, init?: RequestInit): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  let body: Envelope<T>;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    throw new ApiError("تعذر الاتصال بالخادم، تحقق من الشبكة", res.status);
  }
  if (!res.ok || !body.success) {
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
