/**
 * Smart Order Mobile — الباقات والأسعار (P42-W4، GAP-SO-1).
 *
 * المقصد الأصلي للترقية على التطبيق: قبل هذه الشاشة كان كل رفض خطة
 * (403 PLAN_ENTITLEMENT للتقارير، 409 PLAN_LIMIT للمقاعد) طريقًا
 * مسدودًا — لا توجد أي شاشة باقات في التطبيق أصلًا. هذه الشاشة
 * مرآة بطاقات صفحة /pricing في الويب: الكتالوج يُقرأ حيًا من
 * GET /api/plans (نفس المسار الذي تحمّل به الويب كتالوجه)، وعند
 * تعذر الشبكة تسقط على FALLBACK_PLANS (lib/plans.ts) المثبَّتة
 * باختبار يقرأ بذور الويب مباشرة — مع بيان صادق بأنها نسخة
 * التطبيق، فالباب لا يموت أبدًا.
 *
 * الصدق العائلي: الأرقام هنا هي نفسها التي تفرضها البوابات
 * خادميًا (منذ bbe895c) — «غير محدود» يعني الحد المفروض فعليًا
 * (9999/99999). الاشتراك والدفع لا يتمّان في التطبيق (لا يوجد
 * تدفق دفع أصلي) — زر البطاقة يفتح صفحة الأسعار في الويب حيث
 * يُكمَل الاشتراك، وهذا مذكور صراحة أسفل الشاشة.
 */
import React, { useState } from 'react'
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { fonts, radius, type ThemeColors } from '@/constants/theme'
import { useTheme } from '@/theme/ThemeProvider'
import { fetchPlans } from '@/services/merchant'
import { WEB_BASE_URL } from '@/constants/config'
import { formatNumber } from '@/lib/money'
import {
  ALWAYS_INCLUDED,
  ALWAYS_INCLUDED_TITLE,
  FALLBACK_PLANS,
  YEARLY_SAVINGS_LINE,
  YEARLY_SAVINGS_PCT,
  displayPrice,
  foldRestatedLimits,
  limitValue,
  planBadge,
} from '@/lib/plans'
import type { MobilePlan } from '@/types/merchant'
import { ErrorState } from '@/components/state-views'
import { PricingSkeleton } from '@/components/skeleton'

/** بطاقة باقة — مرآة بنية بطاقة الويب: الشارة، الاسم، السعر،
 *  الحدود، الميزات (بعد طيّ إعادة ذكر الحدين)، والباب. */
