/**
 * Smart Order Mobile — عقود مصنِّف رفضات الخطة (P42-W4، GAP-SO-1).
 *
 * يثبّت ثلاث طبقات:
 *   1. عقد الجسم: fail() في الويب يردّ { success: false, error:
 *      { message, code } } — هذا هو الشكل الذي يقرؤه المصنِّف
 *      (يُقرأ من مصدر الويب مباشرة فلا ينفصل العقد عن الحكم).
 *   2. عقود رمي الخادم: بوابة التقارير ترمي 403 PLAN_ENTITLEMENT
 *      وبوابة المقاعد 409 PLAN_LIMIT (تُثبَّت من مصادر الخادم).
 *   3. الحكم نفسه: المصنِّع يقبل الرفض المستحق ويصمد أمام ما ليس
 *      رفض خطة (رفض صلاحية عادي بلا كود، 409 DUPLICATE لعضو
 *      موجود أصلًا، أخطاء الشبكة، وأشكال غير كائنية).
 *
 * ما لم يُثبَّت (موثقًا بصدق): لا يمكن في هذه البيئة (node خالصة،
 * بلا مكتبة تصيير React Native) اختبار تصيير الحالات نفسها —
 * عوضًا عن ذلك يثبّت هذا الملف «عقد التوصيل»: أن شاشات التقارير
 * والفريق تستخدم المصنِّف والمكوّنات، وأن شاشة الباقات مسجلة في
 * المكدس وبوابة الإدارة (قراءة مصدر، أضعف من تصيير حقيقي وموثقة
 * كذلك). كائنات الاختبار تحمل شكل ApiError البنيوي (status + body)
 * لأن استيراد الصف نفسه يسحب react-native إلى بيئة node.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { apiErrorCode, isPlanEntitlementRefusal, isPlanLimitRefusal } from './plan-gates'

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))

function webSrc(rel: string): string {
  return readFileSync(`${REPO_ROOT}${rel}`, 'utf8')
}

/** كائن بالشكل البنيوي لـApiError (status + body بمغلف fail()). */
function refusalFixture(status: number, code?: string, message = 'رسالة الخادم العربية'): unknown {
  return {
    status,
    body: { success: false, error: { message, ...(code ? { code } : {}) } },
  }
}

/* ── 1) عقد الجسم — من مصدر الويب مباشرة ────────────────────────── */

describe('عقد الجسم: fail() في الويب يحمل الكود', () => {
  it('المغلف { success: false, error: { message, code } }', () => {
    const api = webSrc('src/lib/api.ts')
    expect(api).toContain('{ success: false, error: { message, code } }')
  })
})

/* ── 2) عقود رمي الخادم — من مصادر الخادم ───────────────────────── */

describe('عقود الخادم: البوابات ترمي الأكواد العائلية', () => {
  it('بوابة التقارير: 403 PLAN_ENTITLEMENT (assertPlanFeature)', () => {
    const ent = webSrc('src/lib/plan-entitlements.ts')
    expect(ent).toContain('403, "PLAN_ENTITLEMENT"')
  })

  it('بوابة مقاعد الفريق: 409 PLAN_LIMIT (POST /api/staff)', () => {
    const staff = webSrc('src/app/api/staff/route.ts')
    expect(staff).toContain('409,')
    expect(staff).toContain('"PLAN_LIMIT"')
  })
})

/* ── 3) الحكم — الاستحقاق 403 ───────────────────────────────────── */

describe('isPlanEntitlementRefusal', () => {
  it('يقبل 403 PLAN_ENTITLEMENT', () => {
    expect(isPlanEntitlementRefusal(refusalFixture(403, 'PLAN_ENTITLEMENT'))).toBe(true)
  })

  it('يرفض 403 بلا كود (رفض صلاحية عادي — ليس قفل خطة)', () => {
    expect(isPlanEntitlementRefusal(refusalFixture(403))).toBe(false)
  })

  it('يرفض الكود الصحيح بحالة خاطئة (409 PLAN_ENTITLEMENT)', () => {
    expect(isPlanEntitlementRefusal(refusalFixture(409, 'PLAN_ENTITLEMENT'))).toBe(false)
  })

  it('يرفض رفض الحد (409 PLAN_LIMIT) — ليس استحقاقًا', () => {
    expect(isPlanEntitlementRefusal(refusalFixture(409, 'PLAN_LIMIT'))).toBe(false)
  })
})

/* ── 3) الحكم — الحد 409 ────────────────────────────────────────── */

