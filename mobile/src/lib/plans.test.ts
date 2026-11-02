/**
 * Smart Order Mobile — تثبيت كتالوج الباقات ضد مصدر الويب (P42-W4).
 *
 * العقد: أرقام الباقات على التطبيق لا تُعاد كتابتها يدويًا أبدًا —
 * FALLBACK_PLANS منقولة من بذور الويب (FAMILY_PLANS في
 * src/app/api/plans/route.ts) وكل نص عرض له أصل حرفي في الويب.
 * هذه الاختبارات تقرأ ملفات الويب نفسها وتطابقها مع ثوابت
 * lib/plans.ts — أي تعديل في الطرفين يكسر الاختبار فورًا
 * (anti-drift pin). التشغيل الحي يقرأ GET /api/plans (نفس مصدر
 * الويب)؛ النسخة الساقطة هنا فقط لغياب الشبكة، ولهذا يلزم هذا
 * التثبيت.
 *
 * ما لم يُثبَّت (موثقًا بصدق): سلوك التصيير نفسه — بيئة الاختبار
 * node خالصة بلا مكتبة تصيير React Native، فالعقد البصري يبقى
 * مراجعة بشرية؛ ووصف قفل التقارير معدّل عن الويب عمدًا لأن وصف
 * الويب يعدد مضمون سطح الويب (30/90 يومًا) وشاشة التطبيق تعرض
 * نافذة يختارها التاجر — التعديل موثق في lib/plans.ts.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import {
  ALWAYS_INCLUDED,
  ALWAYS_INCLUDED_TITLE,
  FALLBACK_PLANS,
  PLAN_BADGES,
  PRICING_CTA_LABEL,
  REPORTS_LOCK_DESCRIPTION,
  REPORTS_MIN_PLAN_NAME_AR,
  STAFF_SEATS_DOOR_LABEL,
  YEARLY_FACTOR,
  YEARLY_SAVINGS_LINE,
  YEARLY_SAVINGS_PCT,
  displayPrice,
  foldRestatedLimits,
  limitValue,
  planBadge,
  reportsLockTitle,
} from './plans'

/* ── قراءة مصادر الويب (الجذر المشترك للريبو) ──────────────────── */

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))

function webSrc(rel: string): string {
  return readFileSync(`${REPO_ROOT}${rel}`, 'utf8')
}

const PLANS_ROUTE = webSrc('src/app/api/plans/route.ts')
const ENTITLEMENTS_CORE = webSrc('src/lib/plan-entitlements-core.ts')
const PRICING_CLIENT = webSrc('src/components/pricing/pricing-client.tsx')
const REPORTS_PAGE = webSrc('src/app/dashboard/reports/page.tsx')
const STAFF_PAGE = webSrc('src/app/dashboard/staff/page.tsx')

/** استخراج مصفوفة FAMILY_PLANS من مصدر الويب وتقييمها كبيانات. */
function webFamilyPlans(): Record<string, unknown>[] {
  const m = PLANS_ROUTE.match(/const FAMILY_PLANS = (\[[\s\S]*?\n\]);/)
  if (!m) throw new Error('FAMILY_PLANS not found in web plans route')
  // مصدرنا الموثوق نفسه — تقييم حرفي البيانات لا غير.
  const arr = new Function(`return ${m[1]}`)() as Record<string, unknown>[]
  return arr
}

/* ── 1) الأرقام: النسخة الساقطة = بذور الويب حرفيًا ─────────────── */

