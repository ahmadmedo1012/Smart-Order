/**
 * Smart Order Mobile — أنواع واجهة التاجر (P36 Phase C).
 *
 * مرآة حرفية لعقد الخادم (src/app/api/mobile/auth/* + /api/orders* +
 * /api/dashboard/stats) — انظر contracts/smart-order-mobile-api.md.
 * كل المبالغ أعداد صحيحة «مليم» (1 د.ل = 1000 مليم): العرض عبر
 * formatMillimes حصرًا، ولا حساب عشري أبدًا.
 */
import type { FulfillmentType, OrderStatus } from './storefront'

/* ── المصادقة والجلسات ─────────────────────────────────────────── */

export type Role = 'OWNER' | 'ADMIN' | 'STAFF'

export const ROLE_AR: Record<Role, string> = {
  OWNER: 'مالك',
  ADMIN: 'مدير',
  STAFF: 'موظف',
}

/** صلاحيات الخادم (ROLE_PERMISSIONS في src/lib/constants.ts) — التطبيق
 *  يقرأها من memberships فعلًا ولا يشتقها محليًا. */
export type Permission =
  | 'orders.read'
  | 'orders.update'
  | 'orders.cancel'
  | 'products.read'
  | 'products.manage'
  | 'categories.manage'
  | 'customers.read'
  | 'customers.manage'
  | 'delivery.manage'
  | 'payments.manage'
  | 'settings.manage'
  | 'staff.manage'

export interface MerchantBusinessSummary {
  id: string
  slug: string
  name: string
  isPublished: boolean
  onboardingStep: string
}

export interface Membership {
  businessId: string
  role: Role
  extraPerms: string[] | null
  permissions: string[]
  business: MerchantBusinessSummary
}

export interface AuthUser {
  id: string
  email: string
  name: string
  isPlatformAdmin: boolean
}

/** جلسة جهاز — بلا توكن ولا هاش أبدًا (عقد sessions). */
export interface DeviceSession {
  id: string
  platform: string
  deviceName: string | null
  appVersion: string | null
  lastUsedAt: string
  createdAt: string
  expiresAt: string
  current?: boolean
}

export interface LoginResponse {
  token: string
  tokenType: 'Bearer'
  expiresAt: string
  user: AuthUser
  memberships: Membership[]
}

export interface MeResponse {
  user: AuthUser
  memberships: Membership[]
  session: DeviceSession
}

/* ── الطلبات ───────────────────────────────────────────────────── */

export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED'

export const PAYMENT_STATUS_AR: Record<PaymentStatus, string> = {
  UNPAID: 'غير مدفوع',
  PAID: 'مدفوع',
  REFUNDED: 'مسترجع',
}

export const PAYMENT_TYPE_AR: Record<string, string> = {
  CASH: 'نقداً عند الاستلام',
  COD: 'الدفع عند التوصيل',
  MANUAL: 'تحويل يدوي',
  WHATSAPP: 'تأكيد دفع عبر واتساب',
  MADAR: 'مدار (تحويل موبايل)',
  LIBYANA: 'ليبيانا (تحويل موبايل)',
}

/** سطر قائمة الطلبات — select دقيق من /api/orders. */
export interface MerchantOrderListItem {
  id: string
  orderNumber: string
  status: OrderStatus
  fulfillmentType: FulfillmentType
  total: number
  paymentStatus: PaymentStatus
  paymentType: string | null
  customerName: string
  customerPhone: string
  city: string | null
  area: string | null
  createdAt: string
  customerConfirmedAt: string | null
  _count: { items: number }
}

/** لقطة الإضافات في سطر الطلب — optionsJson في الخادم. */
export interface OrderItemOptionSnapshot {
  name: string
  priceDelta: number
}

export interface MerchantOrderItem {
  id: string
  orderId: string
  productId: string | null
  productName: string
  variantId: string | null
  variantName: string | null
  unitPrice: number
  quantity: number
  lineTotal: number
  note: string | null
  optionsJson: string | null
}

export interface OrderHistoryRow {
  id: string
  orderId: string
  fromStatus: string | null
  toStatus: string
  note: string | null
  changedById: string | null
  changedByName: string | null
  createdAt: string
}

export interface MerchantOrderDetail {
  id: string
  businessId: string
  orderNumber: string
  publicToken: string
  status: OrderStatus
  fulfillmentType: FulfillmentType
  subtotal: number
  discount: number
  deliveryFee: number
  total: number
  paymentMethodId: string | null
  paymentMethodName: string | null
  paymentType: string | null
  paymentStatus: PaymentStatus
  customerName: string
  customerPhone: string
  city: string | null
  area: string | null
  addressLine: string | null
  customerNote: string | null
  internalNote: string | null
  customerConfirmedAt: string | null
  createdAt: string
  updatedAt: string
  customer: { id: string; name: string; phone: string; notes: string | null } | null
  business: { id: string; name: string; slug: string; whatsappNumber: string | null; phone: string | null }
  items: MerchantOrderItem[]
  history: OrderHistoryRow[]
}

/* ── لوحة القيادة ──────────────────────────────────────────────── */

export interface DashboardPlan {
  name: string
  nameAr: string | null
  price: number
  maxProducts: number | null
  maxOrders: number | null
}

export interface DashboardStats {
  plan: DashboardPlan | null
  monthOrders: number
  stats: {
    todayOrders: number
    pendingCount: number
    todayCompleted: number
    todayCancelled: number
    todayRevenue: number
    newCustomersToday: number
    avgOrder: number
    productCount: number
    categoryCount: number
    zoneCount: number
    statusCounts: Record<string, number>
  }
  recentOrders: {
    id: string
    orderNumber: string
    status: OrderStatus
    total: number
    fulfillmentType: FulfillmentType
    customerName: string
    customerPhone: string
    createdAt: string
    paymentStatus: PaymentStatus
  }[]
  lowStock: { id: string; name: string; stockQuantity: number }[]
  weekSeries: { day: string; revenue: number; orders: number }[]
}
