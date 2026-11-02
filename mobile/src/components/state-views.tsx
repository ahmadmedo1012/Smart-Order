/**
 * Smart Order Mobile — حالات موحدة (تحميل/خطأ/فراغ) بنبرة العلامة.
 * الألوان عبر useTheme — تتبع الوضع الليلي/النهاري.
 *
 * P42-W4 (GAP-SO-1): عائلة رفض الخطة — الحالة المقفولة وباب الترقية.
 * رفض الباقة ليس خطأً ولا فراغًا: إنه رفض مسمّى مع مخرج. الويب يعرض
 * EmptyState بقفل + زر «عرض الباقات والترقية» → /pricing (تقارير)،
 * ورقاقة copper «مقاعد أكثر — رقّ خطتك» (فريق) — هنا مرآتهما:
 * LockedState (الحالة الكاملة) وUpgradeDoor (الرقاقة البابية)،
 * وكلاهما يفتح شاشة الباقات الأصلية للتطبيق.
 */
import React from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { fonts, radius, type ThemeColors } from '@/constants/theme'
import { useTheme } from '@/theme/ThemeProvider'
import { PlusIcon } from '@/components/icons'

/**
 * حالة التحميل الدوّارة — عقيدة العائلة (P42-W5، GAP-SO-2): أسطح
 * البيانات الرئيسية ترسم هيكلًا عظميًا مطابقًا للشكل
 * (components/skeleton.tsx — مرآة الـ19 هيكلًا في الويب)، وهذا الدوار
 * يبقى فقط حيث لا شكل ثابتًا له: بوابات الإقلاع/الجلسة (جذر التخطيط
 * قبل جاهزية الخطوط، وبوابة تاجر قبل حسم الوجهة دخولًا/تبويبات) —
 * هناك الصدق دوار قصير، لا هيكلًا يكذب على ما هو قادم.
 */
export function LoadingState({ label = 'جارٍ التحميل…' }: { label?: string }) {
  const { t } = useTheme()
  const s = makeStyles(t)
  return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={t.primary} />
      <Text style={s.label}>{label}</Text>
    </View>
  )
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string | null
  onRetry?: () => void
}) {
  const { t } = useTheme()
  const s = makeStyles(t)
  return (
    <View style={s.center}>
      <Text style={s.emoji} accessibilityRole="image" aria-label="خطأ">
        ⚠️
      </Text>
      <Text style={s.label}>{message ?? 'حدث خطأ غير متوقع'}</Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [s.retry, pressed && { opacity: 0.7 }]}
        >
          <Text style={s.retryText}>إعادة المحاولة</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  const { t } = useTheme()
  const s = makeStyles(t)
  return (
    <View style={s.center}>
      <Text style={s.emoji} accessibilityRole="image" aria-label="فراغ">
        🛍️
      </Text>
      <Text style={s.title}>{title}</Text>
      {hint ? <Text style={s.label}>{hint}</Text> : null}
    </View>
  )
}

/**
 * الحالة المقفولة (رفض خطة 403 PLAN_ENTITLEMENT) — مرآة عائلة الويب:
 * رفض الاستحقاق حالة مقفولة مسمّاة بباب ترقية، لا خطأً ميتًا ولا
 * دورانًا كاذبًا. العنوان يُقرأ من ثابت الحد الأدنى (مثبّت باختبار
 * يقرأ مصدر الويب) فلا ينحرف عن البوابة أبدًا؛ والباب الافتراضي
 * هو شاشة الباقات الأصلية (المقصد العائلي الوحيد للترقية).
 */
export function LockedState({
  title,
  description,
  ctaLabel = 'عرض الباقات والترقية',
  onCta,
}: {
  title: string
  description?: string | null
  ctaLabel?: string
  onCta?: () => void
}) {
  const { t } = useTheme()
  const s = makeStyles(t)
  return (
    <View style={s.center}>
      <Text style={s.emoji} accessibilityRole="image" aria-label="مقفل">
        🔒
      </Text>
      <Text style={s.title}>{title}</Text>
      {description ? <Text style={s.label}>{description}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
        onPress={onCta ?? (() => router.push('/merchant/manage/pricing'))}
        style={({ pressed }) => [s.retry, pressed && { opacity: 0.8 }]}
      >
        <Text style={s.retryText}>{ctaLabel}</Text>
      </Pressable>
    </View>
  )
}

/**
 * باب الترقية (رقاقة copper) — مرآة رقاقة الويب في staff:98 (حدّ
 * الحبر العائلي 59 على أرض العائلة وطابع مربّع radius.stamp). يظهر
 * حيث يقع الرفض أو قبله: رفض الخطة لا يُترك بلا مخرج، والافتراضي
 * يفتح شاشة الباقات الأصلية.
 */
export function UpgradeDoor({
  label,
  onPress,
}: {
  label: string
  onPress?: () => void
}) {
  const { t, statusFamily } = useTheme()
  const s = makeStyles(t)
  const fam = statusFamily.copper
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress ?? (() => router.push('/merchant/manage/pricing'))}
      style={({ pressed }) => [
        s.door,
        {
          backgroundColor: fam.bg,
          borderColor: `${fam.ink}59`,
        },
        pressed && { opacity: 0.8 },
      ]}
    >
      <PlusIcon size={14} color={fam.deep} />
      <Text style={[s.doorText, { color: fam.deep }]}>{label}</Text>
    </Pressable>
  )
}

const makeStyles = (t: ThemeColors) =>
  StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: 32,
      backgroundColor: t.background,
    },
    label: {
      color: t.mutedFg,
      fontFamily: fonts.regular,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 22,
    },
    title: {
      color: t.foreground,
      fontFamily: fonts.bold,
      fontSize: 16,
      textAlign: 'center',
    },
    emoji: { fontSize: 40 },
    retry: {
      backgroundColor: t.primary,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 24,
    },
    retryText: {
      color: t.primaryFg,
      fontFamily: fonts.bold,
      fontSize: 14,
    },
    door: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: radius.stamp,
      borderWidth: 1,
      paddingVertical: 8,
      paddingHorizontal: 14,
      alignSelf: 'flex-start',
      minHeight: 44,
    },
    doorText: {
      fontFamily: fonts.bold,
      fontSize: 12.5,
      lineHeight: 18,
    },
  })
