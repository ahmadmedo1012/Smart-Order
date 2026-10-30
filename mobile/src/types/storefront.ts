/**
 * Smart Order Mobile — أنواع واجهة المتجر العامة.
 *
 * مرآة حرفية لعقد الخادم (src/app/api/public/store/[slug]/route.ts
 * + orders/route.ts + track/[token]/route.ts) — الخادم يعيد التسعير
 * دائمًا؛ هذه الأنواع للعرض فقط، لا للثقة المالية.
 */

export interface Business {
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
}

export interface Category {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  sortOrder: number
}

export interface Variant {
  id: string
  name: string
  priceDelta: number
}

export interface Option {
  id: string
  name: string
  priceDelta: number
}

export interface OptionGroup {
  id: string
  name: string
  minSelect: number
  maxSelect: number
  required: boolean
  options: Option[]
}

export interface Product {
  id: string
  categoryId: string | null
  name: string
  description: string | null
  imageUrl: string | null
  price: number
  isAvailable: boolean
  isFeatured: boolean
  variants: Variant[]
  optionGroups: OptionGroup[]
}

export interface DeliveryZone {
  id: string
  name: string
  fee: number
  minOrder: number
}

export interface PaymentMethod {
  id: string
  type: string
  name: string
  instructions: string | null
  config: string | null
}

export interface StorefrontData {
  business: Business
  categories: Category[]
  products: Product[]
  deliveryZones: DeliveryZone[]
  paymentMethods: PaymentMethod[]
}

export type OrderStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REJECTED'

export type FulfillmentType = 'DELIVERY' | 'PICKUP'

export const ORDER_STATUS_AR: Record<OrderStatus, string> = {
  NEW: 'جديد',
  CONFIRMED: 'مؤكد',
  PREPARING: 'قيد التحضير',
  READY: 'جاهز',
  OUT_FOR_DELIVERY: 'خرج للتوصيل',
  DELIVERED: 'تم التسليم',
  CANCELLED: 'ملغي',
  REJECTED: 'مرفوض',
}

export const FULFILLMENT_AR: Record<FulfillmentType, string> = {
  DELIVERY: 'توصيل',
  PICKUP: 'استلام من المتجر',
}

/** عائلة الطابع لكل حالة — نفس خريطة status-badges للويب. */
export const ORDER_STATUS_FAMILY: Record<OrderStatus, 'copper' | 'sky' | 'yellow' | 'mint' | 'grey' | 'rose'> = {
  NEW: 'copper',
  CONFIRMED: 'sky',
  PREPARING: 'yellow',
  READY: 'copper',
  OUT_FOR_DELIVERY: 'sky',
  DELIVERED: 'mint',
  CANCELLED: 'grey',
  REJECTED: 'rose',
}

export interface CreateOrderInput {
  slug: string
  idempotencyKey: string
  fulfillmentType: FulfillmentType
  customerName: string
  customerPhone: string
  city: string
  area: string
  addressLine: string
  customerNote: string
  deliveryZoneId: string | null
  paymentMethodId: string | null
  items: {
    productId: string
    variantId: string | null
    optionIds: string[]
    quantity: number
    note: string
  }[]
}

export interface CreatedOrder {
  id: string
  orderNumber: string
  publicToken: string
  subtotal: number
  deliveryFee: number
  total: number
  replay?: boolean
}

export interface TrackedOrderItem {
  productName: string
  variantName: string | null
  quantity: number
  lineTotal: number
  options: string[]
}

export interface TrackedOrder {
  orderNumber: string
  status: OrderStatus
  fulfillmentType: FulfillmentType
  total: number
  subtotal: number
  deliveryFee: number
  paymentStatus: string
  paymentMethod: string | null
  customerConfirmedAt: string | null
  customerName: string
  city: string | null
  area: string | null
  createdAt: string
  items: TrackedOrderItem[]
  history: { toStatus: OrderStatus; createdAt: string }[]
  business: {
    name: string
    slug: string
    phone: string | null
    whatsappNumber: string | null
    logoUrl: string | null
  }
}
