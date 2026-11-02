/**
 * Smart Order Mobile — تثبيت أسلاك الهياكل والاتصال ضد المصدر
 * (P42-W5، GAP-SO-2+SO-3).
 *
 * نفس منهج plans.test.ts: نقرأ ملفات المصدر (التطبيق والويب) ونثبّت
 * العقود المهمة. بيئة node الخالصة لا تصيّر React Native، فالعقد
 * البصري (أن الهيكل يشبه الشاشة) يبقى مراجعة بشرية موثقة؛ ما يُثبَّت
 * هنا هو الأسلاك:
 *   1. وصفة العائلة: حزام 1200ms «خطي» + إيقاف تقليل الحركة + إعلان
 *      قارئ الشاشة — لا تنحرف بصمت إلى نبض ease أو صمت وصول.
 *   2. كل شاشة رئيسية تستخدم هيكلها المطابق ولا تعود إلى الدوار
 *      (anti-drift: حذف الاستيراد أو الاستبدال يكسر هنا فورًا).
 *   3. البوابات بلا شكل ثابت (إقلاع/جلسة) تبقى على الدوار بصدق.
 *   4. الاتصال: اللافتة مركبة في الجذر، NetInfo مربوط بـonlineManager،
 *      لا ادعاء حفظ أثناء الانقطاع، ومفتاح idempotency للسلة يبقى
 *      ثابتًا عبر الفشل (لا فقدان صامت) — مع تثبيت أن مسار الخادم
 *      يعيد التسعير من أسعار حية (W2-ORD-2 ما زال قائمًا).
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))

function src(rel: string): string {
  return readFileSync(`${REPO_ROOT}${rel}`, 'utf8')
}

const SKELETON = src('mobile/src/components/skeleton.tsx')
const BANNER = src('mobile/src/components/connectivity-banner.tsx')
const CONNECTIVITY = src('mobile/src/lib/connectivity.ts')
const ROOT_LAYOUT = src('mobile/src/app/_layout.tsx')

/* ── 1) وصفة العائلة — مرآة ‎.skeleton في globals.css ───────────── */

