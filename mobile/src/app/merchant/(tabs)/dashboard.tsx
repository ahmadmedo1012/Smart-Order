/**
 * Smart Order Mobile — لوحة قيادة التاجر (P36 Phase C).
 *
 * GET /api/dashboard/stats?businessId — بيانات حقيقية فقط: طلبات
 * اليوم، عدّادات الحالات، إيراد اليوم (مليم → formatMillimes)،
 * متوسط الطلب، وآخر 7 أيام. لا أرقام محلية ولا حساب في الواجهة.
 */
import React from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { t } from '@/constants/theme'
import { useAuthStore } from '@/state/auth'
import { fetchDashboardStats } from '@/services/merchant'
import { formatNumber } from '@/lib/money'
import { formatMillimes } from '@/lib/money-millimes'
import { ORDER_STATUS_AR, type OrderStatus } from '@/types/storefront'
import { ErrorState, LoadingState } from '@/components/state-views'

/** صف عدّادات الحالات — نفس ترتيب آلة الخادم. */
const STATUS_ORDER: OrderStatus[] = [
  'NEW',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'REJECTED',
]

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.kpi}>
      <Text style={s.kpiValue}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
  )
}

export default function MerchantDashboardScreen() {
  const businessId = useAuthStore((s) => s.selectedBusinessId)
  const memberships = useAuthStore((s) => s.memberships)
  const business = memberships.find((m) => m.businessId === businessId)?.business

  const query = useQuery({
    queryKey: ['merchant', 'dashboard', businessId],
    queryFn: () => fetchDashboardStats(businessId as string),
    enabled: !!businessId,
  })

  if (query.isPending) {
    return <LoadingState label="جارٍ تحميل لوحة القيادة…" />
  }
  if (query.isError || !query.data) {
    return (
      <ErrorState
        message="تعذر تحميل لوحة القيادة — تحقق من الإنترنت وحاول مجددًا"
        onRetry={() => {
          void query.refetch()
        }}
      />
    )
  }

  const stats = query.data.stats
  const week = query.data.weekSeries

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
        <View style={s.header}>
          <Text style={s.title}>لوحة القيادة</Text>
          <Text style={s.sub} numberOfLines={1}>
            {business ? business.name : ''}
          </Text>
        </View>

        {/* بطاقات المؤشرات */}
        <View style={s.kpiGrid}>
          <KpiCard label="طلبات اليوم" value={formatNumber(stats.todayOrders)} />
          <KpiCard label="إيراد اليوم" value={formatMillimes(stats.todayRevenue)} />
          <KpiCard label="قيد المعالجة" value={formatNumber(stats.pendingCount)} />
          <KpiCard label="مكتمل اليوم" value={formatNumber(stats.todayCompleted)} />
          <KpiCard label="ملغي اليوم" value={formatNumber(stats.todayCancelled)} />
          <KpiCard label="متوسط قيمة الطلب" value={formatMillimes(stats.avgOrder)} />
          <KpiCard label="طلبات الشهر" value={formatNumber(query.data.monthOrders)} />
          <KpiCard label="عملاء جدد اليوم" value={formatNumber(stats.newCustomersToday)} />
        </View>

        {/* عدّادات الحالات */}
        <View style={s.card}>
          <Text style={s.cardTitle}>الطلبات حسب الحالة</Text>
          {STATUS_ORDER.map((st) => (
            <View key={st} style={s.statusRow}>
              <Text style={s.statusLabel}>{ORDER_STATUS_AR[st]}</Text>
              <Text style={s.statusCount}>{formatNumber(stats.statusCounts[st] ?? 0)}</Text>
            </View>
          ))}
        </View>

        {/* آخر 7 أيام */}
        <View style={s.card}>
          <Text style={s.cardTitle}>آخر 7 أيام (المسلَّمة)</Text>
          {week.map((d) => (
            <View key={d.day} style={s.statusRow}>
              <Text style={s.statusLabel}>{d.day}</Text>
              <Text style={s.statusCount}>
                {formatNumber(d.orders)} طلب · {formatMillimes(d.revenue)}
              </Text>
            </View>
          ))}
          {week.length === 0 ? <Text style={s.hint}>لا توجد بيانات بعد</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.background },
  scroll: { padding: 16, gap: 12, paddingBottom: 32 },
  header: { paddingBottom: 4, gap: 2 },
  title: {
    fontFamily: 'IBMPlexSansArabic_700Bold',
    fontSize: 24,
    color: t.foreground,
  },
  sub: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 13,
    color: t.mutedFg,
  },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: {
    width: '48.5%',
    flexGrow: 1,
    backgroundColor: t.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    padding: 14,
    gap: 4,
  },
  kpiValue: {
    fontFamily: 'IBMPlexSansArabic_700Bold',
    fontSize: 18,
    color: t.ring,
  },
  kpiLabel: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 12.5,
    color: t.mutedFg,
  },
  card: {
    backgroundColor: t.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 15,
    color: t.foreground,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusLabel: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 13,
    color: t.mutedFg,
  },
  statusCount: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 13,
    color: t.foreground,
  },
  hint: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 12.5,
    color: t.mutedFg,
    textAlign: 'center',
  },
})
