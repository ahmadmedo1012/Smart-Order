/**
 * Smart Order Mobile — إعدادات البيئة.
 *
 * apiUrl: بوابة الويب الحيّة (نفس عقد /api/public/* الذي يستهلكه
 * متجر الويب). local dev: عدّل عبر ملف .env (EXPO_PUBLIC_API_URL) —
 * جهاز حقيقي لا يصل إلى localhost؛ استخدم IP جهازك على الشبكة.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  'https://order.smart-link.ly'

export const WEB_BASE_URL = 'https://order.smart-link.ly'

/** مهلة الطلب + إعادة محاولة GET فقط (آمنة). */
export const REQUEST_TIMEOUT_MS = 20_000
export const GET_RETRIES = 2

/** حد السلة (نفس MAX_ORDER_ITEMS في الخادم). */
export const MAX_ORDER_ITEMS = 50
export const MAX_ORDER_QUANTITY = 99

/** مفاتيح التخزين المحلي. */
export const STORAGE_KEYS = {
  rtlBootstrap: 'smartorder.rtl_bootstrapped_v1',
  recentStores: 'smartorder.recent_stores_v1',
} as const
