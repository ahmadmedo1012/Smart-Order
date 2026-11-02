/**
 * Smart Order Mobile — كتالوج الباقات ومنطق عرضها (P42-W4، GAP-SO-1).
 *
 * المصدر واحد: نفس ما تقرأه صفحة الأسعار في الويب. التشغيل يقرأ
 * GET /api/plans (نفس المسار العام الذي تحمّل به صفحة /pricing في
 * الويب كتالوجها — البذور الذاتية + التعافي عند القراءة)، وهذه
 * النسخة الساقطة FALLBACK_PLANS منقولة من بذور الويب نفسها
 * (src/app/api/plans/route.ts — FAMILY_PLANS) ويثبّتها الاختبار
 * plans.test.ts بقراءة ملف الويب مباشرة (نفس الأرقام والنصوص،
 * حرفيًا) فلا تنحرف أبدًا. عند تعذر الشبكة تُعرض هذه النسخة مع
 * بيان صادق أنها نسخة التطبيق — لا باب ميت.
 *
 * عتبات «غير محدود» (9999 منتجًا / 99999 طلبًا) هي القيم المفروضة
 * فعليًا في الخادم منذ bbe895c — الويب يعرضها «غير محدود» ونحن
 * نعرض ما يعرضه الويب حرفيًا (الحد المفروض نفسه موثق في بذور الويب).
 *
 * كل نص هنا له أصل في الويب ومثبَّت باختبار يقرأ الملف الأصلي:
 * شارة «الأكثر طلباً»/«الأفضل قيمة» (PLAN_META في pricing-client)،
 * «دائماً في كل الباقات» (ALWAYS_INCLUDED)، «عرض الباقات والترقية»
 * (reports/page.tsx:151)، «مقاعد أكثر — رقّ خطتك» (staff/page.tsx)…
 * الاستثناء الموثق وحيد: وصف قفل التقارير (انظر REPORTS_LOCK_DESCRIPTION).
 */
import { formatNumber } from '@/lib/money'
import type { MobilePlan } from '@/types/merchant'

/* ── العتبات العائلية — نفس ثوابت الويب (lib/plan-types.ts) ────── */

/** maxProducts الذي يُعرض «غير محدود» (القيمة المفروضة خادميًا). */
export const UNLIMITED_PRODUCTS = 9999
/** maxOrders الذي يُعرض «غير محدود» (القيمة المفروضة خادميًا). */
export const UNLIMITED_ORDERS = 99999

/* ── النسخة الساقطة — منقولة من FAMILY_PLANS في الويب، مثبَّتة ──── */

/**
 * بذور الويب حرفيًا (src/app/api/plans/route.ts — FAMILY_PLANS).
 * المعرفات لا تُنقل: الـcuid يولده الخادم، والنسخة الساقطة بلا
 * معرف (لا شيء في التطبيق يحتاجه — زر الاشتراك يفتح صفحة الويب).
 */
export const FALLBACK_PLANS: MobilePlan[] = [
  {
    name: 'Free',
    nameAr: 'مجاني',
    price: 0,
    periodDays: 30,
    maxProducts: 15,
    maxOrders: 100,
    sortOrder: 1,
    features: ['3 أقسام', 'منطقة توصيل واحدة', 'طرق دفع محلية'],
  },
  {
    name: 'Basic',
    nameAr: 'أساسي',
    price: 19,
    periodDays: 30,
    maxProducts: 100,
    maxOrders: 1000,
    sortOrder: 2,
    features: ['كل ميزات المجانية', 'أقسام غير محدودة', 'مناطق توصيل متعددة'],
  },
  {
    name: 'Premium',
    nameAr: 'بريميوم',
    price: 29,
    periodDays: 30,
    maxProducts: 9999,
    maxOrders: 10000,
    sortOrder: 3,
    features: ['كل ميزات الأساسي', 'حسابات فريق (3 أعضاء)', 'تقارير أداء عند الطلب', 'دعم أولوية'],
  },
  {
    name: 'Pro',
    nameAr: 'احترافي',
    price: 129,
    periodDays: 30,
    maxProducts: 9999,
    maxOrders: 99999,
    sortOrder: 4,
    features: ['كل ميزات بريميوم', 'فريق غير محدود', 'تصدير CSV للتقارير', 'مدير حساب مخصص'],
  },
]

