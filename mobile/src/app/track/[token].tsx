/**
 * Smart Order Mobile — تتبّع الطلب برابطه الخاص.
 *
 * نفس عقد صفحة الويب /track/[token]: شريط حالات (NEW→…→DELIVERED)،
 * أسطر الطلب، المجاميع، وسجل الحركة — مع تحديث كل 15 ثانية (يقف
 * عند الحالات النهائية). وصول «fresh=1» يعرض بانر نجاح الطلب
 * (الاحتفال لحظة الإرسال).
 */
import React from 'react'
import { Image } from 'expo-image'
import { useLocalSearchParams } from 'expo-router'
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { t } from '@/constants/theme'
import { trackOrder } from '@/services/storefront'
import { formatLyd } from '@/lib/money'
import { CheckCircleIcon, ClockIcon } from '@/components/icons'
import { Button, Hairline, StatusStamp } from '@/components/ui'
import { ErrorState, LoadingState } from '@/components/state-views'
import {
  FULFILLMENT_AR,
  ORDER_STATUS_AR,
  type OrderStatus,
  type TrackedOrder,
} from '@/types/storefront'

/** تسلسل الشريط — نفس عقد واجهة الويب. */
const FLOW: OrderStatus[] = [
  'NEW',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
]
const TERMINAL: OrderStatus[] = ['DELIVERED', 'CANCELLED', 'REJECTED']

function flowIndex(status: OrderStatus): number {
  const i = FLOW.indexOf(status)
  return i === -1 ? FLOW.length : i
}