describe('وصفة الهيكل: عائلة ويب مطابقة على الجوال', () => {
  it('حزام 1200ms خطي حرفيًا (Easing.linear — لا ease ينبض السرعة)', () => {
    expect(SKELETON).toContain('SKELETON_SWEEP_MS = 1200')
    expect(SKELETON).toContain('easing: Easing.linear')
    expect(SKELETON).not.toContain('Easing.ease')
    expect(SKELETON).not.toContain('Easing.inOut')
  })

  it('أرض muted وحزام card — نفس تدرّج الويب (muted→مزج card→muted)', () => {
    expect(SKELETON).toContain('backgroundColor: t.muted')
    expect(SKELETON).toContain('backgroundColor: t.card')
    expect(SKELETON).toContain('rounded ?? radius.sm')
  })

  it('تقليل الحركة يوقف الحلقة كليًا (reduceMotionChanged حي)', () => {
    expect(SKELETON).toContain('isReduceMotionEnabled')
    expect(SKELETON).toContain("addEventListener('reduceMotionChanged'")
  })

  it('إعلان التحميل لقارئ الشاشة (نمط العائلة)', () => {
    expect(SKELETON).toContain('announceForAccessibility')
    expect(SKELETON).toContain("accessibilityRole='progressbar'".replace(/'/g, '"'))
    expect(SKELETON).toContain('busy: true')
  })

  it('مرساة الويب: العائلة نفسها موجودة في skeletons الويب', () => {
    const webStorefront = src('src/components/storefront/skeletons.tsx')
    const webDashboard = src('src/components/dashboard/skeletons.tsx')
    expect(webStorefront).toContain('export function StorefrontSkeleton()')
    expect(webDashboard).toContain('export function DashboardSkeleton()')
    expect(webDashboard).toContain('export function ReportsSkeleton()')
    expect(webDashboard).toContain('function DetailSkeleton()')
    expect(webDashboard).toContain('export function OrderDetailSkeleton()')
    expect(webDashboard).toContain('export function CustomerDetailSkeleton()')
  })
})

/* ── 2) أسلاك الشاشات — كل سطح رئيسي بهيكله ────────────────────── */

const SCREEN_PINS: readonly [string, string][] = [
  ['mobile/src/app/store/[slug].tsx', 'StorefrontSkeleton'],
  ['mobile/src/app/product/[id].tsx', 'ProductDetailSkeleton'],
  ['mobile/src/app/cart.tsx', 'CartSkeleton'],
  ['mobile/src/app/track/[token].tsx', 'TrackSkeleton'],
  ['mobile/src/app/merchant/(tabs)/dashboard.tsx', 'DashboardSkeleton'],
  ['mobile/src/app/merchant/(tabs)/orders.tsx', 'OrdersSkeleton'],
  ['mobile/src/app/merchant/order/[id].tsx', 'DetailSkeleton'],
  ['mobile/src/app/merchant/manage/products.tsx', 'ManageListSkeleton'],
  ['mobile/src/app/merchant/manage/categories.tsx', 'ManageListSkeleton'],
  ['mobile/src/app/merchant/manage/customers.tsx', 'ManageListSkeleton'],
  ['mobile/src/app/merchant/manage/staff.tsx', 'ManageListSkeleton'],
  ['mobile/src/app/merchant/manage/delivery-zones.tsx', 'ManageListSkeleton'],
  ['mobile/src/app/merchant/manage/payment-methods.tsx', 'ManageListSkeleton'],
  ['mobile/src/app/merchant/manage/reports.tsx', 'ReportsSkeleton'],
  ['mobile/src/app/merchant/manage/settings.tsx', 'SettingsSkeleton'],
  ['mobile/src/app/merchant/manage/pricing.tsx', 'PricingSkeleton'],
  ['mobile/src/app/merchant/manage/customer/[id].tsx', 'DetailSkeleton'],
  ['mobile/src/app/merchant/manage/product/[id].tsx', 'ProductFormSkeleton'],
]

describe('أسلاك الشاشات: هيكل مطابق لا دوارًا مجردًا (anti-drift)', () => {
  it.each(SCREEN_PINS)('%s يستخدم %s', (file, component) => {
    const code = src(file)
    expect(code).toContain(`<${component}`)
    // الدوار لا يعود إلى أسطح البيانات: الخطأ/الفراغ مسموحان، الدوار لا.
    expect(code).not.toContain('LoadingState')
  })
})

describe('البوابات بلا شكل ثابت تبقى على الدوار (اختيار موثق)', () => {
  it('جذر التخطيط (قبل جاهزية الخطوط — الشاشة الافتتاحية تغطي) يبقى دوارًا', () => {
    expect(ROOT_LAYOUT).toContain('<LoadingState label="جارٍ تجهيز Smart Order…" />')
  })

  it('بوابة تاجر (قبل حسم الوجهة دخولًا/تبويبات) تبقى دوارًا', () => {
    const layout = src('mobile/src/app/merchant/_layout.tsx')
    expect(layout).toContain('<LoadingState label="جارٍ تجهيز لوحة التاجر…" />')
  })
})

/* ── 3) الاتصال — اللافتة والأسلاك والصدق ──────────────────────── */

describe('لافتة الاتصال العالمية: مركبة ومربوطة وصادقة', () => {
  it('مركبة في جذر التخطيط (فوق كل الشاشات — ضيفًا وتاجرًا)', () => {
    expect(ROOT_LAYOUT).toContain('<ConnectivityBanner />')
  })

  it('NetInfo → الحكم النقي → المخزن (لا منطقًا مكررًا في المكون)', () => {
    expect(BANNER).toContain('NetInfo.addEventListener')
    expect(BANNER).toContain('isOnlineSnapshot')
    expect(BANNER).toContain('onlineStore.setOnline')
  })

  it('onlineManager مربوط: العودة للاتصال تعيد الجلب وتستأنف المتوقفة', () => {
    expect(BANNER).toContain('onlineManager.setOnline')
  })

  it('انتقالا قارئ الشاشة معلنان (انقطع/عاد)', () => {
    expect(BANNER).toContain('announceForAccessibility')
    expect(BANNER).toContain('انقطع الاتصال بالإنترنت')
    expect(BANNER).toContain('عاد الاتصال بالإنترنت')
  })

  it('لا ادعاء حفظ أثناء الانقطاع (صدق اللغة)', () => {
    expect(BANNER).not.toContain('تم الحفظ')
    expect(BANNER).not.toContain('سيتم الحفظ')
    expect(BANNER).toContain('لا يوجد اتصال بالإنترنت')
  })

  it('المخزن النقي منفصل عن الوحدة الأصلية (درس plan-gates)', () => {
    // العقد على سطور الاستيراد فقط — التوثيق العربي يذكر الأسماء شرحًا.
    const imports = [...CONNECTIVITY.matchAll(/^import .*$/gm)].map((m) => m[0]).join('\n')
    expect(imports).not.toMatch(/react-native|netinfo|expo/i)
    expect(imports).toBe('')
    expect(CONNECTIVITY).toContain('isOnlineSnapshot')
  })
})

/* ── 4) أمان السلة والدفع — لا فقدان صامت عند الفشل ───────────── */

describe('أمان إعادة الاتصال: السلة والدفع لا يفقدان بصمت', () => {
  const cart = src('mobile/src/app/cart.tsx')
  const ordersRoute = src('src/app/api/public/orders/route.ts')

  it('مفتاح idempotence يُسك مرة ويُعاد عبر المحاولات (لا تكرار عند العودة)', () => {
    expect(cart).toContain('if (!checkoutKeyRef.current) checkoutKeyRef.current = randomUUID()')
    expect(cart).toContain('idempotencyKey: checkoutKeyRef.current')
  })

  it('السلة لا تُفرَّغ إلا بعد نجاح مؤكد — المفتاح يُعتق معها', () => {
    const clearAt = cart.indexOf('cart.clear()')
    const retireAt = cart.indexOf("checkoutKeyRef.current = ''")
    expect(clearAt).toBeGreaterThan(-1)
    expect(retireAt).toBeGreaterThan(clearAt)
  })

  it('الفشل يظهر بصوت (Alert) — لا التقاء صامت للخطأ', () => {
    expect(cart).toContain("Alert.alert('لم يُرسل الطلب'")
    expect(cart).toContain('تعذر إرسال الطلب — تحقق من الإنترنت وحاول مجددًا')
  })

  it('W2-ORD-2 قائم: الخادم يعيد التسعير من أسعار حية (لا يثق بمال العميل)', () => {
    expect(ordersRoute).toContain('Server-side re-pricing (never trust client money)')
    expect(ordersRoute).toContain('unitPrice += variant.priceDelta')
    expect(ordersRoute).toContain('unitPrice += opt.priceDelta')
    expect(ordersRoute).toContain('if (!product.isAvailable)')
  })

  it('W2-ORD-2 قائم: بوابة idempotence الخادمية + استرجاع التوأم المتسابق', () => {
    expect(ordersRoute).toContain('findIdemOrder')
    expect(ordersRoute).toContain('isUniqueViolationOn(e, "idempotencyKey")')
  })
})

/* ── 5) ويب التاجر — شريط الانقطاع العائلي في القشرة ───────────── */

describe('ويب التاجر: شريط WifiOff العائلي (GAP-X2)', () => {
  it('القشرة تحمل OfflineBanner فوق الشريط العلوي', () => {
    const shell = src('src/components/dashboard/shell.tsx')
    expect(shell).toContain('OfflineBanner')
  })

  it('الشريط: مرآة نمط tracking-client (WifiOff + role=status) بلا ادعاء حفظ', () => {
    const banner = src('src/components/dashboard/offline-banner.tsx')
    expect(banner).toContain('WifiOff')
    expect(banner).toContain('aria-live="polite"')
    expect(banner).toContain('navigator.onLine')
    expect(banner).not.toContain('تم الحفظ')
    expect(banner).toContain('لا يوجد اتصال بالإنترنت')
  })

  it('مرساة الويب: نمط WifiOff الأصلي ما زال في tracking-client', () => {
    const tracking = src('src/components/storefront/tracking-client.tsx')
    expect(tracking).toContain('WifiOff')
    expect(tracking).toContain('آخر تحديث معروف — تعذّر الاتصال')
  })
})
