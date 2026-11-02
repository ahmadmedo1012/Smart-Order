/**
 * Smart Order Mobile — عائلة الهياكل العظمية القانونية (P42-W5، GAP-SO-2).
 *
 * عقيدة الحالات (العائلة/الويب): التحميل = هيكل عظمي مطابق للشكل، لا
 * دورانًا مجردًا. الويب يملك 19 هيكلًا مطابقًا لكل صفحة
 * (src/components/dashboard/skeletons.tsx + storefront/skeletons.tsx)
 * والتطبيق كان الوحيد في الأسطول الذي يخالفها على الجوال — هنا مرآته:
 * كل سطح رئيسي يرسم هيكلًا بأبعاد الشاشة الحقيقية نفسها (ترويسة +
 * رقائق + بطاقات بالأبعاد نفسها) فلا يقفز التخطيط عند هبوط البيانات.
 *
 * الوصفة العائلية (globals.css ‎.skeleton): أرض muted وحزام sweep بلون
 * card يمر كل 1200ms «خطيًا» حرفيًا (Easing.linear — لا ease وإلا نبضت
 * السرعة كل دورة) — مطابقة تدرّج الويب (muted → مزج muted 40% مع card
 * → muted) بحزام card صلب بشفافية 0.6، بلا وحدة تدرّج إضافية. نصف
 * القطر الافتراضي radius.sm (6) مثل --radius-sm.
 *
 * تقليل الحركة: الحلقة تتوقف كليًا (reduceMotionChanged) ويبقى الشكل
 * الساكن placeholder — مرآة جمود حزام الويب تحت RM.
 *
 * إعلانات قارئ الشاشة: كل سطح يعلن حالة التحميل عبر
 * AccessibilityInfo.announceForAccessibility (نمط العائلة في Smart-Menu)
 * ويحمل role=progressbar + busy=true — قارئ الشاشة يسمع «جارٍ…» لا صمتًا.
 *
 * البداية (Skeleton) قابلة للتكوين؛ الفوقها تشكيلات لكل شاشة رئيسية
 * بأبعاد شاشات التطبيق نفسها (تُقرأ من makeStyles لكل شاشة).
 */
import React, { useEffect, useState } from 'react'
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { radius, type ThemeColors } from '@/constants/theme'
import { useTheme } from '@/theme/ThemeProvider'

/** مدة الحزام — نفس --motion-duration-skeleton في الويب (1200ms خطي). */
export const SKELETON_SWEEP_MS = 1200

/* ── تقليل الحركة — مرآة prefers-reduced-motion للويب ────────────── */

/** هل طلب المستخدم تقليل الحركة؟ (يتتبع reduceMotionChanged حيًا). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    let alive = true
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) setReduced(Boolean(v))
      })
      .catch(() => undefined)
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      if (alive) setReduced(Boolean(v))
    })
    return () => {
      alive = false
      sub.remove()
    }
  }, [])
  return reduced
}

/* ── إعلان التحميل لقارئ الشاشة (نمط العائلة) ───────────────────── */

/** أعلن نص التحميل مرة عند الجلوس (TalkBack/VoiceOver سمعٌ لا صمت). */
export function useLoadingAnnouncement(label: string): void {
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(label)
  }, [label])
}

/* ── البداية: شريط واحد بأرض muted وحزام card يمر خطيًا ─────────── */

/**
 * شريط هيكل واحد — أرض muted وحزام card بشفافية 0.6 يمر كل 1200ms
 * خطيًا (useNativeDriver). تحت تقليل الحركة يبقى الشكل الساكن بلا حزام.
 */
