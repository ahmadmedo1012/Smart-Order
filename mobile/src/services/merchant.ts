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
  MerchantBusinessFull,
  MerchantCategory,
  MerchantCustomerDetail,
  MerchantCustomerListItem,
  MerchantOrderDetail,
  MerchantOrderListItem,
  MerchantPaymentMethod,
  MerchantProduct,
  MerchantZone,
  MeResponse,
  MobileReportSummary,
  PaymentType,
  StaffMember,
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

/* ── الإدارة (C2-REST) — نفس مسارات الويب، Bearer ─────────────── */

/** GET /api/products?businessId — المنتجات الحيّة مع الأقسام/الأحجام/
 * مجموعات الإضافات (products.read). */
export function fetchProducts(businessId: string): Promise<{ products: MerchantProduct[] }> {
  const qs = new URLSearchParams({ businessId })
  return get<{ products: MerchantProduct[] }>(`/api/products?${qs.toString()}`)
}

/** جسم إنشاء/تعديل منتج — الأسعار سلاسل عشرية («12.500») يفكّها
 * parseLyd في الخادم؛ لا أرقام عائمة أبدًا. */
export interface ProductInput {
  name: string
  description?: string
  categoryId?: string | null
  /** سلسلة عشرية «12.500» — الخادم يحوّلها مليمًا صحيحًا. */
  price: string
  isAvailable: boolean
  isFeatured?: boolean
  variants?: { name: string; priceDelta: string }[]
  optionGroups?: {
    name: string
    required: boolean
    maxSelect: number
    minSelect?: number
    options: { name: string; priceDelta: string }[]
  }[]
}

/** POST /api/products — إنشاء (products.manage؛ حد الخطة 409). */
export function createProduct(
  businessId: string,
  input: ProductInput,
): Promise<{ product: MerchantProduct }> {
  return request<{ product: MerchantProduct }>('/api/products', {
    method: 'POST',
    body: { businessId, ...input },
  })
}

/** PATCH /api/products/[id] — تعديل (variants/optionGroups تُستبدل
 * كاملة من جانب الخادم). */
export function updateProduct(
  id: string,
  businessId: string,
  input: ProductInput,
): Promise<{ product: MerchantProduct }> {
  return request<{ product: MerchantProduct }>(`/api/products/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: { businessId, ...input },
  })
}

/** DELETE /api/products/[id] — أرشفة دائمًا (لا حذف نهائي مع التاريخ). */
export function archiveProduct(id: string, businessId: string): Promise<{ archived: boolean }> {
  const qs = new URLSearchParams({ businessId })
  return request<{ archived: boolean }>(`/api/products/${encodeURIComponent(id)}?${qs.toString()}`, {
    method: 'DELETE',
  })
}

/** GET /api/categories?businessId — مع _count.products (products.read). */
export function fetchCategories(businessId: string): Promise<{ categories: MerchantCategory[] }> {
  const qs = new URLSearchParams({ businessId })
  return get<{ categories: MerchantCategory[] }>(`/api/categories?${qs.toString()}`)
}

/** POST /api/categories — قسم جديد (categories.manage). */
export function createCategory(
  businessId: string,
  name: string,
): Promise<{ category: MerchantCategory }> {
  return request<{ category: MerchantCategory }>('/api/categories', {
    method: 'POST',
    body: { businessId, name },
  })
}

/** PATCH /api/categories/[id] — إعادة تسمية. */
export function renameCategory(
  id: string,
  businessId: string,
  name: string,
): Promise<{ category: MerchantCategory }> {
  return request<{ category: MerchantCategory }>(`/api/categories/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: { businessId, name },
  })
}

/** DELETE /api/categories/[id] — فارغ → حذف نهائي، بمنتجات → أرشفة. */
export function deleteCategory(
  id: string,
  businessId: string,
): Promise<{ deleted: boolean } | { archived: boolean }> {
  const qs = new URLSearchParams({ businessId })
  return request<{ deleted: boolean } | { archived: boolean }>(
    `/api/categories/${encodeURIComponent(id)}?${qs.toString()}`,
    { method: 'DELETE' },
  )
}

/** GET /api/delivery-zones?businessId — مع isActive (delivery.manage). */
export function fetchZones(businessId: string): Promise<{ zones: MerchantZone[] }> {
  const qs = new URLSearchParams({ businessId })
  return get<{ zones: MerchantZone[] }>(`/api/delivery-zones?${qs.toString()}`)
}

/** جسم منطقة — الرسوم/الحد الأدنى سلاسل عشرية. */
export interface ZoneInput {
  name: string
  fee: string
  minOrder?: string
  isActive?: boolean
}

/** POST /api/delivery-zones — منطقة جديدة. */
export function createZone(businessId: string, input: ZoneInput): Promise<{ zone: MerchantZone }> {
  return request<{ zone: MerchantZone }>('/api/delivery-zones', {
    method: 'POST',
    body: { businessId, ...input },
  })
}

