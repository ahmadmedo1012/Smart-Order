/**
 * Smart Order Mobile — تفاصيل طلب التاجر (P36 Phase C).
 *
 * GET /api/orders/[id]?businessId — الأصناف بمُعدِّلاتها، بيانات
 * العميل والتوصيل، طريقة الدفع وحالتها، وخط زمن الحالة. أزرار
 * الانتقال من آلة الخادم نفسها (order-machine) مع بوابة الصلاحيات
 * (orders.update للتحديث وorders.cancel للإلغاء/الرفض) — الخادم
 * يفرض الاثنين، والواجهة لا تعرض زرًا ميتًا. أثناء أي تعديل تُقفل
 * الأزرار كلها، وبعده يُحدَّث الطلب والصندوق معًا.
 */
import React, { useMemo } from 'react'
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fonts, type ThemeColors } from '@/constants/theme'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuthStore } from '@/state/auth'
import { fetchOrderDetail, patchOrderStatus, ApiError, NetworkError } from '@/services/merchant'
import { getAllowedTransitions, type TransitionRule } from '@/lib/order-machine'
import { formatArabicDateTime, statusAr } from '@/lib/datetime'
import { formatMillimes } from '@/lib/money-millimes'
import {
  PAYMENT_STATUS_AR,
  PAYMENT_TYPE_AR,
  type MerchantOrderItem,
  type OrderItemOptionSnapshot,
} from '@/types/merchant'
import { FULFILLMENT_AR, type OrderStatus } from '@/types/storefront'
import { Button, Hairline, StatusStamp } from '@/components/ui'
import { ErrorState, LoadingState } from '@/components/state-views'
import { MapPinIcon, PhoneIcon } from '@/components/icons'

/** فك لقطة الإضافات — فشل التفكيك يعرض السطر بلا إضافات. */
function parseOptions(item: MerchantOrderItem): string[] {
  if (!item.optionsJson) return []
  try {
    const parsed = JSON.parse(item.optionsJson)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (x): x is OrderItemOptionSnapshot =>
          typeof x === 'object' && x !== null && typeof (x as OrderItemOptionSnapshot).name === 'string',
      )
      .map((x) => x.name)
  } catch {
    return []
  }
}

function PaymentStamp({ status }: { status: 'UNPAID' | 'PAID' | 'REFUNDED' }) {
  const { t, statusFamily } = useTheme()
  const s = makeStyles(t)

  const fam = status === 'PAID' ? statusFamily.mint : status === 'REFUNDED' ? statusFamily.rose : statusFamily.grey
  return (
    <View style={[s.stamp, { backgroundColor: fam.bg, borderColor: `${fam.ink}59` }]}>
      <Text style={[s.stampText, { color: fam.deep }]}>{PAYMENT_STATUS_AR[status]}</Text>
    </View>
  )
}

