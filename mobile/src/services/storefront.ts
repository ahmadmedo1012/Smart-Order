/**
 * Smart Order Mobile — عميل API الموحد (نسخة العائلة من SmartBot).
 *
 * عقد الويب: { success, data } | { success: false, error: { message,
 * code? } } — فك مركزي واحد. مهلة 20 ثانية + إعادة محاولة GET فقط
 * (آمنة). لا مصادقة هنا: رحلة الضيف (الطلب العام) لا تحتاج توكنًا.
 */
import { API_BASE_URL, REQUEST_TIMEOUT_MS, GET_RETRIES } from '@/constants/config'
import type { CreateOrderInput, CreatedOrder, StorefrontData, TrackedOrder } from '@/types/storefront'

/** خطأ API موحد — يحمل رسالة الباكند العربية أولًا. */
export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, body: unknown) {
    const b = body as { error?: { message?: string } | string; message?: string } | null
    const errObj = typeof b?.error === 'object' ? b?.error : null
    const detail = errObj?.message ?? (typeof b?.error === 'string' ? b.error : b?.message)
    super(typeof detail === 'string' && detail ? detail : `تعذر إتمام الطلب (${status})`)
    this.status = status
    this.body = body
  }
}

/** خطأ شبكة (انقطاع/مهلة) — قابل للإعادة. */
export class NetworkError extends Error {
  constructor(message = 'تعذر الاتصال بالخادم — تحقق من الإنترنت') {
    super(message)
  }
}

function unwrapBody<T>(body: unknown): T {
  if (body !== null && typeof body === 'object' && 'success' in (body as Record<string, unknown>)) {
    const envelope = body as { success: boolean; data?: unknown; error?: unknown }
    if (!envelope.success) {
      throw new ApiError(200, envelope)
    }
    return envelope.data as T
  }
  return body as T
}

async function request<T>(
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown; timeoutMs?: number } = { method: 'GET' },
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: init.method,
      headers: {
        Accept: 'application/json',
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
      signal: controller.signal,
    })
    const text = await res.text()
    const body = text ? JSON.parse(text) : null
    if (!res.ok) throw new ApiError(res.status, body)
    return unwrapBody<T>(body)
  } catch (err) {
    if (err instanceof ApiError) throw err
    // انقطاع/مهلة/JSON مكسور
    throw new NetworkError()
  } finally {
    clearTimeout(timer)
  }
}

/** GET مع إعادة محاولة (آمنة للقراءات فقط). */
async function get<T>(path: string): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= GET_RETRIES; attempt++) {
    try {
      return await request<T>(path)
    } catch (err) {
      if (err instanceof ApiError) throw err
      lastErr = err
      if (attempt < GET_RETRIES) await new Promise((r) => setTimeout(r, 600 * (attempt + 1)))
    }
  }
  throw lastErr
}

/* ── الواجهات العامة (نفس مسارات الويب) ─────────────────────────── */

export function fetchStorefront(slug: string): Promise<StorefrontData> {
  return get<StorefrontData>(`/api/public/store/${encodeURIComponent(slug)}`)
}

export function createOrder(input: CreateOrderInput): Promise<{
  order: CreatedOrder
  whatsapp: { number: string; message: string } | null
}> {
  return request('/api/public/orders', { method: 'POST', body: input, timeoutMs: 30_000 })
}

export function trackOrder(token: string): Promise<{ order: TrackedOrder }> {
  return get<{ order: TrackedOrder }>(`/api/public/track/${encodeURIComponent(token)}`)
}
