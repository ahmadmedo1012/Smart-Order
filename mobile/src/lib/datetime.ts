/**
 * Smart Order Mobile — تنسيق التاريخ والوقت العربي (نقل الويب).
 *
 * نفس جُمل src/lib/arabic.ts في الويب: أسماء أشهر ميلادية عربية،
 * ساعة 12 بص/م، وبناء سلاسل حتمي بلا Intl (نفس الخرج على كل جهاز).
 */
import type { OrderStatus } from '@/types/storefront'
import { ORDER_STATUS_AR } from '@/types/storefront'

/** أسماء الأشهر الميلادية (مصدر واحد — التقويم المصغّر في التقارير
 *  يستهلكها أيضًا). */
export const AR_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
]

function toDate(date: Date | string): Date {
  return typeof date === 'string' ? new Date(date) : date
}

/** «17 سبتمبر 2026 · 3:05 م» — ختم كامل لعناوين الطلبات. */
export function formatArabicDateTime(date: Date | string): string {
  const d = toDate(date)
  const day = d.getDate()
  const month = AR_MONTHS[d.getMonth()] ?? ''
  const year = d.getFullYear()
  const h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const ampm = h < 12 ? 'ص' : 'م'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${day} ${month} ${year} · ${h12}:${m} ${ampm}`
}

/** «3:05 م» — ختم ساعة مضغوط لبطاقات الطلبات. */
export function formatArabicClock(date: Date | string): string {
  const d = toDate(date)
  const m = String(d.getMinutes()).padStart(2, '0')
  const ampm = d.getHours() < 12 ? 'ص' : 'م'
  const h12 = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12
  return `${h12}:${m} ${ampm}`
}

/** «17 سبتمبر» — يوم قصير بجانب الساعة. */
export function formatArabicDayShort(date: Date | string): string {
  const d = toDate(date)
  return `${d.getDate()} ${AR_MONTHS[d.getMonth()] ?? ''}`
}

/** «17 سبتمبر 2026» — تاريخ تقويمي كامل بلا وقت (تواريخ العضوية
 *  وسجل العملاء ونافذة التقارير). */
export function formatArabicDate(date: Date | string): string {
  const d = toDate(date)
  return `${d.getDate()} ${AR_MONTHS[d.getMonth()] ?? ''} ${d.getFullYear()}`
}

/** اسم حالة عربي مع تحمّل قيم غير معروفة من history القديمة. */
export function statusAr(status: string): string {
  return ORDER_STATUS_AR[status as OrderStatus] ?? status
}
