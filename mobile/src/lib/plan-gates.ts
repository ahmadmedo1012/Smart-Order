/**
 * Smart Order Mobile — مصنِّف رفضات الخطة (P42-W4، GAP-SO-1).
 *
 * الخادم يرفض بالأكواد العائلية (كلها تُبنى في fail() بجسم واحد:
 * { success: false, error: { message, code } } — src/lib/api.ts):
 *   · 403 PLAN_ENTITLEMENT — ميزة غير مفتوحة للباقة (assertPlanFeature:
 *     التقارير بريميوم+ — نفس البوابة على /api/mobile/reports).
 *   · 409 PLAN_LIMIT — حد مورد الباقة اكتمل (مقاعد الفريق، الأقسام،
 *     مناطق التوصيل، المنتجات… بوابات العدد W2-D2).
 *
 * المصنِّف بنيوي عمدًا (status + body.error.code) بلا أي استيراد من
 * services/* — ملفات الخدمة تسحب react-native/expo-constants وبيئة
 * اختبار node الخالصة (vitest) لا تحتملهما؛ الطبقة البنيوية تعمل في
 * كل بيئة وتقبل أي كائن خطأ يحمل الشكل نفسه (ApiError في الإنتاج،
 * وكائنات الاختبار في العقد). عقد الجسم نفسه مثبَّت في
 * plan-gates.test.ts بقراءة fail() من مصدر الويب مباشرة.
 */

/** أكواد رفض الخطة العائلية (مفتاح مغلق — كود غريب لا يصنَّف). */
export type PlanRefusalKind = 'PLAN_ENTITLEMENT' | 'PLAN_LIMIT'

/** كود الرفض من جسم خطأ الـAPI (شكل fail() العائلي) — أو null. */
export function apiErrorCode(err: unknown): string | null {
  if (typeof err !== 'object' || err === null) return null
  const body = (err as { body?: unknown }).body
  if (typeof body !== 'object' || body === null) return null
  const error = (body as { error?: unknown }).error
  if (typeof error !== 'object' || error === null) return null
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' ? code : null
}

/** الحكم المشترك: الحالة HTTP + الكود معًا (الرفض لا يُلغى بأحدهما). */
function isPlanRefusal(err: unknown, status: 403 | 409, code: PlanRefusalKind): boolean {
  if (typeof err !== 'object' || err === null) return false
  const s = (err as { status?: unknown }).status
  return s === status && apiErrorCode(err) === code
}

/** 403 PLAN_ENTITLEMENT — ميزة غير مفتوحة للباقة (التقارير: بريميوم+).
 *  رفض صلاحية عادي (403 بلا كود) ليس رفض باقة — يبقى خطأً كما هو. */
export function isPlanEntitlementRefusal(err: unknown): boolean {
  return isPlanRefusal(err, 403, 'PLAN_ENTITLEMENT')
}

/** 409 PLAN_LIMIT — حد مورد الباقة اكتمل (رسالة الخادم العربية تصل
 *  كما هي عبر ApiError.message — الصدق أولًا، والباب فوقها). */
export function isPlanLimitRefusal(err: unknown): boolean {
  return isPlanRefusal(err, 409, 'PLAN_LIMIT')
}
