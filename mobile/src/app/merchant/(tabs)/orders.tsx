/**
 * Smart Order Mobile — صندوق طلبات التاجر (P36 Phase C).
 *
 * GET /api/orders?businessId&status — رقائق تصفية بالحالة، سحب
 * للتحديث، وبطاقات طلبات (الرقم/العميل/الإجمالي/الحالة/الوقت).
 * الإجماليات مليم من الخادم وتُعرض عبر formatMillimes حصرًا.
 */
import React, { useState } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { fonts, type ThemeColors } from '@/constants/theme'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuthStore } from '@/state/auth'
import { fetchOrders } from '@/services/merchant'
import { formatArabicClock, formatArabicDayShort } from '@/lib/datetime'
import { formatMillimes } from '@/lib/money-millimes'
import { FULFILLMENT_AR, type OrderStatus } from '@/types/storefront'
import { Chip, StatusStamp } from '@/components/ui'
import { EmptyState, ErrorState, LoadingState } from '@/components/state-views'

/** رقائق الصندوق — «الكل» + الحالات السبع الحية للتاجر. */
const FILTERS: { value: OrderStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'الكل' },
  { value: 'NEW', label: 'الجديدة' },
  { value: 'CONFIRMED', label: 'مؤكدة' },
  { value: 'PREPARING', label: 'قيد التحضير' },
  { value: 'READY', label: 'جاهزة' },
  { value: 'OUT_FOR_DELIVERY', label: 'في الطريق' },
  { value: 'DELIVERED', label: 'مكتملة' },
  { value: 'CANCELLED', label: 'ملغاة' },
]

export default function MerchantOrdersScreen() {
  const { t } = useTheme()
  const s = makeStyles(t)

  const [filter, setFilter] = useState<OrderStatus | 'ALL'>('ALL')
  const businessId = useAuthStore((s) => s.selectedBusinessId)
  const memberships = useAuthStore((s) => s.memberships)
  const business = memberships.find((m) => m.businessId === businessId)?.business

  const query = useQuery({
    queryKey: ['merchant', 'orders', businessId, filter],
    queryFn: () => fetchOrders(businessId as string, filter === 'ALL' ? undefined : filter),
    enabled: !!businessId,
  })

  const orders = query.data ?? []

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* الترويسة */}
      <View style={s.header}>
        <Text style={s.title}>الطلبات</Text>
        <Text style={s.sub} numberOfLines={1}>
          {business ? business.name : ''}
        </Text>
      </View>

      {/* رقائق الحالة */}
      <View>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(f) => f.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chips}
          renderItem={({ item }) => (
            <Chip label={item.label} active={filter === item.value} onPress={() => setFilter(item.value)} />
          )}
        />
      </View>

      {/* القائمة */}
      {query.isPending ? (
        <LoadingState label="جارٍ تحميل الطلبات…" />
      ) : query.isError ? (
        <ErrorState
          message="تعذر تحميل الطلبات — تحقق من الإنترنت وحاول مجددًا"
          onRetry={() => {
            void query.refetch()
          }}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          title={filter === 'ALL' ? 'لا توجد طلبات بعد' : 'لا توجد طلبات في هذه الحالة'}
          hint={filter === 'ALL' ? 'ستظهر الطلبات الجديدة هنا لحظة وصولها' : 'جرّب حالة أخرى من الأعلى'}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={s.list}
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
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`تفاصيل الطلب ${item.orderNumber}`}
              onPress={() => {
                router.push({ pathname: '/merchant/order/[id]', params: { id: item.id } })
              }}
              style={({ pressed }) => [s.card, pressed && { opacity: 0.82 }]}
            >
              <View style={s.cardTop}>
                <Text style={s.number}>{item.orderNumber}</Text>
                <StatusStamp status={item.status} />
              </View>
              <Text style={s.customer} numberOfLines={1}>
                {item.customerName} · {item._count.items} أصناف
              </Text>
              <View style={s.cardBottom}>
                <Text style={s.meta}>
                  {FULFILLMENT_AR[item.fulfillmentType]} · {formatArabicDayShort(item.createdAt)} ·{' '}
                  {formatArabicClock(item.createdAt)}
                </Text>
                <Text style={s.total}>{formatMillimes(item.total)}</Text>
              </View>
            </Pressable>
          )}
        />
      )}

      {/* شريط تحديث سفلي عند فشل صامت أثناء التصفح */}
      {query.isRefetching && orders.length > 0 ? (
        <View style={s.refetchBar}>
          <Text style={s.refetchText}>جارٍ التحديث…</Text>
        </View>
      ) : null}
    </SafeAreaView>
  )
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.background },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 2 },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: t.foreground,
  },
  sub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: t.mutedFg,
  },
  chips: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  list: { padding: 16, paddingTop: 8, gap: 10, paddingBottom: 32 },
  card: {
    backgroundColor: t.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    padding: 14,
    gap: 8,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  number: {
    fontFamily: fonts.mono,
    fontSize: 14,
    color: t.foreground,
    flexShrink: 1,
  },
  customer: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: t.mutedFg,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.mutedFg,
    flexShrink: 1,
  },
  total: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: t.ring,
  },
  refetchBar: { paddingVertical: 6, alignItems: 'center' },
  refetchText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.mutedFg,
  },
})
