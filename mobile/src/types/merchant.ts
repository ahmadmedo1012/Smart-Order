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

/* ── الإدارة: المنتجات والأقسام (C2-REST) ─────────────────────── */

export interface MerchantVariant {
  id: string
  name: string
  priceDelta: number
}

export interface MerchantOption {
  id: string
  name: string
  priceDelta: number
}

export interface MerchantOptionGroup {
  id: string
  name: string
  minSelect: number
  maxSelect: number
  required: boolean
  options: MerchantOption[]
}

/** منتج التاجر — GET/POST/PATCH /api/products (بلا isArchived: القائمة
 * تُرجع الحيّة فقط). الأسعار مليم صحيح؛ التحرير بسلاسل عشرية. */
export interface MerchantProduct {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  categoryId: string | null
  category: { id: string; name: string } | null
  price: number
  isAvailable: boolean
  isFeatured: boolean
  variants: MerchantVariant[]
  optionGroups: MerchantOptionGroup[]
}

export interface MerchantCategory {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  sortOrder: number
  _count?: { products: number }
}

/* ── مناطق التوصيل ────────────────────────────────────────────── */

export interface MerchantZone {
  id: string
  name: string
  fee: number
  minOrder: number
  isActive: boolean
  sortOrder: number
}

/* ── طرق الدفع ────────────────────────────────────────────────── */

export type PaymentType = 'CASH' | 'COD' | 'MANUAL' | 'WHATSAPP' | 'MADAR' | 'LIBYANA'

/** كتالوج الأنواع الست (PAYMENT_TYPES في الخادم) — بهذا الترتيب في
 * منتقي الإضافة. */
export const PAYMENT_TYPES: readonly PaymentType[] = [
  'CASH',
  'COD',
  'MANUAL',
  'WHATSAPP',
  'MADAR',
  'LIBYANA',
]

/** الأنواع التي تحمل رقم هاتف مستقبِل للحوالات (تعليمات واجهة الويب). */
export const PAYMENT_TYPES_NEEDING_NUMBER: readonly PaymentType[] = ['MADAR', 'LIBYANA', 'MANUAL', 'WHATSAPP']

/** وصف افتراضي لكل نوع (PAYMENT_TYPE_DESCRIPTIONS في الخادم) — يُقترح
 * في حقل التعليمات عند الإضافة. */
export const PAYMENT_TYPE_DESCRIPTION_AR: Record<PaymentType, string> = {
  CASH: 'ادفع نقداً عند استلام طلبك من الفرع',
  COD: 'ادفع نقداً لمندوب التوصيل عند وصول الطلب',
  MANUAL: 'حوّل المبلغ يدوياً ثم أرسل إشعار التحويل للرقم الموضح',
  WHATSAPP: 'تواصل معنا عبر واتساب لتأكيد الدفع بعد التحويل',
  MADAR: 'حوّل المبلغ عبر خدمة مدار للرقم الموضح، ثم أرسل صورة التحويل',
  LIBYANA: 'حوّل المبلغ عبر خدمة ليبيانا money أو Tijarta للرقم الموضح، ثم أرسل صورة التحويل',
}

/** طريقة دفع مفعّلة — config سلسلة JSON "{number}" أو null. */
export interface MerchantPaymentMethod {
  id: string
  type: PaymentType
  name: string
  instructions: string | null
  config: string | null
  isActive: boolean
  sortOrder: number
}

/* ── إعدادات المتجر ───────────────────────────────────────────── */

/** GET/PATCH /api/business — PATCH يعيد isActive ولا يعيد currency/
 * createdAt، والعكس؛ لذا الحقول المشتركة إلزامية والهامشية اختيارية. */
export interface MerchantBusinessFull {
  id: string
  slug: string
  name: string
  description: string | null
  logoUrl: string | null
  coverUrl: string | null
  city: string | null
  phone: string | null
  whatsappNumber: string | null
  address: string | null
  receiptFooter: string | null
  isPublished: boolean
  onboardingStep: number
  currency?: string
  createdAt?: string
  isActive?: boolean
}

/* ── العملاء ──────────────────────────────────────────────────── */

/** سطر قائمة العملاء المُثراة (GET /api/customers — orders/totalSpent). */
export interface MerchantCustomerListItem {
  id: string
  name: string
  phone: string
  notes: string | null
  createdAt: string
  orderCount: number
  totalSpent: number
  avgOrder: number
  lastOrderAt: string | null
}

export interface CustomerAddress {
  id: string
  customerId: string
  label: string | null
  city: string
  area: string | null
  addressLine: string
  isDefault: boolean
}

export interface CustomerOrderRow {
  id: string
  orderNumber: string
  status: OrderStatus
  total: number
  paymentStatus: PaymentStatus
  fulfillmentType: FulfillmentType
  createdAt: string
}

/** تفاصيل العميل (GET /api/customers/[id]) — مع سجل الطلبات والإحصاء. */
export interface MerchantCustomerDetail {
  id: string
  name: string
  phone: string
  notes: string | null
  createdAt: string
  addresses: CustomerAddress[]
  orders: CustomerOrderRow[]
  stats: { orderCount: number; totalSpent: number; avgOrder: number }
}

/* ── الفريق ───────────────────────────────────────────────────── */

export interface StaffMember {
  id: string
  role: Role
  extraPerms: string[] | null
  createdAt: string
  user: { id: string; email: string; name: string; phone: string | null; createdAt: string }
}

/* ── التقارير (GET /api/mobile/reports) ───────────────────────── */

export interface MobileReportSummary {
  window: { from: string; to: string; days: number }
  totals: { orders: number; revenue: number; avgOrder: number }
  statusCounts: Record<string, number>
  series: { day: string; date: string; revenue: number; orders: number }[]
  canExportCsv: boolean
}