/** PATCH /api/delivery-zones/[id] — تعديل الرسوم/الحد/التفعيل. */
export function updateZone(
  id: string,
  businessId: string,
  input: ZoneInput,
): Promise<{ zone: MerchantZone }> {
  return request<{ zone: MerchantZone }>(`/api/delivery-zones/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: { businessId, ...input },
  })
}

/** DELETE /api/delivery-zones/[id] — حذف نهائي. */
export function deleteZone(id: string, businessId: string): Promise<{ deleted: boolean }> {
  const qs = new URLSearchParams({ businessId })
  return request<{ deleted: boolean }>(
    `/api/delivery-zones/${encodeURIComponent(id)}?${qs.toString()}`,
    { method: 'DELETE' },
  )
}

/** GET /api/payment-methods?businessId — بالترتيب المعروض للعملاء. */
export function fetchPaymentMethods(
  businessId: string,
): Promise<{ methods: MerchantPaymentMethod[] }> {
  const qs = new URLSearchParams({ businessId })
  return get<{ methods: MerchantPaymentMethod[] }>(`/api/payment-methods?${qs.toString()}`)
}

/** جسم تفعيل طريقة دفع — number لتحويلات المحافظ (اختياري للخادم،
 * الويب يطلبه لأنواع المحافظ). */
export interface PaymentMethodInput {
  type: PaymentType
  name: string
  instructions: string
  number: string
}

/** POST /api/payment-methods — تفعيل نوع جديد (unique لكل نوع). */
export function createPaymentMethod(
  businessId: string,
  input: PaymentMethodInput,
): Promise<{ method: MerchantPaymentMethod }> {
  return request<{ method: MerchantPaymentMethod }>('/api/payment-methods', {
    method: 'POST',
    body: { businessId, ...input },
  })
}

/** PATCH /api/payment-methods/[id] — تعليمات/رقم/تفعيل. */
export function updatePaymentMethod(
  id: string,
  businessId: string,
  input: { name?: string; instructions?: string; number?: string; isActive?: boolean },
): Promise<{ method: MerchantPaymentMethod }> {
  return request<{ method: MerchantPaymentMethod }>(
    `/api/payment-methods/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: { businessId, ...input } },
  )
}

/** DELETE /api/payment-methods/[id] — إزالة الطريقة. */
export function deletePaymentMethod(
  id: string,
  businessId: string,
): Promise<{ deleted: boolean }> {
  const qs = new URLSearchParams({ businessId })
  return request<{ deleted: boolean }>(
    `/api/payment-methods/${encodeURIComponent(id)}?${qs.toString()}`,
    { method: 'DELETE' },
  )
}

/** PATCH /api/payment-methods — إعادة الترتيب: القائمة الكاملة
 * المرتّبة (C4؛ ناقصة/مكررة → 422، غريبة → 404). */
export function reorderPaymentMethods(
  businessId: string,
  order: string[],
): Promise<{ methods: MerchantPaymentMethod[] }> {
  return request<{ methods: MerchantPaymentMethod[] }>('/api/payment-methods', {
    method: 'PATCH',
    body: { businessId, order },
  })
}

/** GET /api/business?businessId — الإعدادات الكاملة. */
export function fetchBusiness(businessId: string): Promise<{ business: MerchantBusinessFull }> {
  const qs = new URLSearchParams({ businessId })
  return get<{ business: MerchantBusinessFull }>(`/api/business?${qs.toString()}`)
}

/** PATCH /api/business — الحقول المعدّلة فقط؛ النشر يفشل برفق (200 مع
 * published:false + reason) إن لم يكن المتجر قابلًا للنشر. */
export function updateBusiness(
  businessId: string,
  input: {
    name?: string
    whatsappNumber?: string | null
    phone?: string | null
    city?: string | null
    address?: string | null
    receiptFooter?: string | null
    isPublished?: boolean
  },
): Promise<{ business: MerchantBusinessFull } | { published: false; reason: string }> {
  return request<{ business: MerchantBusinessFull } | { published: false; reason: string }>(
    '/api/business',
    { method: 'PATCH', body: { businessId, ...input } },
  )
}

/** GET /api/customers?businessId&q — قائمة مُثراة بالبحث (name/phone). */
export function fetchCustomers(
  businessId: string,
  q: string,
): Promise<MerchantCustomerListItem[]> {
  const qs = new URLSearchParams({ businessId })
  if (q) qs.set('q', q)
  return get<MerchantCustomerListItem[]>(`/api/customers?${qs.toString()}`)
}

/** GET /api/customers/[id]?businessId — تفاصيل + سجل الطلبات. */
export function fetchCustomerDetail(
  id: string,
  businessId: string,
): Promise<{ customer: MerchantCustomerDetail }> {
  const qs = new URLSearchParams({ businessId })
  return get<{ customer: MerchantCustomerDetail }>(
    `/api/customers/${encodeURIComponent(id)}?${qs.toString()}`,
  )
}

/** GET /api/staff?businessId — أعضاء الفريق (staff.manage). */
export function fetchStaff(businessId: string): Promise<{ staff: StaffMember[] }> {
  const qs = new URLSearchParams({ businessId })
  return get<{ staff: StaffMember[] }>(`/api/staff?${qs.toString()}`)
}

/** POST /api/staff — إنشاء حساب + عضوية فريق (بلا دعوات، كلمة المرور
 * يضعها المالك؛ OWNER ممنوع، حد المقاعد حسب الخطة 409). */
export function createStaff(
  businessId: string,
  input: { name: string; email: string; password: string; role: 'ADMIN' | 'STAFF' },
): Promise<{ staff: StaffMember }> {
  return request<{ staff: StaffMember }>('/api/staff', {
    method: 'POST',
    body: { businessId, ...input },
  })
}

/** GET /api/mobile/reports?businessId&from&to — ملخص نافذة (≤366 يومًا،
 * لا مستقبل)؛ بوابة الخطة بريميوم+ تردّ 403 برسالة عربية. */
export function fetchMobileReports(
  businessId: string,
  from: string,
  to: string,
): Promise<MobileReportSummary> {
  const qs = new URLSearchParams({ businessId, from, to })
  return get<MobileReportSummary>(`/api/mobile/reports?${qs.toString()}`)
}