export function Skeleton({
  width,
  height = 14,
  rounded,
  style,
}: {
  width?: DimensionValue
  height?: number
  /** نصف قطر بكسل — الافتراضي radius.sm (6) مثل --radius-sm في الويب. */
  rounded?: number
  style?: StyleProp<ViewStyle>
}) {
  const { t } = useTheme()
  const reducedMotion = useReducedMotion()
  // القيمة المتحركة في حالة (لا ref) — تُنشأ مرة وتُقرأ في التصيير
  // والتأثيرات بلا قفزات؛ نفس قاعدة أدوات React الجديدة.
  const [progress] = useState(() => new Animated.Value(0))
  const [barWidth, setBarWidth] = useState(0)

  useEffect(() => {
    if (reducedMotion) {
      progress.stopAnimation(() => progress.setValue(0))
      return
    }
    progress.setValue(0)
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: SKELETON_SWEEP_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )
    loop.start()
    return () => loop.stop()
  }, [reducedMotion, progress])

  // الحزام 45% من عرض الشريط؛ يخرج كليًا من الطرفين عند 0 و1.
  const bandWidth = Math.max(barWidth * 0.45, 1)
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-bandWidth, barWidth],
  })

  return (
    <View
      onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      style={[
        {
          width,
          height,
          borderRadius: rounded ?? radius.sm,
          backgroundColor: t.muted,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {!reducedMotion ? (
        <Animated.View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: bandWidth,
            backgroundColor: t.card,
            opacity: 0.6,
            borderRadius: rounded ?? radius.sm,
            transform: [{ translateX }],
          }}
        />
      ) : null}
    </View>
  )
}

/* ── قشرة بطاقة + صفوف — لغة بطاقات الشاشات نفسها ──────────────── */

