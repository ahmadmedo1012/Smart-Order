/**
 * Smart Order Mobile — تثبيت أرضية اللمس 44px (P42-W8c).
 *
 * منهج skeleton-wiring.test.ts نفسه: قراءة المصدر وتثبيت العقد. لا
 * تصيير RN في بيئة node الخالصة — ما يُثبَّت هنا هو أن كل عنصر تفاعلي
 * أساسي يجلس على الأرضية 44px (HIG 44pt / Material 48dp؛ توأم الويب
 * h-11 على رقائق المتجر وأزرار المسار) ولا يتراجع بصمت:
 *
 *   1. Chip (ui.tsx) — فلاتر الأقسام/الحالة/الدور: كانت ~34px.
 *   2. زر رجوع المتجر — كان 36×36.
 *   3. عدّاد الكمية في السلة — كان 32×32 (التوأم في product/[id] كان
 *      44 أصلاً — اتساق).
 *   4. أزرار تنقّل التقويم في التقارير — كانت 36×36.
 *   5. زر إزالة عضو الفريق — كان 36×36.
 *
 * الطوابع غير التفاعلية (miniStamp/stamp/stepDot/الأيقونات الزخرفية
 * داخل الصفوف) خارج العقد عمداً — ليست أهداف لمس.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))

function src(rel: string): string {
  return readFileSync(`${REPO_ROOT}${rel}`, 'utf8')
}

const UI = src('mobile/src/components/ui.tsx')
const STORE = src('mobile/src/app/store/[slug].tsx')
const CART = src('mobile/src/app/cart.tsx')
const REPORTS = src('mobile/src/app/merchant/manage/reports.tsx')
const STAFF = src('mobile/src/app/merchant/manage/staff.tsx')

describe('أرضية اللمس 44px — العناصر التفاعلية الأساسية (P42-W8c)', () => {
  it('Chip (ui.tsx): minHeight 44 + توسيط — لا تراجع صامت لـ~34px', () => {
    const chipBlock = UI.split('chip: {')[1]?.split('},')[0] ?? ''
    expect(chipBlock).toContain('minHeight: 44')
    expect(chipBlock).toContain("justifyContent: 'center'")
  })

  it('زر الرجوع في شاشة المتجر: 44×44 (كان 36×36)', () => {
    expect(STORE).toContain('backBtn: { width: 44, height: 44')
  })

  it('عدّاد الكمية في السلة: 44×44 — اتساق مع توأم product/[id]', () => {
    const qtyBlock = CART.split('qtyBtn: {')[1]?.split('},')[0] ?? ''
    expect(qtyBlock).toContain('width: 44')
    expect(qtyBlock).toContain('height: 44')
  })

  it('أزرار تنقّل التقويم في التقارير: 44×44 (كانت 36×36)', () => {
    const calBlock = REPORTS.split('calNavBtn: {')[1]?.split('},')[0] ?? ''
    expect(calBlock).toContain('width: 44')
    expect(calBlock).toContain('height: 44')
  })

  it('زر إزالة عضو الفريق: 44×44 (كان 36×36)', () => {
    const rmBlock = STAFF.split('removeButton: {')[1]?.split('},')[0] ?? ''
    expect(rmBlock).toContain('width: 44')
    expect(rmBlock).toContain('height: 44')
  })

  it('زر العائلة (Button) يبقى على minHeight 48 — لا انحدار عام', () => {
    expect(UI).toContain('minHeight: 48')
  })
})
