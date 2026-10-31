/**
 * Smart Order Mobile — آلة حالات الطلب (نقل حرفي من الويب).
 *
 * نسخة مطابقة لـ src/lib/order-machine.ts في الخادم: نفس خريطة
 * الانتقالات، نفس التسميات العربية، ونفس استثناءَي PICKUP (لا معنى
 * ل«خرج للتوصيل») وDELIVERY (لا تسليم مباشرًا من «جاهز»). الخادم
 * يفرض هذا الجدول على PATCH — واجهة التاجر تعرض أزراره فقط، فلا
 * يظهر زر ميت أبدًا. الإلغاء/الرفض «انتقالات مدمّرة» وتحتاج
 * صلاحية orders.cancel إضافية (r134 — الخادم يفرضها كذلك).
 */
import type { OrderStatus } from '@/types/storefront'

export interface TransitionRule {
  to: OrderStatus
  label: string
  destructive?: boolean
}

const TRANSITIONS: Record<OrderStatus, TransitionRule[]> = {
  NEW: [
    { to: 'CONFIRMED', label: 'تأكيد الطلب' },
    { to: 'REJECTED', label: 'رفض الطلب', destructive: true },
    { to: 'CANCELLED', label: 'إلغاء الطلب', destructive: true },
  ],
  CONFIRMED: [
    { to: 'PREPARING', label: 'بدء التحضير' },
    { to: 'CANCELLED', label: 'إلغاء الطلب', destructive: true },
  ],
  PREPARING: [
    { to: 'READY', label: 'جاهز للاستلام' },
    { to: 'CANCELLED', label: 'إلغاء الطلب', destructive: true },
  ],
  READY: [
    { to: 'OUT_FOR_DELIVERY', label: 'خرج للتوصيل' },
    { to: 'DELIVERED', label: 'تم التسليم' },
    { to: 'CANCELLED', label: 'إلغاء الطلب', destructive: true },
  ],
  OUT_FOR_DELIVERY: [{ to: 'DELIVERED', label: 'تم التسليم' }],
  DELIVERED: [],
  CANCELLED: [],
  REJECTED: [],
}

export function getAllowedTransitions(
  current: OrderStatus,
  fulfillment: 'DELIVERY' | 'PICKUP',
): TransitionRule[] {
  const rules = TRANSITIONS[current] ?? []
  if (fulfillment === 'PICKUP') {
    // OUT_FOR_DELIVERY لا معنى له لطلب استلام
    return rules.filter((r) => r.to !== 'OUT_FOR_DELIVERY')
  }
  // التسليم مباشرة من «جاهز» غريب لطلب توصيل — يمر عبر «خرج للتوصيل»
  if (fulfillment === 'DELIVERY' && current === 'READY') {
    return rules.filter((r) => r.to !== 'DELIVERED')
  }
  return rules
}

export function isTerminal(status: OrderStatus): boolean {
  return (TRANSITIONS[status] ?? []).length === 0
}