function CardShell({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { t } = useTheme()
  return (
    <View
      style={[
        {
          backgroundColor: t.card,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: t.border,
          padding: 14,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

/** رقاقة تصنيف ساكنة — بنفس ارتفاع Chip الحقيقية (padding 8 + نص 13). */
function PillSkeleton({ width = 64 }: { width?: number }) {
  const { t } = useTheme()
  return (
    <View
      style={{
        width,
        height: 37,
        borderRadius: radius.pill,
        backgroundColor: t.card,
        borderWidth: 1,
        borderColor: t.border,
        overflow: 'hidden',
      }}
    >
      <Skeleton width="60%" height={13} style={{ marginTop: 11, marginHorizontal: '20%' }} rounded={radius.sm} />
    </View>
  )
}

/* ── غلاف الحالة: progressbar + busy + إعلان ───────────────────── */

/** سطح شاشة كاملة (بمنطقة آمنة) — بديل LoadingState الملء الكامل. */
function SkeletonSurface({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  const { t } = useTheme()
  useLoadingAnnouncement(label)
  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={{ flex: 1, backgroundColor: t.background }}
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
    >
      <View style={{ flex: 1 }}>{children}</View>
    </SafeAreaView>
  )
}

/** قسم داخل شاشة محمّلة الإطار (ترويستتها حقيقية فوق الهيكل). */
function SkeletonSection({
  label,
  children,
  pad = true,
}: {
  label: string
  children: React.ReactNode
  pad?: boolean
}) {
  useLoadingAnnouncement(label)
  return (
    <View
      style={[pad && { padding: 16, paddingTop: 8, gap: 10 }, { flexGrow: 1 }]}
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
    >
      {children}
    </View>
  )
}

/* ══ تشكيلات رحلة الزبون ════════════════════════════════════════ */

/**
 * شاشة المتجر — مرآة StorefrontSkeleton للويب بأبعاد الجوال: ترويسة
 * المتجر (رجوع + الاسم/المدينة + شعار 44×44) + شريط تصنيفات أفقي +
 * صفوف أصناف (نص + صورة 86×86) بأبعاد بطاقة الصنف الحقيقية.
 */
export function StorefrontSkeleton({ label = 'جارٍ فتح المتجر…' }: { label?: string }) {
  const { t } = useTheme()
  const s = makeStyles(t)
  return (
    <SkeletonSurface label={label}>
      {/* ترويسة المتجر */}
      <View style={s.storeHeader}>
        <View style={s.backGlyph} />
        <View style={{ flex: 1, gap: 5 }}>
          <Skeleton width="55%" height={17} />
          <Skeleton width="30%" height={12} />
        </View>
        <Skeleton width={44} height={44} rounded={12} />
      </View>
      {/* شريط التصنيفات */}
      <View style={s.chipsRow}>
        {[64, 56, 72, 60, 66].map((w, i) => (
          <PillSkeleton key={i} width={w} />
        ))}
      </View>
      {/* قائمة الأصناف */}
      <View style={s.listCol}>
        {Array.from({ length: 5 }, (_, i) => (
          <CardShell key={i} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, gap: 7 }}>
              <Skeleton width="62%" height={15} />
              <Skeleton width="88%" height={12.5} />
              <Skeleton width="40%" height={12.5} />
              <Skeleton width="25%" height={14} />
            </View>
            <Skeleton width={86} height={86} rounded={12} />
          </CardShell>
        ))}
      </View>
    </SkeletonSurface>
  )
}

/**
 * شاشة الصنف — صورة بطل 220 + الاسم والوصف + صفوف رقائق النسخ/
 * الإضافات + حقل الملاحظة + الكمية + شريط الإضافة السفلي.
 */
export function ProductDetailSkeleton({ label = 'جارٍ فتح الصنف…' }: { label?: string }) {
  const { t } = useTheme()
  const s = makeStyles(t)
  return (
    <SkeletonSurface label={label}>
      <Skeleton width="100%" height={220} rounded={0} />
      <View style={s.bodyCol}>
        <Skeleton width="58%" height={20} />
        <Skeleton width="82%" height={14} />
        <Skeleton width="70%" height={14} />
        {/* قسم رقائق */}
        <View style={{ gap: 10 }}>
          <Skeleton width="30%" height={15} />
          <View style={s.pillWrap}>
            {[84, 96, 72].map((w, i) => (
              <PillSkeleton key={i} width={w} />
            ))}
          </View>
        </View>
        {/* قسم رقائق ثانٍ */}
        <View style={{ gap: 10 }}>
          <Skeleton width="40%" height={15} />
          <View style={s.pillWrap}>
            {[72, 88, 64, 80].map((w, i) => (
              <PillSkeleton key={i} width={w} />
            ))}
          </View>
        </View>
        {/* الملاحظة */}
        <View style={{ gap: 10 }}>
          <Skeleton width="45%" height={15} />
          <CardShell style={{ padding: 6, borderRadius: 10 }}>
            <Skeleton width="55%" height={16} style={{ marginVertical: 14, marginHorizontal: 8 }} />
          </CardShell>
        </View>
        {/* الكمية */}
        <View style={{ gap: 10 }}>
          <Skeleton width="22%" height={15} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
            <Skeleton width={44} height={44} rounded={12} />
            <Skeleton width={34} height={18} />
            <Skeleton width={44} height={44} rounded={12} />
          </View>
        </View>
      </View>
      {/* شريط الإضافة */}
      <View style={s.footerBar}>
        <View style={{ flex: 1, gap: 5 }}>
          <Skeleton width="38%" height={11} />
          <Skeleton width="55%" height={17} />
        </View>
        <Skeleton width={170} height={44} rounded={10} />
      </View>
    </SkeletonSurface>
  )
}

/**
 * السلة — بطاقة أسطر (صورة 56 + نص + عمود كمية) ×3 + صندوق المجاميع
 * + بطاقة طريقة التسليم + بطاقة الدفع + زر الإرسال — أبعاد cart.tsx.
 */
export function CartSkeleton({ label = 'جارٍ تجهيز السلة…' }: { label?: string }) {
  const { t } = useTheme()
  const s = makeStyles(t)
  return (
    <SkeletonSurface label={label}>
      <View style={s.scrollCol}>
        <CardShell style={{ padding: 16, gap: 12 }}>
          <Skeleton width="50%" height={15} />
          {Array.from({ length: 3 }, (_, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
              <Skeleton width={56} height={56} rounded={10} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width="70%" height={13.5} />
                <Skeleton width="50%" height={12} />
                <Skeleton width="28%" height={13} />
              </View>
              <View style={{ gap: 6, alignItems: 'center' }}>
                <Skeleton width={30} height={26} rounded={8} />
                <Skeleton width={16} height={12} />
                <Skeleton width={30} height={26} rounded={8} />
              </View>
            </View>
          ))}
          {/* صندوق المجاميع */}
          <CardShell style={{ padding: 12, gap: 8, borderRadius: 10, backgroundColor: t.surface }}>
            {[0, 1].map((i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Skeleton width="32%" height={13} />
                <Skeleton width="20%" height={13} />
              </View>
            ))}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Skeleton width="22%" height={15} />
              <Skeleton width="26%" height={15} />
            </View>
          </CardShell>
        </CardShell>
        {/* طريقة التسليم */}
        <CardShell style={{ padding: 16, gap: 12 }}>
          <Skeleton width="34%" height={15} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Skeleton width="48%" height={44} rounded={12} />
            <Skeleton width="48%" height={44} rounded={12} />
          </View>
        </CardShell>
        {/* الدفع */}
        <CardShell style={{ padding: 16, gap: 12 }}>
          <Skeleton width="28%" height={15} />
          {Array.from({ length: 2 }, (_, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton width="44%" height={13.5} />
              <Skeleton width={20} height={20} rounded={radius.pill} />
            </View>
          ))}
        </CardShell>
        <Skeleton width="100%" height={48} rounded={10} />
      </View>
    </SkeletonSurface>
  )
}

/**
 * تتبّع الطلب — ترويسة الطلب (رقم + طابع) + شريط الحالات + أسطر +
 * المجاميع + سجل الحركة — أبعاد track/[token].
 */
export function TrackSkeleton({ label = 'جارٍ فتح الطلب…' }: { label?: string }) {
  const { t } = useTheme()
  const s = makeStyles(t)
  return (
    <SkeletonSurface label={label}>
      <View style={s.scrollCol}>
        {/* ترويسة الطلب */}
        <CardShell style={{ padding: 16, gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Skeleton width="34%" height={14} />
            <Skeleton width={72} height={26} rounded={radius.stamp} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Skeleton width="40%" height={12.5} />
            <Skeleton width="30%" height={12.5} />
          </View>
        </CardShell>
        {/* شريط الحالات */}
        <CardShell style={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} width={22} height={22} rounded={radius.pill} />
            ))}
          </View>
        </CardShell>
        {/* الأسطر + المجاميع */}
        <CardShell style={{ padding: 16, gap: 10 }}>
          {Array.from({ length: 2 }, (_, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Skeleton width="56%" height={13} />
              <Skeleton width="22%" height={13} />
            </View>
          ))}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Skeleton width="24%" height={14} />
            <Skeleton width="26%" height={14} />
          </View>
        </CardShell>
        {/* سجل الحركة */}
        <CardShell style={{ padding: 16, gap: 10 }}>
          <Skeleton width="30%" height={14} />
          {Array.from({ length: 3 }, (_, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Skeleton width={10} height={10} rounded={radius.pill} />
              <Skeleton width={`${70 - i * 8}%`} height={12.5} />
            </View>
          ))}
        </CardShell>
      </View>
    </SkeletonSurface>
  )
}

/* ══ تشكيلات التاجر ═════════════════════════════════════════════ */

/**
 * لوحة القيادة — ترويسة (العنوان + اسم المتجر) + شبكة KPI ‏2×4 +
 * بطاقتا صفوف (عدّادات الحالات + آخر 7 أيام) — أبعاد (tabs)/dashboard.
 */
export function DashboardSkeleton({ label = 'جارٍ تحميل لوحة القيادة…' }: { label?: string }) {
  const { t } = useTheme()
  const s = makeStyles(t)
  return (
    <SkeletonSurface label={label}>
      <View style={s.scrollCol}>
        <View style={{ gap: 2, paddingBottom: 4 }}>
          <Skeleton width="42%" height={24} />
          <Skeleton width="30%" height={13} />
        </View>
        <View style={s.kpiGrid}>
          {Array.from({ length: 8 }, (_, i) => (
            <CardShell key={i} style={{ width: '48.5%', flexGrow: 1, padding: 14, gap: 6 }}>
              <Skeleton width="42%" height={18} />
              <Skeleton width="62%" height={12.5} />
            </CardShell>
          ))}
        </View>
        <CardSkeletonRows rows={6} />
        <CardSkeletonRows rows={7} />
      </View>
    </SkeletonSurface>
  )
}

/** بطاقة بعنوان وصفوف سطرين — بطاقات «حسب الحالة» و«آخر 7 أيام». */
function CardSkeletonRows({ rows }: { rows: number }) {
  return (
    <CardShell style={{ padding: 16, gap: 10 }}>
      <Skeleton width="38%" height={15} />
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Skeleton width={`${46 - i * 3}%`} height={13} />
          <Skeleton width="18%" height={13} />
        </View>
      ))}
    </CardShell>
  )
}