describe('isPlanLimitRefusal', () => {
  it('يقبل 409 PLAN_LIMIT', () => {
    expect(isPlanLimitRefusal(refusalFixture(409, 'PLAN_LIMIT'))).toBe(true)
  })

  it('يرفض 409 DUPLICATE (عضو موجود أصلًا — لا باب ترقية له)', () => {
    expect(isPlanLimitRefusal(refusalFixture(409, 'DUPLICATE'))).toBe(false)
  })

  it('يرفض 403 PLAN_LIMIT (الحالة لا تطابق)', () => {
    expect(isPlanLimitRefusal(refusalFixture(403, 'PLAN_LIMIT'))).toBe(false)
  })

  it('يرفض 422 VALIDATION وأخطاء الشبكة وغير الكائنات', () => {
    expect(isPlanLimitRefusal(refusalFixture(422, 'VALIDATION'))).toBe(false)
    expect(isPlanLimitRefusal(new Error('تعذر الاتصال بالخادم'))).toBe(false)
    expect(isPlanLimitRefusal(null)).toBe(false)
    expect(isPlanLimitRefusal(undefined)).toBe(false)
    expect(isPlanLimitRefusal('409 PLAN_LIMIT')).toBe(false)
  })
})

/* ── 3) استخراج الكود الخام ─────────────────────────────────────── */

describe('apiErrorCode', () => {
  it('يستخرج الكود من مغلف fail()', () => {
    expect(apiErrorCode(refusalFixture(409, 'PLAN_LIMIT'))).toBe('PLAN_LIMIT')
  })

  it('null عند غياب الكود أو الجسم أو الكائنية', () => {
    expect(apiErrorCode(refusalFixture(400))).toBe(null)
    expect(apiErrorCode({ status: 400, body: null })).toBe(null)
    expect(apiErrorCode({ status: 400 })).toBe(null)
    expect(apiErrorCode(new Error('x'))).toBe(null)
    expect(apiErrorCode(42)).toBe(null)
  })
})

/* ── 4) عقد التوصيل — الشاشات موصولة (قراءة مصدر، موثقة الأضعف) ── */

describe('عقد التوصيل: الرفض له باب في كل شاشة (source-read contracts)', () => {
  it('شاشة التقارير تصنّف 403 وتعرض الحالة المقفولة بالعنوان المثبَّت', () => {
    const reports = webSrc('mobile/src/app/merchant/manage/reports.tsx')
    expect(reports).toContain('isPlanEntitlementRefusal')
    expect(reports).toContain('LockedState')
    expect(reports).toContain('reportsLockTitle()')
    expect(reports).toContain('PRICING_CTA_LABEL')
  })

  it('شاشة الفريق تصنّف 409 وتفتح الباب قبل النموذج وعند الرفض', () => {
    const staff = webSrc('mobile/src/app/merchant/manage/staff.tsx')
    expect(staff).toContain('isPlanLimitRefusal')
    expect(staff).toContain('UpgradeDoor')
    expect(staff).toContain('STAFF_SEATS_DOOR_LABEL')
    expect(staff).toContain('seats.canInvite')
  })

  it('عدّاد المقاعد بجوار الباب — مرآة رقاقة الويب (staff:101-104)', () => {
    const staff = webSrc('mobile/src/app/merchant/manage/staff.tsx')
    // الصيغة العربية RTL-safe بدل «{current} / {max}» بdir=ltr في الويب
    // (الأرقام المجردة مع الشرطة تنعكس في نص RTL — موثق في الشاشة).
    expect(staff).toContain('مقاعد الفريق: ${formatNumber(seats.current)} من ${formatNumber(seats.max)}')
    expect(staff).toContain("family=\"grey\"")
    // رقاقة الويب نفسها موجودة في مصدرها بالشكل الحرفي dir="ltr"
    const webStaff = webSrc('src/app/dashboard/staff/page.tsx')
    expect(webStaff).toContain('{seats.current} / {seats.max}')
  })

  it('مقصد الترقية مسجّل: شاشة الباقات في المكدس وبوابة الإدارة', () => {
    const layout = webSrc('mobile/src/app/merchant/_layout.tsx')
    expect(layout).toContain('manage/pricing')
    const hub = webSrc('mobile/src/app/merchant/manage/index.tsx')
    expect(hub).toContain("key: 'pricing'")
    expect(hub).toContain('perm: null')
  })

  it('الكتالوج الحي من /api/plans (نفس مصدر صفحة الأسعار في الويب)', () => {
    const services = webSrc('mobile/src/services/merchant.ts')
    expect(services).toContain("get<MobilePlan[]>('/api/plans')")
    const webPlansRoute = webSrc('src/app/api/plans/route.ts')
    expect(webPlansRoute).toContain('export async function GET()')
  })
})