function PlanCard({ plan, index, yearly }: { plan: MobilePlan; index: number; yearly: boolean }) {
  const { t } = useTheme()
  const s = makeStyles(t)

  const badge = planBadge(plan, index)
  const isFree = plan.price === 0
  const periodLabel = plan.periodDays === 0 ? '' : yearly ? '/السنة' : '/الشهر'
  const features = foldRestatedLimits(plan.features, plan.maxProducts, plan.maxOrders)

  const openSubscribe = () => {
    // باب التطبيق الوحيد الصادق للاشتراك: صفحة الويب — التطبيق بلا
    // تدفق دفع أصلي. المجاني يفتح التسجيل (وجهة زر الويب نفسها)،
    // والمدفوع يفتح صفحة الباقات حيث يُكمَل الاشتراك والدفع.
    const url = isFree ? `${WEB_BASE_URL}/register` : `${WEB_BASE_URL}/pricing`
    Linking.openURL(url).catch(() => undefined)
  }

  return (
    <View
      style={[
        s.planCard,
        index === 1 && { borderColor: `${t.primary}59`, backgroundColor: t.raised },
      ]}
    >
      {badge ? (
        <View
          style={[
            s.badge,
            index === 1
              ? { backgroundColor: t.primary, borderColor: t.primary }
              : { backgroundColor: t.goldSoft, borderColor: `${t.ring}59` },
          ]}
        >
          <Text style={[s.badgeText, { color: index === 1 ? t.primaryFg : t.ring }]}>{badge}</Text>
        </View>
      ) : null}

      <View style={s.planHead}>
        <View style={s.planNameCol}>
          <Text style={s.planNameAr}>{plan.nameAr}</Text>
          <Text style={s.planName}>{plan.name}</Text>
        </View>
      </View>

      {isFree ? (
        <Text style={s.priceFree}>مجاني</Text>
      ) : (
        <View style={s.priceRow}>
          <Text style={s.priceValue}>{formatNumber(displayPrice(plan, yearly))}</Text>
          <Text style={s.priceUnit}>د.ل</Text>
          <Text style={s.pricePeriod}>{periodLabel}</Text>
        </View>
      )}
      {yearly && !isFree ? <Text style={s.savings}>{YEARLY_SAVINGS_LINE}</Text> : null}

      <View style={s.limitsBox}>
        <View style={s.limitRow}>
          <Text style={s.limitLabel}>المنتجات</Text>
          <Text style={s.limitValue}>{limitValue('products', plan)}</Text>
        </View>
        <View style={s.limitRow}>
          <Text style={s.limitLabel}>الطلبات الشهرية</Text>
          <Text style={s.limitValue}>{limitValue('orders', plan)}</Text>
        </View>
      </View>

      <View style={s.features}>
        {features.map((feature) => (
          <View key={feature} style={s.featureRow}>
            <View style={[s.featureDot, { backgroundColor: `${t.ring}99` }]} />
            <Text style={s.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isFree ? 'ابدأ مجاناً' : 'اشترك الآن'}
        onPress={openSubscribe}
        style={({ pressed }) => [
          s.cta,
          { borderColor: t.primary, backgroundColor: t.card },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Text style={[s.ctaText, { color: t.primary }]}>{isFree ? 'ابدأ مجاناً' : 'اشترك الآن'}</Text>
      </Pressable>
    </View>
  )
}

export default function ManagePricingScreen() {
  const { t } = useTheme()
  const s = makeStyles(t)

  const [yearly, setYearly] = useState(false)

  const query = useQuery({
    queryKey: ['plans'],
    queryFn: fetchPlans,
  })

  /* عند تعذر الشبكة: النسخة الساقطة المثبَّتة على بذور الويب (مع بيان
   * صادق فوقها) — الباب لا يموت بانقطاع الشبكة. الكتالوج الفارغ من
   * الخادم الناجح يبقى الحالة الصادقة للويب نفسها. */
  const usingFallback = query.isError
  const plans = query.data ?? (usingFallback ? FALLBACK_PLANS : [])

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => {
              void query.refetch()
            }}
            tintColor={t.primary}
            colors={[t.primary]}
          />
        }
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="رجوع"
          onPress={() => router.back()}
          style={({ pressed }) => [s.backRow, pressed && { opacity: 0.6 }]}
        >
          <Text style={s.backText}>رجوع</Text>
          <Text style={s.backChevron}>‹</Text>
        </Pressable>
        <Text style={s.title}>الباقات والأسعار</Text>
        <Text style={s.sub}>
          باقات سمارت أوردر — ابدأ مجاناً وارتقِ متى ما كبر عملك. أسعار بالدينار الليبي.
        </Text>

        {/* كبسولة شهري/سنوي — نفس رياضيات الويب: السنة 10 أشهر */}
        <View
          style={s.cycleSwitch}
          accessible
          accessibilityLabel="دورة الفاتورة"
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="فاتورة شهرية"
            accessibilityState={{ selected: !yearly }}
            onPress={() => setYearly(false)}
            style={({ pressed }) => [
              s.cycleChip,
              !yearly && { backgroundColor: t.primary },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[s.cycleText, { color: !yearly ? t.primaryFg : t.mutedFg }]}>شهري</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`فاتورة سنوية — وفر ${YEARLY_SAVINGS_PCT}%`}
            accessibilityState={{ selected: yearly }}
            onPress={() => setYearly(true)}
            style={({ pressed }) => [
              s.cycleChip,
              yearly && { backgroundColor: t.primary },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[s.cycleText, { color: yearly ? t.primaryFg : t.mutedFg }]}>
              سنوي · وفّر {formatNumber(YEARLY_SAVINGS_PCT)}%
            </Text>
          </Pressable>
        </View>

        {/* دائماً في كل الباقات — الكتلة الصادقة (P40/SO-2) */}
        <View style={s.alwaysCard}>
          <Text style={s.alwaysTitle}>{ALWAYS_INCLUDED_TITLE}</Text>
          <View style={s.alwaysRow}>
            {ALWAYS_INCLUDED.map((item) => (
              <View
                key={item}
                style={[s.alwaysChip, { backgroundColor: t.surface, borderColor: t.border }]}
              >
                <View style={[s.featureDot, { backgroundColor: `${t.ring}99` }]} />
                <Text style={s.alwaysChipText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {query.isPending ? (
          <PricingSkeleton />
        ) : query.isError ? (
          <>
            {/* التعذر الصادق: نسخة التطبيق المثبَّتة على بذور الويب */}
            <Text style={s.fallbackNote}>
              تعذر تحميل الباقات من الخادم — هذه باقات التطبيق المعرفة مسبقاً، مطابقة لكتالوج الموقع لحظة إعداد هذه النسخة. اسحب للتحديث عند عودة الاتصال.
            </Text>
            {plans.map((plan, i) => (
              <PlanCard key={plan.id ?? plan.name} plan={plan} index={i} yearly={yearly} />
            ))}
          </>
        ) : plans.length === 0 ? (
          <ErrorState
            message="لا توجد باقات متاحة حالياً"
            onRetry={() => {
              void query.refetch()
            }}
          />
        ) : (
          plans.map((plan, i) => (
            <PlanCard key={plan.id ?? plan.name} plan={plan} index={i} yearly={yearly} />
          ))
        )}

        <Text style={s.footHint}>
          الاشتراك والدفع يتمّان عبر موقع الويب — زر البطاقة يفتح صفحة الباقات هناك
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (t: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.background },
    scroll: { padding: 16, gap: 12, paddingBottom: 32 },
    backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4 },
    backText: {
      fontFamily: fonts.medium,
      fontSize: 14,
      color: t.primary,
    },
    backChevron: { color: t.primary, fontSize: 20, lineHeight: 24 },
    title: {
      fontFamily: fonts.bold,
      fontSize: 24,
      color: t.foreground,
    },
    sub: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: t.mutedFg,
      lineHeight: 19,
      paddingBottom: 2,
    },
    cycleSwitch: {
      flexDirection: 'row',
      gap: 8,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.card,
      padding: 4,
      alignSelf: 'flex-start',
    },
    cycleChip: {
      borderRadius: radius.pill,
      paddingVertical: 8,
      paddingHorizontal: 16,
      minHeight: 44,
      justifyContent: 'center',
    },
    cycleText: {
      fontFamily: fonts.bold,
      fontSize: 12.5,
    },
    alwaysCard: {
      backgroundColor: t.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: t.border,
      padding: 14,
      gap: 10,
    },
    alwaysTitle: {
      fontFamily: fonts.bold,
      fontSize: 13,
      color: t.ring,
      textAlign: 'center',
    },
    alwaysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    alwaysChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: radius.pill,
      borderWidth: 1,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    alwaysChipText: {
      fontFamily: fonts.medium,
      fontSize: 11.5,
      color: t.mutedFg,
    },
    fallbackNote: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: t.mutedFg,
      lineHeight: 18,
      textAlign: 'center',
    },
    planCard: {
      backgroundColor: t.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: t.border,
      padding: 16,
      gap: 12,
    },
    badge: {
      borderRadius: radius.pill,
      borderWidth: 1,
      paddingVertical: 3,
      paddingHorizontal: 10,
      alignSelf: 'flex-start',
    },
    badgeText: {
      fontFamily: fonts.bold,
      fontSize: 10.5,
      lineHeight: 15,
    },
    planHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    planNameCol: { gap: 2 },
    planNameAr: {
      fontFamily: fonts.bold,
      fontSize: 17,
      color: t.foreground,
    },
    planName: {
      fontFamily: fonts.mono,
      fontSize: 11.5,
      color: t.mutedFg,
    },
    priceFree: {
      fontFamily: fonts.bold,
      fontSize: 28,
      color: t.ring,
    },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
    priceValue: {
      fontFamily: fonts.monoMedium,
      fontSize: 28,
      color: t.ring,
    },
    priceUnit: {
      fontFamily: fonts.medium,
      fontSize: 14,
      color: t.mutedFg,
    },
    pricePeriod: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: t.mutedFg,
    },
    savings: {
      fontFamily: fonts.medium,
      fontSize: 11.5,
      color: t.ring,
      marginTop: -6,
    },
    limitsBox: { gap: 6 },
    limitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: radius.md,
      backgroundColor: t.surface,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    limitLabel: {
      fontFamily: fonts.regular,
      fontSize: 12.5,
      color: t.mutedFg,
    },
    limitValue: {
      fontFamily: fonts.monoMedium,
      fontSize: 13,
      color: t.foreground,
    },
    features: { gap: 7 },
    featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    featureDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      marginTop: 7,
    },
    featureText: {
      fontFamily: fonts.regular,
      fontSize: 12.5,
      color: t.mutedFg,
      lineHeight: 19,
      flex: 1,
    },
    cta: {
      borderRadius: radius.md,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      minHeight: 48,
    },
    ctaText: {
      fontFamily: fonts.bold,
      fontSize: 14,
    },
    footHint: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: t.mutedFg,
      textAlign: 'center',
      lineHeight: 18,
      paddingTop: 4,
    },
  })
