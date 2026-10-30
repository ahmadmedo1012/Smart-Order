import { describe, expect, it } from 'vitest'
import {
  belowMinOrder,
  cartTotals,
  deliveryFeeFor,
  unitPriceFor,
  type CartLinePricing,
} from './pricing'
import type { DeliveryZone, OptionGroup, Product, Variant } from '@/types/storefront'

const product: Product = {
  id: 'p1',
  categoryId: 'c1',
  name: 'برجر لحم',
  description: null,
  imageUrl: null,
  price: 25,
  isAvailable: true,
  isFeatured: false,
  variants: [
    { id: 'v1', name: 'مفرد', priceDelta: 0 },
    { id: 'v2', name: 'دبل', priceDelta: 15 },
  ],
  optionGroups: [
    {
      id: 'g1',
      name: 'إضافات',
      minSelect: 0,
      maxSelect: 2,
      required: false,
      options: [
        { id: 'o1', name: 'جبنة', priceDelta: 3 },
        { id: 'o2', name: 'بيكون', priceDelta: 5 },
      ],
    },
  ],
}

const zone: DeliveryZone = { id: 'z1', name: 'وسط المدينة', fee: 5, minOrder: 30 }

describe('unitPriceFor — معادلة الخادم', () => {
  it('الأساس بلا نسخة ولا إضافات', () => {
    expect(unitPriceFor(product, null, [])).toBe(25)
  })
  it('النسخة تضيف فرقها', () => {
    expect(unitPriceFor(product, 'v2', [])).toBe(40)
  })
  it('الإضافات تجمع فروقها', () => {
    expect(unitPriceFor(product, 'v1', ['o1', 'o2'])).toBe(33)
  })
  it('نسخة + إضافات معًا', () => {
    expect(unitPriceFor(product, 'v2', ['o1'])).toBe(43)
  })
  it('نسخة مجهولة تُتجاهل (دفاعية)', () => {
    expect(unitPriceFor(product, 'ghost', ['o1'])).toBe(28)
  })
})

describe('deliveryFeeFor', () => {
  it('صفر للاستلام مهما كانت المنطقة', () => {
    expect(deliveryFeeFor('PICKUP', zone)).toBe(0)
  })
  it('رسوم المنطقة للتوصيل', () => {
    expect(deliveryFeeFor('DELIVERY', zone)).toBe(5)
  })
  it('صفر بلا منطقة', () => {
    expect(deliveryFeeFor('DELIVERY', null)).toBe(0)
  })
})

describe('cartTotals', () => {
  const lines: CartLinePricing[] = [
    { productId: 'p1', variantId: 'v1', optionIds: ['o1'], quantity: 2, unitPrice: 28, lineTotal: 56 },
    { productId: 'p2', variantId: null, optionIds: [], quantity: 1, unitPrice: 10, lineTotal: 10 },
  ]
  it('يجمع ويرسم ويعدّ', () => {
    const t = cartTotals(lines, 'DELIVERY', zone)
    expect(t.subtotal).toBe(66)
    expect(t.deliveryFee).toBe(5)
    expect(t.total).toBe(71)
    expect(t.count).toBe(3)
  })
  it('الإجمالي = الفرعي للاستلام', () => {
    const t = cartTotals(lines, 'PICKUP', zone)
    expect(t.total).toBe(66)
  })
  it('سلة فارغة = أصفار', () => {
    const t = cartTotals([], 'DELIVERY', zone)
    expect(t.total).toBe(0)
    expect(t.count).toBe(0)
  })
})

describe('belowMinOrder — حد المنطقة', () => {
  it('تحت الحد للتوصيل', () => {
    expect(belowMinOrder(20, 'DELIVERY', zone)).toBe(true)
  })
  it('فوق الحد للتوصيل', () => {
    expect(belowMinOrder(35, 'DELIVERY', zone)).toBe(false)
  })
  it('الاستلام بلا حد', () => {
    expect(belowMinOrder(5, 'PICKUP', zone)).toBe(false)
  })
  it('منطقة بلا حد أدنى', () => {
    const free: DeliveryZone = { id: 'z2', name: 'قريب', fee: 0, minOrder: 0 }
    expect(belowMinOrder(1, 'DELIVERY', free)).toBe(false)
  })
})

describe('نوعية المنتج الدفاعية', () => {
  it('مجموعة إضافات فارغة لا تكسر', () => {
    const bare: Pick<Product, 'price' | 'variants' | 'optionGroups'> = {
      price: 12,
      variants: [] as Variant[],
      optionGroups: [] as OptionGroup[],
    }
    expect(unitPriceFor(bare, null, [])).toBe(12)
  })
})
