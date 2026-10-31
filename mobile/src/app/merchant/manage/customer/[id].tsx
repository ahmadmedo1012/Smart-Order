/**
 * Smart Order Mobile — ملف العميل (C2-REST، M4).
 *
 * GET /api/customers/[id]?businessId — بطاقة العميل كاملة: الإحصاء
 * (عدد الطلبات، إجمالي المدفوع، متوسط الطلب — مليم صحيح)، الملاحظات،
 * العناوين المحفوظة، وسجل آخر 100 طلب مع الحالة والدفع، وكل طلب
 * يفتح تفاصيله في صندوق الطلبات مباشرة. قراءة فقط — تحرير بيانات
 * العميل يبقى لواجهة الويب (customers.manage).
 */
import React, { useMemo } from 'react'
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { fonts, type ThemeColors } from '@/constants/theme'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuthStore } from '@/state/auth'
import { fetchCustomerDetail } from '@/services/merchant'
import { formatNumber } from '@/lib/money'
import { formatMillimes } from '@/lib/money-millimes'
import { formatArabicDate, formatArabicDateTime } from '@/lib/datetime'
import { PAYMENT_STATUS_AR, type PaymentStatus } from '@/types/merchant'
import { Hairline, MiniStamp, StatusStamp } from '@/components/ui'
import { ErrorState, LoadingState } from '@/components/state-views'
import { MapPinIcon, PhoneIcon } from '@/components/icons'

function KpiCard({ label, value }: { label: string; value: string }) {
  const { t } = useTheme()
  const s = makeStyles(t)

  return (
    <View style={s.kpi}>
      <Text style={s.kpiValue}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
  )
}

