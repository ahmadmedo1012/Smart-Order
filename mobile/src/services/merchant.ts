/**
 * Smart Order Mobile — عميل API التاجر (Bearer — P36 Phase C).
 *
 * نفس درزة storefront.ts (مغلف {success,data,error} + مهلة 20 ثانية
 * + إعادة محاولة GET فقط) مع رأس Authorization: Bearer som_… لكل
 * مسار تاجر. التوكن يسكن SecureStore حصرًا (secure-token.ts) ويُرفق
 * من الذاكرة بعد أول قراءة.
 *
 * موت التوكن مركزي واحد: أي نداء موثّق يرتدّ 401 → يُمحى التوكن من
 * الخزنة والذاكرة ويُستدعى معالِج sessionExpired (يسجله state/auth.ts)
 * فيهبط التطبيق إلى شاشة الدخول. 401 على /login نفسه (كلمة مرور
 * خاطئة) نداء غير موثّق — يظهر خطأه في النموذج كأي ApiError.
 */
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { API_BASE_URL, REQUEST_TIMEOUT_MS, GET_RETRIES } from '@/constants/config'
import { ApiError, NetworkError } from '@/services/storefront'
import { clearMerchantToken, readMerchantToken, writeMerchantToken } from '@/lib/secure-token'
import type {
  DashboardStats,
  DeviceSession,
  LoginResponse,
  MerchantOrderDetail,
  MerchantOrderListItem,
  MeResponse,
} from '@/types/merchant'
import type { OrderStatus } from '@/types/storefront'

export { ApiError, NetworkError }

/* ── حالة التوكن (ذاكرة + خزنة آمنة) ──────────────────────────── */

let authToken: string | null = null
let tokenLoaded = false

/** يقرأ التوكن من SecureStore مرة واحدة ثم يبقيه في الذاكرة. */
export async function bootMerchantToken(): Promise<string | null> {
  if (!tokenLoaded) {
    authToken = await readMerchantToken()
    tokenLoaded = true
  }
  return authToken
}

async function stashToken(token: string): Promise<void> {
  authToken = token
  tokenLoaded = true
  await writeMerchantToken(token)
}

async function purgeToken(): Promise<void> {
  authToken = null
  tokenLoaded = true
  await clearMerchantToken()
}

/* ── إشعار موت الجلسة (يسجّله state/auth.ts — يمنع الاستيراد الدائري) ── */

type UnauthorizedHandler = () => void
let unauthorizedHandler: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(fn: UnauthorizedHandler): void {
  unauthorizedHandler = fn
}

/* ── نواة الطلب ────────────────────────────────────────────────── */

async function request<T>(
  path: string,
  init: {
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    body?: unknown
    auth?: boolean
    timeoutMs?: number
  } = { method: 'GET' },
): Promise<T> {
  const useAuth = init.auth !== false
  if (useAuth && !tokenLoaded) await bootMerchantToken()

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: init.method,
      headers: {
        Accept: 'application/json',
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(useAuth && authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
      signal: controller.signal,
    })
    const text = await res.text()
    const body = text ? JSON.parse(text) : null
    if (!res.ok) {
      // التوكن مات (انتهى/أُلغي) — إسقاط مركزي للجلسة كلها.
      if (res.status === 401 && useAuth && authToken) {
        await purgeToken()
        unauthorizedHandler?.()
      }
      throw new ApiError(res.status, body)
    }
    return unwrapBody<T>(body)
  } catch (err) {
    if (err instanceof ApiError) throw err
    // انقطاع/مهلة/JSON مكسور
    throw new NetworkError()
  } finally {
    clearTimeout(timer)
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

/** GET مع إعادة محاولة (آمنة للقراءات فقط) — كدرزة storefront. */
async function get<T>(path: string, auth = true): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= GET_RETRIES; attempt++) {
    try {
      return await request<T>(path, { method: 'GET', auth })
    } catch (err) {
      if (err instanceof ApiError) throw err
      lastErr = err
      if (attempt < GET_RETRIES) await new Promise((r) => setTimeout(r, 600 * (attempt + 1)))
    }
  }
  throw lastErr
}

/* ── المصادقة (/api/mobile/auth/*) ─────────────────────────────── */

function nativePlatform(): 'ios' | 'android' | 'unknown' {
  return Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'unknown'
}

/** POST /login — يخزّن التوكن في SecureStore ويعيد الاستجابة كاملة. */
export async function merchantLogin(input: {
  email: string
  password: string
}): Promise<LoginResponse> {
  const res = await request<LoginResponse>('/api/mobile/auth/login', {
    method: 'POST',
    auth: false,
    body: {
      email: input.email,
      password: input.password,
      platform: nativePlatform(),
      appVersion: Constants.expoConfig?.version ?? '1.0.0',
    },
  })
  await stashToken(res.token)
  return res
}

/** GET /me — فحص الجلسة الحية (401 قاسٍ عند موت التوكن، لا silent-null). */
export function fetchMe(): Promise<MeResponse> {
  return get<MeResponse>('/api/mobile/auth/me')
}

/** POST /logout — يبطل جلسة هذا الجهاز فقط (لا يمس جلسة الويب). */
export async function merchantLogout(): Promise<void> {
  try {
    await request('/api/mobile/auth/logout', { method: 'POST' })
  } finally {
    // الإبطال المحلي يفوز دائمًا حتى لو فشل النداء الشبكي.
    await purgeToken()
  }
}

/** GET /sessions — أجهزة هذا المستخدم النشطة (الأحدث استخدامًا أولًا). */
export function fetchSessions(): Promise<{ sessions: DeviceSession[] }> {
  return get<{ sessions: DeviceSession[] }>('/api/mobile/auth/sessions')
}

/** DELETE /sessions/[id] — إبطال جهاز بعينه (404 لجلسة أجنبية). */
export function revokeSession(id: string): Promise<{ revoked: boolean }> {
  return request<{ revoked: boolean }>(`/api/mobile/auth/sessions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

/* ── سطح التاجر (cookie OR Bearer — نفس مسارات الويب) ─────────── */

/** GET /api/orders?businessId&status — صندوق الطلبات. */
export function fetchOrders(
  businessId: string,
  status?: OrderStatus,
): Promise<MerchantOrderListItem[]> {
  const qs = new URLSearchParams({ businessId })
  if (status) qs.set('status', status)
  return get<MerchantOrderListItem[]>(`/api/orders?${qs.toString()}`)
}

/** GET /api/orders/[id]?businessId — تفاصيل الطلب. */
export function fetchOrderDetail(id: string, businessId: string): Promise<{ order: MerchantOrderDetail }> {
  const qs = new URLSearchParams({ businessId })
  return get<{ order: MerchantOrderDetail }>(`/api/orders/${encodeURIComponent(id)}?${qs.toString()}`)
}

/**
 * PATCH /api/orders/[id] {businessId, status} — آلة الحالات مفروضة
 * في الخادم (canTransition)؛ الإلغاء/الرفض يتطلبان orders.cancel.
 */
export function patchOrderStatus(
  id: string,
  businessId: string,
  status: OrderStatus,
): Promise<{ order: MerchantOrderDetail }> {
  return request<{ order: MerchantOrderDetail }>(`/api/orders/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: { businessId, status },
  })
}

/** GET /api/dashboard/stats?businessId — مؤشرات لوحة القيادة. */
export function fetchDashboardStats(businessId: string): Promise<DashboardStats> {
  const qs = new URLSearchParams({ businessId })
  return get<DashboardStats>(`/api/dashboard/stats?${qs.toString()}`)
}
