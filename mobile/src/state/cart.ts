/**
 * Smart Order Mobile — متجر السلة (zustand).
 *
 * السلة حيّة داخل الجلسة فقط (لا تُخزَّن): الأسعار والأسهم تتغير على
 * الخادم — التخزين المحلي يسوّق وعودًا مالية قديمة. كل سطر يحمل
 * أسماء العرض (نسخة/إضافات) + التسعير المُعاد حسابه من معادلة
 * الخادم نفسها (state/pricing.ts).
 */
import { create } from 'zustand'
import { unitPriceFor } from './pricing'
import type {
  DeliveryZone,
  FulfillmentType,
  Product,
} from '@/types/storefront'

export interface CartLine {
  key: string
  productId: string
  productName: string
  imageUrl: string | null
  variantId: string | null
  variantName: string | null
  optionIds: string[]
  optionNames: string[]
  note: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

interface CartState {
  slug: string | null
  businessName: string | null
  lines: CartLine[]
  fulfillment: FulfillmentType
  zoneId: string | null
  setStore: (slug: string, businessName: string) => void
  addLine: (product: Product, opts: {
    variantId: string | null
    optionIds: string[]
    note: string
    quantity: number
  }) => void
  setQuantity: (key: string, quantity: number) => void
  removeLine: (key: string) => void
  setFulfillment: (f: FulfillmentType) => void
  setZone: (zoneId: string | null) => void
  clear: () => void
}

/** مفتاح السطر: منتج + نسخة + إضافات مرتبة + ملاحظة = سطر واحد قابل للدمج. */
function lineKey(productId: string, variantId: string | null, optionIds: string[], note: string): string {
  return [productId, variantId ?? '-', ...[...optionIds].sort(), note].join('|')
}

export const useCart = create<CartState>((set, get) => ({
  slug: null,
  businessName: null,
  lines: [],
  fulfillment: 'DELIVERY',
  zoneId: null,

  setStore: (slug, businessName) => {
    const cur = get()
    if (cur.slug === slug) return
    // متجر جديد = سلة جديدة (سلة متجر لا تُشحن لمتجر آخر).
    set({ slug, businessName, lines: [], zoneId: null, fulfillment: 'DELIVERY' })
  },

  addLine: (product, opts) => {
    const state = get()
    const variantName = product.variants.find((v) => v.id === opts.variantId)?.name ?? null
    const optionNames = product.optionGroups
      .flatMap((g) => g.options)
      .filter((o) => opts.optionIds.includes(o.id))
      .map((o) => o.name)
    const unitPrice = unitPriceFor(product, opts.variantId, opts.optionIds)
    const key = lineKey(product.id, opts.variantId, opts.optionIds, opts.note)
    const existing = state.lines.find((l) => l.key === key)
    if (existing) {
      set({
        lines: state.lines.map((l) =>
          l.key === key
            ? { ...l, quantity: Math.min(l.quantity + opts.quantity, 99), lineTotal: unitPrice * Math.min(l.quantity + opts.quantity, 99) }
            : l,
        ),
      })
      return
    }
    set({
      lines: [
        ...state.lines,
        {
          key,
          productId: product.id,
          productName: product.name,
          imageUrl: product.imageUrl,
          variantId: opts.variantId,
          variantName,
          optionIds: [...opts.optionIds],
          optionNames,
          note: opts.note,
          quantity: opts.quantity,
          unitPrice,
          lineTotal: unitPrice * opts.quantity,
        },
      ],
    })
  },

  setQuantity: (key, quantity) =>
    set((s) => ({
      lines: s.lines.flatMap((l) => {
        if (l.key !== key) return [l]
        const q = Math.max(0, Math.min(quantity, 99))
        if (q === 0) return []
        return [{ ...l, quantity: q, lineTotal: l.unitPrice * q }]
      }),
    })),

  removeLine: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),

  setFulfillment: (fulfillment) => set({ fulfillment }),
  setZone: (zoneId) => set({ zoneId }),

  clear: () => set({ lines: [], zoneId: null, fulfillment: 'DELIVERY' }),
}))

/** المنطقة الحالية من قائمة مناطق المتجر (للعرض والحد الأدنى). */
export function zoneById(zones: DeliveryZone[], id: string | null): DeliveryZone | null {
  return zones.find((z) => z.id === id) ?? null
}
