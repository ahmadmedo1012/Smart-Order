/**
 * Smart Order Mobile — السلة وإتمام الطلب.
 *
 * نفس عقد checkout للويب: بيانات العميل، توصيل (منطقة/عنوان) أو
 * استلام، طريقة دفع من قائمة المتجر، وملاحظة. الإرسال بمفتاح
 * idempotency (UUID لكل محاولة إرسال — النقر المزدوج لا يكرر
 * الطلب أبدًا). الخادم يعيد التسعير دائمًا؛ القيم هنا للعرض فقط.
 */
import React, { useMemo, useState } from 'react'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { t } from '@/constants/theme'
import { createOrder, fetchStorefront, ApiError, NetworkError } from '@/services/storefront'
import { useCart, zoneById } from '@/state/cart'
import { belowMinOrder, cartTotals } from '@/state/pricing'
import { formatLyd } from '@/lib/money'
import { randomUUID } from '@/lib/uuid'
import { MinusIcon, PlusIcon } from '@/components/icons'
import { Button, Field, Hairline } from '@/components/ui'
import { ErrorState, LoadingState } from '@/components/state-views'
import type { FulfillmentType } from '@/types/storefront'

export default function CartScreen() {
  const params = useLocalSearchParams<{ slug: string }>()
  const slug = typeof params.slug === 'string' ? params.slug : ''

  const query = useQuery({
    queryKey: ['storefront', slug],
    queryFn: () => fetchStorefront(slug),
    enabled: slug.length > 0,
  })
  const data = query.data

  const cart = useCart()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [area, setArea] = useState('')
  const [addressLine, setAddressLine] = useState('')
  const [customerNote, setCustomerNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [touched, setTouched] = useState(false)

  const zone = zoneById(data?.deliveryZones ?? [], cart.zoneId)
  const totals = useMemo(
    () => cartTotals(cart.lines, cart.fulfillment, zone),
    [cart.lines, cart.fulfillment, zone],
  )
  const minOrderBlocked = belowMinOrder(totals.subtotal, cart.fulfillment, zone)

  if (query.isLoading) return <LoadingState label="جارٍ تجهيز السلة…" />
  if (query.isError)
    return (
      <ErrorState
        message={query.error instanceof Error ? query.error.message : undefined}
        onRetry={() => query.refetch()}
      />
    )

  const nameError = touched && name.trim().length < 2 ? 'أدخل اسمك (حرفان على الأقل)' : null
  const phoneError =
    touched && phone.replace(/\D/g, '').length < 7 ? 'أدخل رقم هاتف صحيح (مثال: 0912345678)' : null
  const addressError =
    touched && cart.fulfillment === 'DELIVERY' && addressLine.trim().length < 4
      ? 'أدخل عنوان التوصيل'
      : null

  const canSubmit =
    cart.lines.length > 0 &&
    !minOrderBlocked &&
    name.trim().length >= 2 &&
    phone.replace(/\D/g, '').length >= 7 &&
    (cart.fulfillment === 'PICKUP' || addressLine.trim().length >= 4) &&
    (cart.fulfillment === 'PICKUP' || !!cart.zoneId) &&
    !submitting

  const submit = async () => {
    setTouched(true)
    if (!canSubmit || !data) return
    setSubmitting(true)
    try {
      const res = await createOrder({
        slug,
        idempotencyKey: randomUUID(),
        fulfillmentType: cart.fulfillment,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        city: data.business.city ?? '',
        area: area.trim(),
        addressLine: addressLine.trim(),
        customerNote: customerNote.trim(),
        deliveryZoneId: cart.fulfillment === 'DELIVERY' ? cart.zoneId : null,
        paymentMethodId: null,
        items: cart.lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          optionIds: l.optionIds,
          quantity: l.quantity,
          note: l.note,
        })),
      })
      cart.clear()
      router.replace({
        pathname: '/track/[token]',
        params: { token: res.order.publicToken, fresh: '1' },
      })
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof NetworkError
            ? 'تعذر إرسال الطلب — تحقق من الإنترنت وحاول مجددًا'
            : 'تعذر إرسال الطلب — حاول بعد قليل'
      Alert.alert('لم يُرسل الطلب', msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* أسطر السلة */}
          <View style={s.card}>
            <Text style={s.cardTitle}>سلة الطلب — {cart.businessName ?? ''}</Text>
            {cart.lines.map((l, i) => (
              <View key={l.key}>
                {i > 0 ? <Hairline /> : null}
                <View style={s.lineRow}>
                  {l.imageUrl ? (
                    <Image source={{ uri: l.imageUrl }} style={s.lineImage} contentFit="cover" />
                  ) : (
                    <View style={[s.lineImage, s.lineImageFallback]}>
                      <Text style={s.lineImageText}>{l.productName.slice(0, 1)}</Text>
                    </View>
                  )}
                  <View style={s.lineText}>
                    <Text style={s.lineName}>
                      {l.productName}
                      {l.variantName ? ` — ${l.variantName}` : ''}
                    </Text>
                    {l.optionNames.length > 0 ? (
                      <Text style={s.lineOptions}>{l.optionNames.join(' · ')}</Text>
                    ) : null}
                    {l.note ? <Text style={s.lineOptions}>ملاحظة: {l.note}</Text> : null}
                    <Text style={s.linePrice}>{formatLyd(l.lineTotal)}</Text>
                  </View>
                  <View style={s.qtyCol}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`زيادة كمية ${l.productName}`}
                      onPress={() => cart.setQuantity(l.key, l.quantity + 1)}
                      style={s.qtyBtn}
                    >
                      <PlusIcon size={15} color={t.primary} />
                    </Pressable>
                    <Text style={s.qtyText}>{l.quantity}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`إنقاص كمية ${l.productName}`}
                      onPress={() => cart.setQuantity(l.key, l.quantity - 1)}
                      style={s.qtyBtn}
                    >
                      <MinusIcon size={15} color={t.primary} />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
            <View style={s.totalsBox}>
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>الإجمالي الفرعي</Text>
                <Text style={s.totalValue}>{formatLyd(totals.subtotal)}</Text>
              </View>
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>رسوم التوصيل</Text>
                <Text style={s.totalValue}>
                  {cart.fulfillment === 'PICKUP' ? '—' : zone ? formatLyd(totals.deliveryFee) : 'اختر المنطقة'}
                </Text>
              </View>
              <Hairline />
              <View style={s.totalRow}>
                <Text style={s.grandLabel}>الإجمالي</Text>
                <Text style={s.grandValue}>{formatLyd(totals.total)}</Text>
              </View>
            </View>
          </View>

          {/* طريقة التسليم */}
          <View style={s.card}>
            <Text style={s.cardTitle}>طريقة التسليم</Text>
            <View style={s.segRow}>
              {(['DELIVERY', 'PICKUP'] as FulfillmentType[]).map((f) => {
                const active = cart.fulfillment === f
                const label = f === 'DELIVERY' ? 'توصيل' : 'استلام من المتجر'
                return (
                  <Pressable
                    key={f}
                    accessibilityRole="button"
                    onPress={() => cart.setFulfillment(f)}
                    style={({ pressed }) => [
                      s.seg,
                      active && s.segActive,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text style={[s.segText, active && s.segTextActive]}>{label}</Text>
                  </Pressable>
                )
              })}
            </View>

            {cart.fulfillment === 'DELIVERY' ? (
              <View style={s.section}>
                {data && data.deliveryZones.length > 0 ? (
                  <View style={s.zones}>
                    {data.deliveryZones.map((z) => {
                      const active = cart.zoneId === z.id
                      return (
                        <Pressable
                          key={z.id}
                          accessibilityRole="button"
                          onPress={() => cart.setZone(z.id)}
                          style={({ pressed }) => [
                            s.zone,
                            active && s.zoneActive,
                            pressed && { opacity: 0.8 },
                          ]}
                        >
                          <Text style={[s.zoneName, active && s.zoneNameActive]}>{z.name}</Text>
                          <Text style={[s.zoneFee, active && s.zoneNameActive]}>
                            {z.fee > 0 ? formatLyd(z.fee) : 'مجاناً'}
                            {z.minOrder > 0 ? ` · حد أدنى ${formatLyd(z.minOrder)}` : ''}
                          </Text>
                        </Pressable>
                      )
                    })}
                  </View>
                ) : null}
                <Field
                  label="المنطقة (اختياري)"
                  value={area}
                  onChangeText={setArea}
                  placeholder="مثال: حي الأندلس"
                  maxLength={60}
                />
                <Field
                  label="العنوان"
                  value={addressLine}
                  onChangeText={setAddressLine}
                  placeholder="الشارع، أقرب علامة…"
                  maxLength={200}
                  error={addressError}
                />
                {minOrderBlocked && zone ? (
                  <Text style={s.warnText}>
                    حد الطلب الأدنى لمنطقة «{zone.name}» هو {formatLyd(zone.minOrder)} — أضف أصنافًا
                    بقيمة {formatLyd(zone.minOrder - totals.subtotal)} لإتمام الطلب.
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text style={s.pickupHint}>
                استلم طلبك من {data?.business.name ?? 'المتجر'}
                {data?.business.address ? ` — ${data.business.address}` : ''}
              </Text>
            )}
          </View>

          {/* بيانات العميل */}
          <View style={s.card}>
            <Text style={s.cardTitle}>بياناتك</Text>
            <Field
              label="الاسم"
              value={name}
              onChangeText={setName}
              placeholder="اسمك الكامل"
              maxLength={80}
              error={nameError}
            />
            <Field
              label="رقم الهاتف"
              value={phone}
              onChangeText={setPhone}
              placeholder="09XXXXXXXX"
              keyboardType="phone-pad"
              maxLength={20}
              error={phoneError}
            />
            <Field
              label="ملاحظة للطلب (اختياري)"
              value={customerNote}
              onChangeText={setCustomerNote}
              placeholder="أي تفاصيل إضافية…"
              maxLength={300}
              multiline
            />
            <Text style={s.payHint}>
              الدفع عند الاستلام أو بالتحويل — يحدده المتجر عند التأكيد، وسيتواصل معك عبر
              رقمك إن احتاج تفاصيل إضافية.
            </Text>
          </View>
        </ScrollView>

        {/* شريط الإرسال */}
        <View style={s.footer}>
          <View style={s.footerPrice}>
            <Text style={s.footerTotalLabel}>الإجمالي</Text>
            <Text style={s.footerTotal}>{formatLyd(totals.total)}</Text>
          </View>
          <Button
            label={submitting ? 'جارٍ الإرسال…' : 'إرسال الطلب'}
            onPress={submit}
            disabled={!canSubmit}
            style={s.submitBtn}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.background },
  scroll: { padding: 16, gap: 14, paddingBottom: 24 },
  card: {
    backgroundColor: t.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 15,
    color: t.foreground,
  },
  lineRow: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  lineImage: { width: 52, height: 52, borderRadius: 10, backgroundColor: t.goldSoft },
  lineImageFallback: { alignItems: 'center', justifyContent: 'center' },
  lineImageText: { fontFamily: 'IBMPlexSansArabic_700Bold', fontSize: 20, color: t.ring },
  lineText: { flex: 1, gap: 3 },
  lineName: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 14,
    color: t.foreground,
  },
  lineOptions: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 11.5,
    color: t.mutedFg,
    lineHeight: 17,
  },
  linePrice: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 13,
    color: t.primary,
    marginTop: 2,
  },
  qtyCol: { alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: t.background,
    borderWidth: 1,
    borderColor: t.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 15,
    color: t.foreground,
  },
  totalsBox: { gap: 8, marginTop: 4 },
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
  section: { gap: 10 },
  segRow: {
    flexDirection: 'row',
    backgroundColor: t.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.border,
    padding: 3,
    gap: 3,
  },
  seg: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  segActive: { backgroundColor: t.primary },
  segText: {
    fontFamily: 'IBMPlexSansArabic_500Medium',
    fontSize: 13.5,
    color: t.mutedFg,
  },
  segTextActive: { color: t.primaryFg },
  zones: { gap: 8 },
  zone: {
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.background,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 2,
  },
  zoneActive: { borderColor: t.primary, backgroundColor: t.goldSoft },
  zoneName: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 14,
    color: t.foreground,
  },
  zoneFee: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 12,
    color: t.mutedFg,
  },
  zoneNameActive: { color: t.ring },
  warnText: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 12.5,
    color: t.destructive,
    lineHeight: 19,
  },
  pickupHint: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 13,
    color: t.mutedFg,
    lineHeight: 20,
  },
  payHint: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 12,
    color: t.mutedFg,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    backgroundColor: t.card,
    borderTopWidth: 1,
    borderTopColor: t.border,
  },
  footerPrice: { flex: 1 },
  footerTotalLabel: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 11,
    color: t.mutedFg,
  },
  footerTotal: {
    fontFamily: 'IBMPlexSansArabic_700Bold',
    fontSize: 17,
    color: t.primary,
  },
  submitBtn: { minWidth: 170 },
})