/**
 * صندوق الطلبات (قسم داخل الترويسة والرقائق الحقيقيتين): بطاقات طلب
 * (رقم mono + طابع + عميل + سطر سفلي) — أبعاد (tabs)/orders.
 */
export function OrdersSkeleton({ label = 'جارٍ تحميل الطلبات…' }: { label?: string }) {
  return (
    <SkeletonSection label={label}>
      {Array.from({ length: 5 }, (_, i) => (
        <CardShell key={i} style={{ padding: 14, gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Skeleton width="30%" height={14} />
            <Skeleton width={64} height={24} rounded={radius.stamp} />
          </View>
          <Skeleton width="58%" height={13} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Skeleton width="46%" height={12} />
            <Skeleton width="20%" height={14} />
          </View>
        </CardShell>
      ))}
    </SkeletonSection>
  )
}

/**
 * قوائم شاشات الإدارة (منتجات/عملاء/أقسام/فريق/مناطق/دفع) — بطاقات
 * صف بعنوان وسطر وصف وطوابع — بنفس بنية بطاقة القائمة الحقيقية.
 */
export function ManageListSkeleton({
  label,
  rows = 4,
}: {
  label: string
  rows?: number
}) {
  return (
    <SkeletonSection label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <CardShell key={i} style={{ padding: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, gap: 5 }}>
              <Skeleton width={`${52 - i * 4}%`} height={15} />
              <Skeleton width={`${70 - i * 5}%`} height={12} />
            </View>
            <Skeleton width="16%" height={14} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Skeleton width={58} height={22} rounded={radius.stamp} />
            <Skeleton width={58} height={22} rounded={radius.stamp} />
          </View>
        </CardShell>
      ))}
    </SkeletonSection>
  )
}

