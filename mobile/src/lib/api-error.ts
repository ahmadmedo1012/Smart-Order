/**
 * Smart Order Mobile — رسائل خطأ الخادم بالعربية (منطقة التاجر).
 *
 * نفس السلم الثلاثي في C2-CORE (منطوقًا في كل شاشة): رسالة الخادم
 * العربية أولًا (ApiError)، ثم انقطاع الشبكة، ثم السقوط العام — الآن
 * مساعد واحد بدل تكرار المنطق في كل شاشة إدارة.
 */
import { ApiError, NetworkError } from '@/services/merchant'

/** رسالة انقطاع الشبكة الموحدة. */
export const NETWORK_AR = 'تعذر الاتصال بالخادم — تحقق من الإنترنت وحاول مجددًا'

/** رسالة عربية للخطأ: الخادم → الشبكة → السقوط العام. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof NetworkError) return NETWORK_AR
  return fallback
}