/* ── نصوص العرض — منقولة من صفحة الأسعار في الويب، مثبَّتة ─────── */

/** شارات الباقات (PLAN_META في pricing-client.tsx — الفارغ بلا شارة). */
export const PLAN_BADGES: Record<string, string> = {
  Free: '',
  Basic: 'الأكثر طلباً',
  Premium: 'الأفضل قيمة',
  Pro: '',
  Enterprise: 'للشركات الكبرى',
}

/**
 * شارة الباقة — نفس منطق الويب: الباقة الثانية في الكتالوج (الفهرس
 * 1) تحمل «الأكثر طلباً» أينما وقعت، والبقية شارة PLAN_META إن
 * وجدت (pricing-client.tsx: isPopular = index === 1).
 */
export function planBadge(plan: MobilePlan, index: number): string {
  return index === 1 ? 'الأكثر طلباً' : (PLAN_BADGES[plan.name] ?? '')
}

/** «دائماً في كل الباقات» — الكتلة الصادقة فوق البطاقات (P40/SO-2). */
export const ALWAYS_INCLUDED_TITLE = 'دائماً في كل الباقات'
export const ALWAYS_INCLUDED: readonly string[] = [
  'متجر رقمي يعمل فوراً',
  'تتبع مباشر للطلبات',
  'رسائل واتساب للطلبات',
  'لوحة تحكم عربية',
  'دعم واتساب',
]

/** السنة = 10 أشهر (شهران مجانًا) — حساب العائلة نفسه. */
export const YEARLY_FACTOR = 10
/** نسبة التوفير السنوي — نفس صيغة الويب (pricing-client.tsx:190). */
export const YEARLY_SAVINGS_PCT = Math.round((1 - YEARLY_FACTOR / 12) * 100)
/** سطر التوفير عند العرض السنوي (pricing-client.tsx:117 حرفيًا). */
export const YEARLY_SAVINGS_LINE = 'وفر شهرين عند الاشتراك السنوي'

/** السعر المعروض: شهري أو سنوي (10×) — نفس منطق الويب. */
export function displayPrice(plan: MobilePlan, yearly: boolean): number {
  return yearly ? plan.price * YEARLY_FACTOR : plan.price
}

/** قيمة صف الحد — «غير محدود» فوق العتبة، وإلا «حتى N»/N (نفس
 *  منطق الويب: null-prefix للعتبة، «حتى » لطلبات الشهر حصرًا). */
export function limitValue(
  kind: 'products' | 'orders',
  plan: MobilePlan,
): string {
  const num = kind === 'products' ? plan.maxProducts : plan.maxOrders
  const unlimited = kind === 'products' ? num >= UNLIMITED_PRODUCTS : num >= UNLIMITED_ORDERS
  if (unlimited) return 'غير محدود'
  return kind === 'orders' ? `حتى ${formatNumber(num)}` : formatNumber(num)
}

/* ── طيّ ميزات تعيد ذكر الحدين — منقولة من lib/plan-types.ts ───── */

function toWesternDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function foldOne(feature: string, maxProducts: number, maxOrders: number): string | null {
  const folded = toWesternDigits(feature.trim())
  if (!folded) return null
  const bare = folded.replace(/[.,٫]/g, '')
  const productsNum = toWesternDigits(String(maxProducts)).replace(/[.,]/g, '')
  const ordersNum = toWesternDigits(String(maxOrders)).replace(/[.,]/g, '')

  // 1) إعادة ذكر الطلبات الخالصة: «N طلب شهرياً» تسقط
  if (new RegExp(`^${escapeRe(ordersNum)}\\s*طلبا?ً?\\s*شهرياً$`).test(bare)) {
    return null
  }
  // 2) بادئة المنتجات: «N منتجاً و…» يبقى الذيل وحده
  const productsPrefix = new RegExp(`^${escapeRe(productsNum)}\\s*منتجا?ً?\\s*و\\s*`)
  const prefixMatch = folded.match(productsPrefix)
  if (prefixMatch) {
    const tail = folded.slice(prefixMatch[0]!.length).trim()
    return tail.length > 0 ? tail : null
  }
  // 3) إعادة ذكر «غير محدود» وكتلة الحدود تقولها أصلًا
  if (maxProducts >= UNLIMITED_PRODUCTS && bare === 'منتجات غير محدودة') {
    return null
  }
  if (maxOrders >= UNLIMITED_ORDERS && bare === 'طلبات غير محدودة') {
    return null
  }
  return feature.trim()
}

/**
 * طيّ ميزات الباقة التي تعيد ذكر الحدين الرقميين وقت العرض (P14
 * 2-d/3-d — نفس الدالة في lib/plan-types.ts حرفيًا): كتلة الحدود
 * («المنتجات»/«الطلبات الشهرية») هي الناقل البصري الوحيد للرقمين،
 * والميزة المختلطة تحتفظ بذيلها («15 منتجاً و3 أقسام» → «3 أقسام»).
 * نقية → نفس الخرج على الويب والتطبيق.
 */
export function foldRestatedLimits(
  features: readonly string[],
  maxProducts: number,
  maxOrders: number,
): string[] {
  const out: string[] = []
  for (const raw of features) {
    const folded = foldOne(raw, maxProducts, maxOrders)
    if (folded !== null) out.push(folded)
  }
  return out
}

/* ── نصوص القفل والأبواب — مثبَّتة بمصادر الويب ─────────────────── */

/**
 * الحد الأدنى لخطة التقارير — من PLAN_FEATURES.reports.minPlanNameAr
 * (lib/entitlements-core على الويب، مثبَّت بالاختبار) — العنوان يقرأ
 * الثابت فلا ينحرف عن البوابة أبدًا (عقود reports/page.tsx:134).
 */
export const REPORTS_MIN_PLAN_NAME_AR = 'بريميوم'

/** عنوان حالة القفل — reports/page.tsx:145 حرفيًا (نفس القالب). */
export function reportsLockTitle(): string {
  return `التقارير متوفرة في خطة «${REPORTS_MIN_PLAN_NAME_AR}» فأعلى`
}

/**
 * وصف حالة القفل — الاستثناء الموثق الوحيد عن النقل الحرفي: وصف
 * الويب يعدّد مضمون سطح الويب («أفضل منتجاتك… على مدى 30 أو 90
 * يوماً») وشاشة التطبيق تعرض إيراد النافذة وطلباتها وتوزيع الحالات
 * على نافذة يختارها التاجر (حتى 366 يومًا). العنوان والباب
 * حرفيان من الويب؛ الوصف يقول الحق عن هذا السطح تحديدًا.
 */
export const REPORTS_LOCK_DESCRIPTION =
  'تقارير الأداء عند الطلب — إيرادات متجرك وطلباته وتوزيع حالاتها على نافذة تختارها — جزء من خطة «بريميوم» والخطط الأعلى.'

/** باب الترقية من حالة القفل — reports/page.tsx:151 حرفيًا. */
export const PRICING_CTA_LABEL = 'عرض الباقات والترقية'

/** باب مقاعد الفريق (staff/page.tsx:110 حرفيًا — رقاقة copper). */
export const STAFF_SEATS_DOOR_LABEL = 'مقاعد أكثر — رقّ خطتك'