export default function TrackScreen() {
  const params = useLocalSearchParams<{ token: string; fresh?: string }>()
  const token = typeof params.token === 'string' ? params.token : ''
  const fresh = params.fresh === '1'

  const query = useQuery({
    queryKey: ['track', token],
    queryFn: () => trackOrder(token),
    enabled: token.length > 0,
    refetchInterval: (q) => {
      const status = q.state.data?.order.status
      return status && TERMINAL.includes(status) ? false : 15_000
    },
  })

  if (query.isLoading) return <LoadingState label="جارٍ فتح الطلب…" />
  if (query.isError)
    return (
      <ErrorState
        message={query.error instanceof Error ? query.error.message : undefined}
        onRetry={() => query.refetch()}
      />
    )

  const order: TrackedOrder | undefined = query.data?.order
  if (!order) return <ErrorState message="الطلب غير موجود" />

  const idx = flowIndex(order.status)
  const broken = order.status === 'CANCELLED' || order.status === 'REJECTED'

  const whatsapp = order.business.whatsappNumber
    ? `https://wa.me/${order.business.whatsappNumber.replace(/[^\d]/g, '')}`
    : null

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* بانر النجاح (وصول fresh) */}
        {fresh ? (
          <View style={s.successBanner}>
            <CheckCircleIcon size={28} color={t.success} />
            <View style={s.successText}>
              <Text style={s.successTitle}>تم إرسال طلبك ✓</Text>
              <Text style={s.successHint}>
                سيتواصل معك المتجر للتأكيد — وهذه صفحتك الحيّة، احتفظ بها لتتابع الطلب.
              </Text>
            </View>
          </View>
        ) : null}

        {/* ترويسة الطلب */}
        <View style={s.card}>
          <View style={s.orderHeader}>
            <View style={s.orderHeaderText}>
              <Text style={s.businessName}>{order.business.name}</Text>
              <Text style={s.orderNumber}>{order.orderNumber}</Text>
              <Text style={s.meta}>
                {FULFILLMENT_AR[order.fulfillmentType]} ·{' '}
                {new Date(order.createdAt).toLocaleDateString('ar-LY', {
                  day: 'numeric',
                  month: 'long',
                })}
              </Text>
            </View>
            {order.business.logoUrl ? (
              <Image source={{ uri: order.business.logoUrl }} style={s.logo} contentFit="cover" />
            ) : null}
          </View>
          <StatusStamp status={order.status} />
        </View>

        {/* شريط الحالة */}
        {!broken ? (
          <View style={s.card}>
            <View style={s.flowRow}>
              {FLOW.map((st, i) => {
                const done = i <= idx
                return (
                  <View key={st} style={s.flowStep}>
                    <View style={[s.flowDot, done && s.flowDotDone]} />
                    {i < FLOW.length - 1 ? (
                      <View style={[s.flowBar, i < idx && s.flowBarDone]} />
                    ) : null}
                  </View>
                )
              })}
            </View>
            <View style={s.flowLabels}>
              {FLOW.map((st, i) => (
                <Text key={st} style={[s.flowLabel, i === idx && s.flowLabelActive]} numberOfLines={1}>
                  {ORDER_STATUS_AR[st]}
                </Text>
              ))}
            </View>
          </View>
        ) : (
          <View style={[s.card, s.brokenCard]}>
            <Text style={s.brokenText}>
              {order.status === 'CANCELLED' ? 'أُلغي هذا الطلب' : 'رفض المتجر هذا الطلب'}
            </Text>
          </View>
        )}

        {/* الأسطر */}
        <View style={s.card}>
          <Text style={s.cardTitle}>أصناف الطلب</Text>
          {order.items.map((item, i) => (
            <View key={`${item.productName}-${i}`}>
              {i > 0 ? <Hairline /> : null}
              <View style={s.itemRow}>
                <View style={s.itemText}>
                  <Text style={s.itemName}>
                    {item.productName}
                    {item.variantName ? ` — ${item.variantName}` : ''}
                  </Text>
                  {item.options.length > 0 ? (
                    <Text style={s.itemOptions}>{item.options.join(' · ')}</Text>
                  ) : null}
                </View>
                <Text style={s.itemQty}>×{item.quantity}</Text>
                <Text style={s.itemTotal}>{formatLyd(item.lineTotal)}</Text>
              </View>
            </View>
          ))}
          <View style={s.totalsBox}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>الإجمالي الفرعي</Text>
              <Text style={s.totalValue}>{formatLyd(order.subtotal)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>رسوم التوصيل</Text>
              <Text style={s.totalValue}>
                {order.fulfillmentType === 'PICKUP' ? '—' : formatLyd(order.deliveryFee)}
              </Text>
            </View>
            <Hairline />
            <View style={s.totalRow}>
              <Text style={s.grandLabel}>الإجمالي</Text>
              <Text style={s.grandValue}>{formatLyd(order.total)}</Text>
            </View>
          </View>
        </View>

        {/* سجل الحركة */}
        {order.history.length > 0 ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>سجل الطلب</Text>
            {order.history.map((h, i) => (
              <View key={`${h.toStatus}-${i}`} style={s.historyRow}>
                <ClockIcon size={15} color={t.mutedFg} />
                <Text style={s.historyText}>{ORDER_STATUS_AR[h.toStatus]}</Text>
                <Text style={s.historyTime}>
                  {new Date(h.createdAt).toLocaleTimeString('ar-LY', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* تواصل */}
      <View style={s.footer}>
        {whatsapp ? (
          <Button
            label="واتساب المتجر"
            variant="outline"
            onPress={() => Linking.openURL(whatsapp).catch(() => undefined)}
            style={s.waBtn}
          />
        ) : null}
        {order.business.phone ? (
          <Button
            label="اتصال"
            variant="ghost"
            onPress={() => Linking.openURL(`tel:${order.business.phone}`).catch(() => undefined)}
            style={s.callBtn}
          />
        ) : null}
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.background },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },
  successBanner: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: '#DCF0E4',
    borderWidth: 1,
    borderColor: '#1E7A4659',
    borderRadius: 14,
    padding: 16,
  },
  successText: { flex: 1, gap: 3 },
  successTitle: {
    fontFamily: 'IBMPlexSansArabic_700Bold',
    fontSize: 15,
    color: '#14522D',
  },
  successHint: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 12.5,
    color: '#1E7A46',
    lineHeight: 19,
  },
  card: {
    backgroundColor: t.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    padding: 16,
    gap: 12,
  },
  orderHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  orderHeaderText: { flex: 1, gap: 2 },
  businessName: {
    fontFamily: 'IBMPlexSansArabic_700Bold',
    fontSize: 16,
    color: t.foreground,
  },
  orderNumber: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 13,
    color: t.primary,
  },
  meta: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 12,
    color: t.mutedFg,
  },
  logo: { width: 48, height: 48, borderRadius: 12, backgroundColor: t.goldSoft },
  flowRow: { flexDirection: 'row', alignItems: 'center' },
  flowStep: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  flowDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  flowDotDone: { borderColor: t.primary, backgroundColor: t.primary },
  flowBar: { flex: 1, height: 2, backgroundColor: t.border },
  flowBarDone: { backgroundColor: t.primary },
  flowLabels: { flexDirection: 'row', marginTop: 6 },
  flowLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 10,
    color: t.mutedFg,
  },
  flowLabelActive: { color: t.primary, fontFamily: 'IBMPlexSansArabic_600SemiBold' },
  brokenCard: { backgroundColor: '#FBE3E6', borderColor: '#C4384A59' },
  brokenText: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 14,
    color: '#8C2733',
    textAlign: 'center',
  },
  cardTitle: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 15,
    color: t.foreground,
  },
  itemRow: { flexDirection: 'row', gap: 10, paddingVertical: 8, alignItems: 'center' },
  itemText: { flex: 1, gap: 2 },
  itemName: {
    fontFamily: 'IBMPlexSansArabic_500Medium',
    fontSize: 14,
    color: t.foreground,
  },
  itemOptions: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 11.5,
    color: t.mutedFg,
  },
  itemQty: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 12,
    color: t.mutedFg,
  },
  itemTotal: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 13,
    color: t.foreground,
    minWidth: 70,
    textAlign: 'left',
  },
  totalsBox: { gap: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 13,
    color: t.mutedFg,
  },
  totalValue: {
    fontFamily: 'IBMPlexSansArabic_500Medium',
    fontSize: 13,
    color: t.foreground,
  },
  grandLabel: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 15,
    color: t.foreground,
  },
  grandValue: {
    fontFamily: 'IBMPlexSansArabic_700Bold',
    fontSize: 15,
    color: t.primary,
  },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  historyText: {
    flex: 1,
    fontFamily: 'IBMPlexSansArabic_500Medium',
    fontSize: 13,
    color: t.foreground,
  },
  historyTime: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 11,
    color: t.mutedFg,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    backgroundColor: t.card,
    borderTopWidth: 1,
    borderTopColor: t.border,
    alignItems: 'center',
  },
  waBtn: { flex: 1 },
  callBtn: { flex: 1 },
})