export default function ManageCustomerDetailScreen() {
  const { t } = useTheme()
  const s = makeStyles(t)

  const params = useLocalSearchParams<{ id: string }>()
  const id = typeof params.id === 'string' ? params.id : ''
  const businessId = useAuthStore((s) => s.selectedBusinessId)
  const membership = useAuthStore((s) => s.memberships.find((m) => m.businessId === s.selectedBusinessId))
  const canRead = useMemo(() => (membership?.permissions ?? []).includes('customers.read'), [membership])

  const query = useQuery({
    queryKey: ['merchant', 'customer', businessId, id],
    queryFn: () => fetchCustomerDetail(id, businessId as string),
    enabled: !!businessId && canRead && !!id,
  })
  const customer = query.data?.customer

  function paymentFamily(status: PaymentStatus): 'mint' | 'yellow' | 'grey' {
    return status === 'PAID' ? 'mint' : status === 'UNPAID' ? 'yellow' : 'grey'
  }

  if (!canRead) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <ErrorState message="هذه الشاشة تتطلب صلاحية الاطلاع على العملاء" />
      </SafeAreaView>
    )
  }

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
        <Text style={s.title}>ملف العميل</Text>

        {query.isPending ? (
          <LoadingState label="جارٍ تحميل ملف العميل…" />
        ) : query.isError || !customer ? (
          <ErrorState
            message="تعذر تحميل ملف العميل — ربما حُذف أو تحقق من الإنترنت وحاول مجددًا"
            onRetry={() => {
              void query.refetch()
            }}
          />
        ) : (
          <>
            {/* بطاقة العميل */}
            <View style={s.card}>
              <View style={s.profileRow}>
                <View style={s.profileText}>
                  <Text style={s.name}>{customer.name}</Text>
                  <Text style={s.phone}>{customer.phone}</Text>
                  <Text style={s.meta}>عميل منذ {formatArabicDate(customer.createdAt)}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`اتصال بـ ${customer.name}`}
                  onPress={() => {
                    Linking.openURL(`tel:${customer.phone}`).catch(() => undefined)
                  }}
                  style={({ pressed }) => [s.callBtn, pressed && { opacity: 0.7 }]}
                >
                  <PhoneIcon size={17} color={t.primary} />
                  <Text style={s.callText}>اتصال</Text>
                </Pressable>
              </View>
              {customer.notes ? (
                <>
                  <Hairline />
                  <View style={s.notesWrap}>
                    <Text style={s.notesLabel}>ملاحظات</Text>
                    <Text style={s.notesText}>{customer.notes}</Text>
                  </View>
                </>
              ) : null}
            </View>

            {/* الإحصاء */}
            <View style={s.kpiGrid}>
              <KpiCard label="الطلبات" value={formatNumber(customer.stats.orderCount)} />
              <KpiCard label="إجمالي المدفوع (المسلَّمة)" value={formatMillimes(customer.stats.totalSpent)} />
              <KpiCard label="متوسط الطلب" value={formatMillimes(customer.stats.avgOrder)} />
            </View>

            {/* العناوين */}
            <View style={s.card}>
              <Text style={s.cardTitle}>العناوين المحفوظة</Text>
              {customer.addresses.length === 0 ? (
                <Text style={s.hint}>لا عناوين محفوظة لهذا العميل</Text>
              ) : (
                customer.addresses.map((a, i) => (
                  <View key={a.id}>
                    {i > 0 ? <Hairline /> : null}
                    <View style={s.addressRow}>
                      <MapPinIcon size={16} color={t.mutedFg} />
                      <View style={s.addressText}>
                        <View style={s.addressTitleWrap}>
                          <Text style={s.addressTitle}>{a.label ? a.label : 'عنوان'}</Text>
                          {a.isDefault ? <MiniStamp text="افتراضي" family="mint" /> : null}
                        </View>
                        <Text style={s.addressLine} numberOfLines={2}>
                          {[a.city, a.area, a.addressLine].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* سجل الطلبات */}
            <View style={s.card}>
              <Text style={s.cardTitle}>سجل الطلبات</Text>
              {customer.orders.length === 0 ? (
                <Text style={s.hint}>لا طلبات بعد لهذا العميل</Text>
              ) : (
                customer.orders.map((o, i) => (
                  <View key={o.id}>
                    {i > 0 ? <Hairline /> : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`تفاصيل الطلب ${o.orderNumber}`}
                      onPress={() => {
                        router.push({ pathname: '/merchant/order/[id]', params: { id: o.id } })
                      }}
                      style={({ pressed }) => [s.orderRow, pressed && { opacity: 0.7 }]}
                    >
                      <View style={s.orderRowTop}>
                        <Text style={s.orderNumber}>{o.orderNumber}</Text>
                        <Text style={s.orderTotal}>{formatMillimes(o.total)}</Text>
                      </View>
                      <View style={s.orderRowMid}>
                        <StatusStamp status={o.status} size="sm" />
                        <MiniStamp text={PAYMENT_STATUS_AR[o.paymentStatus]} family={paymentFamily(o.paymentStatus)} />
                      </View>
                      <Text style={s.orderDate}>{formatArabicDateTime(o.createdAt)}</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </View>

            {customer.orders.length >= 100 ? (
              <Text style={s.footHint}>آخر 100 طلب — السجل الكامل في لوحة الويب</Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
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
    paddingBottom: 2,
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
    fontFamily: fonts.bold,
    fontSize: 15,
    color: t.foreground,
  },
  profileRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  profileText: { flex: 1, gap: 3 },
  name: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: t.foreground,
  },
  phone: {
    fontFamily: fonts.mono,
    fontSize: 14,
    color: t.ring,
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.mutedFg,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: t.primary,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 14,
    minHeight: 42,
  },
  callText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: t.primary,
  },
  notesWrap: { gap: 4 },
  notesLabel: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: t.mutedFg,
  },
  notesText: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    color: t.foreground,
    lineHeight: 21,
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
    fontFamily: fonts.bold,
    fontSize: 17,
    color: t.ring,
  },
  kpiLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.mutedFg,
    lineHeight: 17,
  },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 4 },
  addressText: { flex: 1, gap: 3 },
  addressTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  addressTitle: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: t.foreground,
  },
  addressLine: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: t.mutedFg,
    lineHeight: 19,
  },
  orderRow: { gap: 5, paddingVertical: 6 },
  orderRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  orderNumber: {
    fontFamily: fonts.mono,
    fontSize: 14,
    color: t.foreground,
  },
  orderTotal: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: t.ring,
  },
  orderRowMid: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  orderDate: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: t.mutedFg,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: t.mutedFg,
    textAlign: 'center',
  },
  footHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.mutedFg,
    textAlign: 'center',
    lineHeight: 18,
  },
})