describe('FALLBACK_PLANS pin: بذور الويب حرفيًا (anti-drift)', () => {
  const web = webFamilyPlans()

  it('نفس عدد الباقات وترتيبها', () => {
    expect(FALLBACK_PLANS.length).toBe(web.length)
    expect(FALLBACK_PLANS.map((p) => p.sortOrder)).toEqual(web.map((p) => p.sortOrder))
  })

  it.each(FALLBACK_PLANS.map((p, i) => [p.name, i] as const))(
    'الباقة %s: نفس الاسم والسعر والحقول الرقمية',
    (name, i) => {
      const w = web[i]
      const f = FALLBACK_PLANS[i]
      expect(f.name).toBe(w.name)
      expect(f.nameAr).toBe(w.nameAr)
      expect(f.price).toBe(w.price)
      expect(f.periodDays).toBe(w.periodDays)
      expect(f.maxProducts).toBe(w.maxProducts)
      expect(f.maxOrders).toBe(w.maxOrders)
      expect(f.sortOrder).toBe(w.sortOrder)
      expect(name).toBe(w.name)
    },
  )

  it('الميزات: نفس النصوص حرفيًا (نفس مصدر الشارات والحدود)', () => {
    FALLBACK_PLANS.forEach((f, i) => {
      expect(f.features).toEqual(web[i].features)
    })
  })

  it('أرقام الحدود الحاسمة — ما تفرضه البوابات خادميًا منذ bbe895c', () => {
    expect(FALLBACK_PLANS.map((p) => p.maxProducts)).toEqual([15, 100, 9999, 9999])
    expect(FALLBACK_PLANS.map((p) => p.maxOrders)).toEqual([100, 1000, 10000, 99999])
    expect(FALLBACK_PLANS.map((p) => p.price)).toEqual([0, 19, 29, 129])
  })
})

/* ── 2) عرض الحدود — نفس منطق الويب ────────────────────────────── */

describe('limitValue: ناقل الحد الوحيد (مرآة بطاقة الويب)', () => {
  const free = FALLBACK_PLANS[0]
  const premium = FALLBACK_PLANS[2]
  const pro = FALLBACK_PLANS[3]

  it('المجاني: 15 منتجًا و«حتى 100» طلب', () => {
    expect(limitValue('products', free)).toBe('15')
    expect(limitValue('orders', free)).toBe('حتى 100')
  })

  it('بريميوم: المنتجات «غير محدود» والطلبات «حتى 10.000» (تجميع ar-LY)', () => {
    expect(limitValue('products', premium)).toBe('غير محدود')
    expect(limitValue('orders', premium)).toBe('حتى 10.000')
  })

  it('احترافي: الطلبات «غير محدود» (العتبة 99999 نفسها في الويب)', () => {
    expect(limitValue('orders', pro)).toBe('غير محدود')
  })
})

/* ── 3) طيّ ميزات إعادة ذكر الحدين — نفس دالة الويب ─────────────── */

describe('foldRestatedLimits: سلوك دالة الويب (lib/plan-types.ts)', () => {
  it('إعادة ذكر الطلبات الخالصة تسقط («100 طلب شهرياً»)', () => {
    expect(foldRestatedLimits(['100 طلب شهرياً'], 15, 100)).toEqual([])
  })

  it('بادئة المنتجات تُبقي الذيل («15 منتجاً و3 أقسام» → «3 أقسام»)', () => {
    expect(foldRestatedLimits(['15 منتجاً و3 أقسام'], 15, 100)).toEqual(['3 أقسام'])
  })

  it('إعادة ذكر «غير محدود» تسقط فوق العتبة', () => {
    expect(foldRestatedLimits(['منتجات غير محدودة'], 9999, 10000)).toEqual([])
    expect(foldRestatedLimits(['طلبات غير محدودة'], 9999, 99999)).toEqual([])
  })

  it('الميزة الحقيقية تمر كما هي («حسابات فريق (3 أعضاء)»)', () => {
    expect(foldRestatedLimits(['حسابات فريق (3 أعضاء)'], 9999, 10000)).toEqual([
      'حسابات فريق (3 أعضاء)',
    ])
  })

  it('بذور الويب الحالية تمر هوية (لا إعادة ذكر فيها بعد P14)', () => {
    FALLBACK_PLANS.forEach((p) => {
      expect(foldRestatedLimits(p.features, p.maxProducts, p.maxOrders)).toEqual(p.features)
    })
  })
})

/* ── 4) نصوص العرض — مثبتة بملفات الويب نفسها ──────────────────── */

