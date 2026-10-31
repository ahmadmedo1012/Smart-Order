/**
 * عائلة قنوات الدفع — نقل حرفي من الويب (src/lib/payment-constants.ts،
 * rounds 86-C8/C12 + r140 P2-3): نفس الثوابت ونفس صيغ رموز USSD، لأن
 * العميل ينسخ الرمز من التطبيق ويطلقه في لوحة الاتصال — أي انحراف عن
 * صيغة الويب ينتج رمزًا ميتًا يرفضه المشغّل.
 *
 * WALLET_CAP_LYD: سقف التحويل الواحد لمحافظ ليبيانا/مدار (قيد الشبكة،
 * لا قيد منتج). الرموز المضمّنة للمبلغ تُخفى فوقه ويبقى التحويل اليدوي.
 */
import type { PaymentMethod } from '@/types/storefront'

/** سقف التحويل الواحد للمحافظ (بالدينار الكامل). */
export const WALLET_CAP_LYD = 99

/** رمز التحويل السريع لمحفظة ليبيانا (المبلغ بالدراهم). */
export function libyanaUssdCode(phone: string, amountLyD: number): string {
  /* r140 (P2-3) من الويب: التقريب يحيّد كسور الفاصلة العائمة — أي درهم
   * فردي كان يكسر الرمز بصمت («1000.9999999999999»). */
  return `*122*218${phone.slice(1)}*${Math.round(amountLyD * 1000)}*1#`
}

/** رمز التحويل السريع لمحفظة مدار. */
export function madarUssdCode(phone: string, amountLyD: number): string {
  return `*140*4*1*${amountLyD}*${phone}#`
}

/** هل هذه الطريقة محفظة (يظهر لها رمز التحويل السريع)؟ */
export function isWalletMethod(type: string): boolean {
  return type === 'LIBYANA' || type === 'MADAR'
}

/**
 * تحليل config الطريقة — نفس عقد الويب (use-checkout-state.ts):
 * JSON.text يُفسَّر إلى { number? }؛ أي config تالف يُعامل كأنه غائب.
 */
export function paymentNumber(p: PaymentMethod | null): string | null {
  if (!p?.config) return null
  try {
    const parsed = JSON.parse(p.config) as { number?: unknown }
    return typeof parsed.number === 'string' && parsed.number.length > 0
      ? parsed.number
      : null
  } catch {
    return null
  }
}