/**
 * التقارير (قسم تحت نافذة التاريخ الحقيقية): شبكة KPI + بطاقة رسم +
 * بطاقة أصناف — مرآة ReportsSkeleton للويب بأبعاد الجوال.
 */
export function ReportsSkeleton({ label = 'جارٍ تحميل التقرير…' }: { label?: string }) {
  const { t } = useTheme()
  const s = makeStyles(t)
  return (
    <SkeletonSection label={label}>
      <View style={s.kpiGrid}>
        {Array.from({ length: 4 }, (_, i) => (
          <CardShell key={i} style={{ width: '48.5%', flexGrow: 1, padding: 14, gap: 6 }}>
            <Skeleton width="46%" height={18} />
            <Skeleton width="60%" height={12.5} />
          </CardShell>
        ))}
      </View>
      <CardShell style={{ padding: 16, gap: 10 }}>
        <Skeleton width="34%" height={15} />
        <Skeleton width="100%" height={72} rounded={radius.md} />
      </CardShell>
      <CardSkeletonRows rows={4} />
    </SkeletonSection>
  )
}

/**
 * إعدادات المتجر (قسم تحت الترويسة الحقيقية): بطاقتا نموذج بحقول
 * (تسمية + مدخل 48) — أبعاد manage/settings.
 */
export function SettingsSkeleton({ label = 'جارٍ تحميل الإعدادات…' }: { label?: string }) {
  return (
    <SkeletonSection label={label}>
      {Array.from({ length: 2 }, (_, card) => (
        <CardShell key={card} style={{ padding: 16, gap: 14 }}>
          <Skeleton width={card === 0 ? '38%' : '26%'} height={15} />
          {Array.from({ length: card === 0 ? 3 : 2 }, (_, f) => (
            <View key={f} style={{ gap: 7 }}>
              <Skeleton width="24%" height={12} />
              <Skeleton width="100%" height={48} rounded={10} />
            </View>
          ))}
        </CardShell>
      ))}
    </SkeletonSection>
  )
}

/**
 * شاشة الباقات (قسم تحت الترويسة الحقيقية): بطاقات باقة (الاسم +
 * السعر + 3 ميزات + زر) ×عدد الباقات — أبعاد manage/pricing. عدد
 * الباقات من كتالوج الخادم نفسه (4 في البذور الحالية).
 */