describe('نصوص العرض: أصول الويب حرفيًا', () => {
  it('«دائماً في كل الباقات» — نفس العناصر والترتيب (pricing-client)', () => {
    const m = PRICING_CLIENT.match(/const ALWAYS_INCLUDED: readonly string\[\] = \[([\s\S]*?)\]/)
    expect(m).not.toBeNull()
    const webItems = [...m![1].matchAll(/"([^"]+)"/g)].map((x) => x[1])
    expect(webItems.length).toBeGreaterThan(0)
    expect([...ALWAYS_INCLUDED]).toEqual(webItems)
    expect(PRICING_CLIENT).toContain(ALWAYS_INCLUDED_TITLE)
  })

  it('الشارات — PLAN_META للويب والفهرس 1 «الأكثر طلباً»', () => {
    const basic = PRICING_CLIENT.match(/Basic:\s*\{[^}]*badge:\s*"([^"]*)"/)
    const premium = PRICING_CLIENT.match(/Premium:\s*\{[^}]*badge:\s*"([^"]*)"/)
    expect(basic![1]).toBe(PLAN_BADGES.Basic)
    expect(premium![1]).toBe(PLAN_BADGES.Premium)
    expect(planBadge(FALLBACK_PLANS[1], 1)).toBe('الأكثر طلباً')
    expect(planBadge(FALLBACK_PLANS[0], 0)).toBe('')
    expect(planBadge(FALLBACK_PLANS[2], 2)).toBe('الأفضل قيمة')
  })

  it('الرياضيات السنوية — السنة 10× ونسبة التوفير (نفس صيغة الويب)', () => {
    const factor = PRICING_CLIENT.match(/monthlyPrice \* (\d+)/)
    expect(factor![1]).toBe(String(YEARLY_FACTOR))
    expect(YEARLY_FACTOR).toBe(10)
    expect(YEARLY_SAVINGS_PCT).toBe(Math.round((1 - 10 / 12) * 100))
    expect(PRICING_CLIENT).toContain('وفر شهرين عند الاشتراك السنوي')
    expect(YEARLY_SAVINGS_LINE).toBe('وفر شهرين عند الاشتراك السنوي')
    expect(displayPrice(FALLBACK_PLANS[1], true)).toBe(190)
    expect(displayPrice(FALLBACK_PLANS[1], false)).toBe(19)
  })
})

/* ── 5) نصوص القفل والأبواب — مثبتة بمصادر الويب ────────────────── */

describe('نصوص القفل والأبواب: أصول الويب حرفيًا', () => {
  it('الحد الأدنى للتقارير — PLAN_FEATURES.reports.minPlanNameAr', () => {
    const m = ENTITLEMENTS_CORE.match(
      /reports:\s*\{[^}]*minPlanNameAr:\s*"([^"]+)"/,
    )
    expect(m).not.toBeNull()
    expect(REPORTS_MIN_PLAN_NAME_AR).toBe(m![1])
  })

  it('عنوان القفل — قالب reports/page.tsx حرفيًا مع الثابت', () => {
    expect(REPORTS_PAGE).toContain('التقارير متوفرة في خطة «${minPlan}» فأعلى')
    expect(reportsLockTitle()).toBe('التقارير متوفرة في خطة «بريميوم» فأعلى')
  })

  it('باب الترقية من القفل — reports/page.tsx:151 حرفيًا', () => {
    expect(REPORTS_PAGE).toContain('عرض الباقات والترقية')
    expect(PRICING_CTA_LABEL).toBe('عرض الباقات والترقية')
  })

  it('وصف القفل — التعديل الموثق الوحيد (سطح التطبيق لا سطح الويب)', () => {
    // الويب يعدد «30 أو 90 يوماً» (نوافذه) — التطبيق نافذته حرة؛
    // الوصف هنا يقول الحق عن هذا السطح (موثق في lib/plans.ts).
    expect(REPORTS_LOCK_DESCRIPTION).not.toContain('30 أو 90')
    expect(REPORTS_LOCK_DESCRIPTION).toContain('نافذة تختارها')
    expect(REPORTS_LOCK_DESCRIPTION).toContain('بريميوم')
  })

  it('باب مقاعد الفريق — staff/page.tsx حرفيًا', () => {
    expect(STAFF_PAGE).toContain('مقاعد أكثر — رقّ خطتك')
    expect(STAFF_SEATS_DOOR_LABEL).toBe('مقاعد أكثر — رقّ خطتك')
  })
})
