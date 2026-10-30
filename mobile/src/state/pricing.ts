/**
 * Smart Order Mobile — منطق تسعير السلة (نفس معادلة إعادة التسعير
 * في الخادم: (الأساس + فرق النسخة + مجموع فروق الإضافات) × الكمية).
 *
 * دوال نقية قابلة للاختبار — المتجر (zustand) يستهلكها فقط.
 */
import type { DeliveryZone, FulfillmentType, OptionGroup, Product, Variant } from '@/types/storefront'

export interface CartLinePricing {
  productId: string
  variantId: string | null
  optionIds: string[]
  quantity: number
  unitPrice: number
  lineTotal: number
}

/** سعر الوحدة لخيار منتج معيّن: الأساس + فرق النسخة + فروق الإضافات. */
export function unitPriceFor(
  product: Pick<Product, 'price' | 'variants' | 'optionGroups'>,
  variantId: string | null,
  optionIds: readonly string[],
): number {
  let price = product.price
  const variant = product.variants.find((v: Variant) => v.id === variantId)
  if (variant) price += variant.priceDelta
  const optionPrice = product.optionGroups.reduce((sum, g: OptionGroup) => {
    return (
      sum +
      g.options
        .filter((o) => optionIds.includes(o.id))
        .reduce((s, o) => s + o.priceDelta, 0)
    )
  }, 0)
  return price + optionPrice
}

/** رسوم التوصيل للمنطقة المختارة (صفر للاستلام). */
export function deliveryFeeFor(
  fulfillment: FulfillmentType,
  zone: DeliveryZone | null,
): number {
  if (fulfillment !== 'DELIVERY') return 0
  return zone?.fee ?? 0
}

/** إجماليات السلة — الإجمالي الفرعي، الرسوم، الكل، وعدد القطع.
 *  سلة فارغة = أصفار كاملة (لا رسوم توصيل بلا طلب — عقد العرض). */
export function cartTotals(
  lines: CartLinePricing[],
  fulfillment: FulfillmentType,
  zone: DeliveryZone | null,
): { subtotal: number; deliveryFee: number; total: number; count: number } {
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0)
  const deliveryFee = lines.length === 0 ? 0 : deliveryFeeFor(fulfillment, zone)
  const count = lines.reduce((s, l) => s + l.quantity, 0)
  return { subtotal, deliveryFee, total: subtotal + deliveryFee, count }
}

/** هل السلة تحت حد الطلب الأدنى للمنطقة؟ (الخادم يرفض دونه). */
export function belowMinOrder(
  subtotal: number,
  fulfillment: FulfillmentType,
  zone: DeliveryZone | null,
): boolean {
  if (fulfillment !== 'DELIVERY' || !zone) return false
  return zone.minOrder > 0 && subtotal < zone.minOrder
}