export function PricingSkeleton({ label = 'جارٍ تحميل الباقات…' }: { label?: string }) {
  return (
    <SkeletonSection label={label}>
      {Array.from({ length: 4 }, (_, i) => (
        <CardShell key={i} style={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Skeleton width="30%" height={16} />
            {i === 1 ? <Skeleton width={64} height={22} rounded={radius.pill} /> : null}
          </View>
          <Skeleton width="42%" height={26} />
          {Array.from({ length: 3 }, (_, f) => (
            <Skeleton key={f} width={`${76 - f * 9}%`} height={13} />
          ))}
          <Skeleton width="100%" height={44} rounded={10} />
        </CardShell>
      ))}
    </SkeletonSection>
  )
}

/**
 * صفحات التفاصيل (طلب تاجر / ملف عميل): ترويسة صف أعمدة + بطاقة
 * ترويسة كيان + شبكة KPI ‏3 + بطاقتا محتوى — مرآة DetailSkeleton
 * للويب بأبعاد الجوال. الطلب تاجر شاشة كاملة؛ ملف العميل قسم تحت
 * ترويستته الحقيقية (section).
 */
export function DetailSkeleton({ label, section = false }: { label: string; section?: boolean }) {
  const { t } = useTheme()
  const s = makeStyles(t)
  const body = (
    <View style={section ? { gap: 12 } : s.scrollCol}>
      <CardShell style={{ padding: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton width="36%" height={16} />
          <Skeleton width={72} height={26} rounded={radius.stamp} />
        </View>
        <Skeleton width="52%" height={12.5} />
      </CardShell>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {Array.from({ length: 3 }, (_, i) => (
          <CardShell key={i} style={{ flex: 1, padding: 14, gap: 7, alignItems: 'center' }}>
            <Skeleton width="60%" height={12} />
            <Skeleton width="70%" height={22} />
          </CardShell>
        ))}
      </View>
      <CardSkeletonRows rows={5} />
      <CardSkeletonRows rows={3} />
    </View>
  )
  if (section) return <SkeletonSection label={label}>{body}</SkeletonSection>
  return <SkeletonSurface label={label}>{body}</SkeletonSurface>
}

/**
 * نموذج المنتج (شاشة كاملة): حقول الاسم/الوصف/السعر + صف صورة +
 * قسم النسخ والإضافات + زر الحفظ — أبعاد manage/product/[id].
 */
export function ProductFormSkeleton({ label = 'جارٍ تحميل المنتج…' }: { label?: string }) {
  return (
    <SkeletonSurface label={label}>
      <View style={{ padding: 16, gap: 12, paddingBottom: 32 }}>
        <CardShell style={{ padding: 16, gap: 14 }}>
          {Array.from({ length: 3 }, (_, f) => (
            <View key={f} style={{ gap: 7 }}>
              <Skeleton width={f === 1 ? '36%' : '22%'} height={12} />
              <Skeleton width="100%" height={48} rounded={10} />
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Skeleton width={56} height={56} rounded={12} />
            <Skeleton width="44%" height={13} />
          </View>
        </CardShell>
        <CardShell style={{ padding: 16, gap: 14 }}>
          <Skeleton width="30%" height={15} />
          {Array.from({ length: 2 }, (_, f) => (
            <View key={f} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton width={`${50 - f * 8}%`} height={13.5} />
              <Skeleton width={20} height={20} rounded={radius.pill} />
            </View>
          ))}
        </CardShell>
        <Skeleton width="100%" height={48} rounded={10} />
      </View>
    </SkeletonSurface>
  )
}

/* ── أنماط مشتركة للتشكيلات ────────────────────────────────────── */

const makeStyles = (t: ThemeColors) =>
  StyleSheet.create({
    storeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: t.card,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    backGlyph: { width: 36, height: 36, borderRadius: 6, backgroundColor: t.muted },
    chipsRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: t.background,
    },
    listCol: { padding: 16, gap: 10, paddingBottom: 110 },
    bodyCol: { padding: 16, gap: 18, paddingBottom: 16 },
    pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    footerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 14,
      backgroundColor: t.card,
      borderTopWidth: 1,
      borderTopColor: t.border,
    },
    scrollCol: { padding: 16, gap: 12, paddingBottom: 32 },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  })