export default function MerchantOrderDetailScreen() {
  const { t, statusFamily } = useTheme()
  const s = makeStyles(t)

  const params = useLocalSearchParams<{ id: string }>()
  const id = typeof params.id === 'string' ? params.id : ''
  const businessId = useAuthStore((s) => s.selectedBusinessId)
  const membership = useAuthStore((s) => s.memberships.find((m) => m.businessId === s.selectedBusinessId))
  const perms = useMemo(() => membership?.permissions ?? [], [membership])

  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['merchant', 'order', id],
    queryFn: () => fetchOrderDetail(id, businessId as string),
    enabled: !!id && !!businessId,
  })
  const order = query.data?.order

  const mutation = useMutation({
    mutationFn: (status: OrderStatus) => patchOrderStatus(id, businessId as string, status),
    onSuccess: async () => {
      // الطلب + الصندوق + لوحة القيادة — الكل يرى الحالة الجديدة.
      await queryClient.invalidateQueries({ queryKey: ['merchant'] })
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof NetworkError
            ? 'تعذر الاتصال بالخادم — تحقق من الإنترنت وحاول مجددًا'
            : 'تعذّر تحديث الحالة — حاول بعد قليل'
      Alert.alert('تعذّر التحديث', msg)
    },
  })

  /** أزرار الانتقال المسموحة — آلة الخادم + صلاحيات العضوية. */
  const actions = useMemo(() => {
    if (!order) return []
    return getAllowedTransitions(order.status, order.fulfillmentType).filter((r) =>
      r.destructive ? perms.includes('orders.cancel') : perms.includes('orders.update'),
    )
  }, [order, perms])

  const fire = (rule: TransitionRule) => {
    if (mutation.isPending) return
    const run = () => mutation.mutate(rule.to)
    if (rule.destructive) {
      Alert.alert(rule.label, 'هذا الإجراء لا يمكن التراجع عنه — هل أنت متأكد؟', [
        { text: 'إلغاء', style: 'cancel' },
        { text: rule.label, style: 'destructive', onPress: run },
      ])
    } else {
      run()
    }
  }

  if (!order) {
    if (query.isError) {
      return (
        <ErrorState
          message="تعذر تحميل الطلب — تحقق من الإنترنت وحاول مجددًا"
          onRetry={() => {
            void query.refetch()
          }}
        />
      )
    }
    return <LoadingState label="جارٍ تحميل الطلب…" />
  }

  const isDelivery = order.fulfillmentType === 'DELIVERY'
  const nonDestructive = actions.filter((a) => !a.destructive)
  const destructive = actions.filter((a) => a.destructive)

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
        {/* شريط الرجوع */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="رجوع إلى الطلبات"
          onPress={() => router.back()}
          style={({ pressed }) => [s.backRow, pressed && { opacity: 0.6 }]}
        >
          <Text style={s.backText}>رجوع</Text>
          <Text style={s.backChevron}>‹</Text>
        </Pressable>

        {/* بطاقة الترويسة */}
        <View style={s.card}>
          <View style={s.heroTop}>
            <Text style={s.orderNumber}>{order.orderNumber}</Text>
            <StatusStamp status={order.status} />
          </View>
          <Text style={s.heroTime}>{formatArabicDateTime(order.createdAt)}</Text>
          <View style={s.heroChips}>
            <View style={[s.heroChip, { backgroundColor: t.surface }]}>
              <Text style={s.heroChipText}>{FULFILLMENT_AR[order.fulfillmentType]}</Text>
            </View>
            <PaymentStamp status={order.paymentStatus} />
            {order.customerConfirmedAt ? (
              <View style={[s.heroChip, { backgroundColor: statusFamily.mint.bg }]}>
                <Text style={[s.heroChipText, { color: statusFamily.mint.deep }]}>أكد العميل طلبه</Text>
              </View>
            ) : null}
          </View>
          <Hairline />
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>الإجمالي</Text>
            <Text style={s.totalValue}>{formatMillimes(order.total)}</Text>
          </View>
        </View>

        {/* أزرار الانتقال */}
        {actions.length > 0 ? (
          <View style={[s.card, s.actionsCard]}>
            <Text style={s.cardTitle}>إجراءات الطلب</Text>
            <View style={s.actionRow}>
              {nonDestructive.map((a) => (
                <Button
                  key={a.to}
                  label={a.label}
                  onPress={() => fire(a)}
                  disabled={mutation.isPending}
                  style={s.actionBtn}
                />
              ))}
            </View>
            {destructive.map((a) => (
              <Pressable
                key={a.to}
                accessibilityRole="button"
                accessibilityLabel={a.label}
                disabled={mutation.isPending}
                onPress={() => fire(a)}
                style={({ pressed }) => [
                  s.destructiveBtn,
                  (mutation.isPending || pressed) && { opacity: mutation.isPending ? 0.45 : 0.75 },
                ]}
              >
                <Text style={s.destructiveText}>{a.label}</Text>
              </Pressable>
            ))}
            {mutation.isPending ? <Text style={s.mutatingHint}>جارٍ تحديث الحالة…</Text> : null}
          </View>
        ) : null}

        {/* الأصناف */}
        <View style={s.card}>
          <Text style={s.cardTitle}>الأصناف</Text>
          {order.items.map((item, i) => {
            const optNames = parseOptions(item)
            return (
              <View key={item.id}>
                {i > 0 ? <Hairline /> : null}
                <View style={s.itemRow}>
                  <View style={s.itemText}>
                    <Text style={s.itemName}>
                      {item.productName}
                      {item.variantName ? ` — ${item.variantName}` : ''}
                    </Text>
                    {optNames.length > 0 ? <Text style={s.itemMeta}>{optNames.join(' · ')}</Text> : null}
                    {item.note ? <Text style={s.itemMeta}>ملاحظة: {item.note}</Text> : null}
                    <Text style={s.itemMeta}>الكمية: {item.quantity}</Text>
                  </View>
                  <Text style={s.itemTotal}>{formatMillimes(item.lineTotal)}</Text>
                </View>
              </View>
            )
          })}
          <View style={s.totalsBox}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>الإجمالي الفرعي</Text>
              <Text style={s.totalLabel}>{formatMillimes(order.subtotal)}</Text>
            </View>
            {isDelivery ? (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>رسوم التوصيل</Text>
                <Text style={s.totalLabel}>{formatMillimes(order.deliveryFee)}</Text>
              </View>
            ) : null}
            {order.discount > 0 ? (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>الخصم</Text>
                <Text style={s.totalLabel}>-{formatMillimes(order.discount)}</Text>
              </View>
            ) : null}
            <Hairline />
            <View style={s.totalRow}>
              <Text style={s.grandLabel}>الإجمالي</Text>
              <Text style={s.grandValue}>{formatMillimes(order.total)}</Text>
            </View>
          </View>
        </View>

        {/* العميل */}
        <View style={s.card}>
          <Text style={s.cardTitle}>العميل</Text>
          <View style={s.infoRow}>
            <View style={s.infoText}>
              <Text style={s.infoValue}>{order.customerName}</Text>
              <Text style={s.infoMeta}>{order.customerPhone}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`اتصال بـ ${order.customerName}`}
              onPress={() => {
                Linking.openURL(`tel:${order.customerPhone}`).catch(() => undefined)
              }}
              style={({ pressed }) => [s.callBtn, pressed && { opacity: 0.7 }]}
            >
              <PhoneIcon size={18} color={t.primary} />
              <Text style={s.callText}>اتصال</Text>
            </Pressable>
          </View>
          {order.customerNote ? <Text style={s.note}>ملاحظة العميل: {order.customerNote}</Text> : null}
          {order.internalNote ? <Text style={s.note}>ملاحظة داخلية: {order.internalNote}</Text> : null}
        </View>

        {/* التوصيل */}
        <View style={s.card}>
          <Text style={s.cardTitle}>{isDelivery ? 'التوصيل' : 'الاستلام'}</Text>
          {isDelivery ? (
            <View style={s.infoRow}>
              <MapPinIcon size={18} color={t.mutedFg} />
              <View style={s.infoText}>
                <Text style={s.infoValue}>
                  {[order.city, order.area].filter(Boolean).join(' — ') || 'بلا عنوان'}
                </Text>
                <Text style={s.infoMeta}>{order.addressLine ?? ''}</Text>
              </View>
            </View>
          ) : (
            <Text style={s.infoMeta}>يستلم العميل من الفرع مباشرة</Text>
          )}
        </View>

        {/* الدفع */}
        <View style={s.card}>
          <Text style={s.cardTitle}>الدفع</Text>
          <View style={s.infoRow}>
            <View style={s.infoText}>
              <Text style={s.infoValue}>
                {order.paymentMethodName ?? (order.paymentType ? PAYMENT_TYPE_AR[order.paymentType] ?? order.paymentType : 'غير محددة')}
              </Text>
              <Text style={s.infoMeta}>
                {PAYMENT_STATUS_AR[order.paymentStatus]}
              </Text>
            </View>
            <PaymentStamp status={order.paymentStatus} />
          </View>
        </View>

        {/* خط زمن الحالة */}
        <View style={s.card}>
          <Text style={s.cardTitle}>سجل الحالة</Text>
          {order.history
            .slice()
            .reverse()
            .map((h, i) => (
              <View key={h.id} style={s.timelineRow}>
                <View style={[s.timelineDot, { backgroundColor: i === 0 ? t.primary : t.border }]} />
                <View style={s.timelineText}>
                  <Text style={s.timelineTitle}>
                    {h.fromStatus ? `${statusAr(h.fromStatus)} ← ${statusAr(h.toStatus)}` : statusAr(h.toStatus)}
                  </Text>
                  {h.note ? <Text style={s.timelineNote}>{h.note}</Text> : null}
                  <Text style={s.timelineMeta}>
                    {h.changedByName ? `${h.changedByName} · ` : ''}
                    {formatArabicDateTime(h.createdAt)}
                  </Text>
                </View>
              </View>
            ))}
          {order.history.length === 0 ? (
            <Text style={s.infoMeta}>لا يوجد سجل بعد</Text>
          ) : null}
        </View>
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
  card: {
    backgroundColor: t.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: t.foreground,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  orderNumber: {
    fontFamily: fonts.mono,
    fontSize: 17,
    color: t.foreground,
    flexShrink: 1,
  },
  heroTime: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: t.mutedFg,
  },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heroChip: { borderRadius: 6, borderWidth: 1, borderColor: t.border, paddingVertical: 3, paddingHorizontal: 8 },
  heroChipText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 16,
    color: t.mutedFg,
  },
  stamp: { borderRadius: 6, borderWidth: 1, paddingVertical: 3, paddingHorizontal: 8, alignSelf: 'flex-start' },
  stampText: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 16 },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  totalLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: t.mutedFg,
  },
  totalValue: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: t.ring,
  },
  grandLabel: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: t.foreground,
  },
  grandValue: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: t.ring,
  },
  actionsCard: { gap: 10 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { minHeight: 46, paddingHorizontal: 18, paddingVertical: 10 },
  destructiveBtn: {
    borderWidth: 1,
    borderColor: t.destructive,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 20,
    alignItems: 'center',
    minHeight: 46,
    justifyContent: 'center',
  },
  destructiveText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: t.destructive,
  },
  mutatingHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.mutedFg,
    textAlign: 'center',
  },
  itemRow: { flexDirection: 'row', gap: 10, paddingVertical: 10 },
  itemText: { flex: 1, gap: 3 },
  itemName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: t.foreground,
  },
  itemMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.mutedFg,
    lineHeight: 18,
  },
  itemTotal: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: t.ring,
  },
  totalsBox: { backgroundColor: t.background, borderRadius: 10, padding: 12, gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { flex: 1, gap: 2 },
  infoValue: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: t.foreground,
  },
  infoMeta: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: t.mutedFg,
    lineHeight: 19,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: t.primary,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  callText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: t.primary,
  },
  note: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: t.mutedFg,
    lineHeight: 19,
    backgroundColor: t.background,
    borderRadius: 8,
    padding: 10,
  },
  timelineRow: { flexDirection: 'row', gap: 10 },
  timelineDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  timelineText: { flex: 1, gap: 2, paddingBottom: 10 },
  timelineTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: t.foreground,
  },
  timelineNote: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.mutedFg,
    lineHeight: 18,
  },
  timelineMeta: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: t.mutedFg,
  },
})
