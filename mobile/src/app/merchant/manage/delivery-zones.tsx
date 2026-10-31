/**
 * Smart Order Mobile — مناطق التوصيل (C2-REST).
 *
 * GET/POST/PATCH/DELETE /api/delivery-zones — الرسوم والحد الأدنى
 * كسلاسل عشرية («4.000») يفكّها parseLyd في الخادم، وحالة التفعيل.
 * الحذف نهائي في الخادم — بتأكيد صريح. الشاشة كلها محكومة بـ
 * delivery.manage (الخادم يفرضها على كل فعل).
 */
import React, { useMemo, useState } from 'react'
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fonts, type ThemeColors } from '@/constants/theme'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuthStore } from '@/state/auth'
import { createZone, deleteZone, fetchZones, updateZone, type ZoneInput } from '@/services/merchant'
import { apiErrorMessage } from '@/lib/api-error'
import { formatMillimes, formatMillimesAmount, parseAmountMillimes } from '@/lib/money-millimes'
import type { MerchantZone } from '@/types/merchant'
import { Button, Field, Hairline, MiniStamp, Toggle } from '@/components/ui'
import { EmptyState, ErrorState, LoadingState } from '@/components/state-views'
import { showToast } from '@/components/toast'
import { PencilIcon, TruckIcon } from '@/components/icons'

export default function ManageZonesScreen() {
  const { t } = useTheme()
  const s = makeStyles(t)

  const businessId = useAuthStore((s) => s.selectedBusinessId)
  const membership = useAuthStore((s) => s.memberships.find((m) => m.businessId === s.selectedBusinessId))
  const canManage = useMemo(() => (membership?.permissions ?? []).includes('delivery.manage'), [membership])

  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['merchant', 'zones', businessId],
    queryFn: () => fetchZones(businessId as string),
    enabled: !!businessId && canManage,
  })
  const zones = query.data?.zones ?? []

  const [editingId, setEditingId] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: (input: ZoneInput) => createZone(businessId as string, input),
    onSuccess: async () => {
      showToast('تمت إضافة المنطقة')
      await queryClient.invalidateQueries({ queryKey: ['merchant'] })
    },
    onError: (err) => {
      Alert.alert('تعذّرت الإضافة', apiErrorMessage(err, 'تعذّرت إضافة المنطقة — حاول بعد قليل'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; body: ZoneInput }) => updateZone(input.id, businessId as string, input.body),
    onSuccess: async () => {
      showToast('تم حفظ المنطقة')
      setEditingId(null)
      await queryClient.invalidateQueries({ queryKey: ['merchant'] })
    },
    onError: (err) => {
      Alert.alert('تعذّر الحفظ', apiErrorMessage(err, 'تعذّر حفظ المنطقة — حاول بعد قليل'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteZone(id, businessId as string),
    onSuccess: async () => {
      showToast('تم حذف المنطقة')
      setEditingId(null)
      await queryClient.invalidateQueries({ queryKey: ['merchant'] })
    },
    onError: (err) => {
      Alert.alert('تعذّر الحذف', apiErrorMessage(err, 'تعذّر حذف المنطقة — حاول بعد قليل'))
    },
  })

  const busy = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  function confirmDelete(zone: MerchantZone) {
    Alert.alert(
      `حذف «${zone.name}»؟`,
      'سيُحذف نهائياً من قائمة المناطق — الطلبات القديمة تحتفظ برسومها المحفوظة',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حذف', style: 'destructive', onPress: () => deleteMutation.mutate(zone.id) },
      ],
    )
  }

  if (!canManage) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <ErrorState message="هذه الشاشة تتطلب صلاحية إدارة التوصيل" />
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
        <Text style={s.title}>مناطق التوصيل</Text>
        <Text style={s.sub}>رسوم التوصيل والحد الأدنى للطلب لكل منطقة يخدمها متجرك</Text>

        <CreateZoneCard busy={busy} onSubmit={(input) => createMutation.mutate(input)} />

        {query.isPending ? (
          <LoadingState label="جارٍ تحميل المناطق…" />
        ) : query.isError ? (
          <ErrorState
            message="تعذر تحميل المناطق — تحقق من الإنترنت وحاول مجددًا"
            onRetry={() => {
              void query.refetch()
            }}
          />
        ) : zones.length === 0 ? (
          <EmptyState title="لا مناطق توصيل بعد" hint="أضف منطقتك الأولى ليتمكن العملاء من طلب التوصيل" />
        ) : (
          <View style={s.card}>
            {zones.map((zone, i) =>
              editingId === zone.id ? (
                <ZoneEditor
                  key={zone.id}
                  zone={zone}
                  busy={busy}
                  onCancel={() => {
                    setEditingId(null)
                  }}
                  onSave={(body) => updateMutation.mutate({ id: zone.id, body })}
                  onDelete={() => confirmDelete(zone)}
                />
              ) : (
                <View key={zone.id}>
                  {i > 0 ? <Hairline /> : null}
                  <View style={s.row}>
                    <View style={s.rowIconWell}>
                      <TruckIcon size={17} color={zone.isActive ? t.primary : t.mutedFg} />
                    </View>
                    <View style={s.rowText}>
                      <Text style={s.rowName} numberOfLines={1}>
                        {zone.name}
                      </Text>
                      <Text style={s.rowMeta}>
                        التوصيل {formatMillimes(zone.fee)}
                        {zone.minOrder > 0 ? ` · الحد الأدنى ${formatMillimes(zone.minOrder)}` : ''}
                      </Text>
                    </View>
                    {zone.isActive ? <MiniStamp text="مفعّلة" family="mint" /> : <MiniStamp text="معطلة" family="grey" />}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`تعديل ${zone.name}`}
                      disabled={busy}
                      onPress={() => {
                        setEditingId(zone.id)
                      }}
                      style={({ pressed }) => [s.editBtn, pressed && { opacity: 0.7 }, busy && { opacity: 0.45 }]}
                    >
                      <PencilIcon size={17} color={t.primary} />
                    </Pressable>
                  </View>
                </View>
              ),
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

/** بطاقة إضافة منطقة — تُفتح بزر وتُغلق بعد الإرسال. */
function CreateZoneCard({ busy, onSubmit }: { busy: boolean; onSubmit: (input: ZoneInput) => void }) {
  const { t } = useTheme()
  const s = makeStyles(t)

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [fee, setFee] = useState('')
  const [minOrder, setMinOrder] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function submit() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'أدخل اسم المنطقة'
    const feeMillimes = parseAmountMillimes(fee)
    if (feeMillimes === null) e.fee = 'أدخل رسومًا صحيحة مثل 4.000'
    else if (feeMillimes > 500_000) e.fee = 'الرسوم كبيرة جداً'
    const minMillimes = minOrder.trim() ? parseAmountMillimes(minOrder) : 0
    if (minMillimes === null) e.minOrder = 'قيمة غير صحيحة'
    setErrors(e)
    if (Object.keys(e).length > 0) return
    onSubmit({ name: name.trim(), fee: fee.trim(), minOrder: minOrder.trim() || '0' })
    setName('')
    setFee('')
    setMinOrder('')
    setErrors({})
    setOpen(false)
  }

  if (!open) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="إضافة منطقة توصيل"
        disabled={busy}
        onPress={() => {
          setOpen(true)
        }}
        style={({ pressed }) => [s.addZoneBtn, pressed && { opacity: 0.75 }]}
      >
        <Text style={s.addZoneText}>+ إضافة منطقة</Text>
      </Pressable>
    )
  }

  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>منطقة جديدة</Text>
      <Field
        label="اسم المنطقة"
        value={name}
        onChangeText={(v) => {
          setName(v)
          setErrors((e) => ({ ...e, name: '' }))
        }}
        error={errors.name}
        placeholder="مثال: حي الأندلس"
      />
      <Field
        label="رسوم التوصيل (د.ل) — مثل 4.000"
        value={fee}
        onChangeText={(v) => {
          setFee(v)
          setErrors((e) => ({ ...e, fee: '' }))
        }}
        error={errors.fee}
        placeholder="4.000"
        keyboardType="decimal-pad"
      />
      <Field
        label="الحد الأدنى للطلب (اختياري)"
        value={minOrder}
        onChangeText={(v) => {
          setMinOrder(v)
          setErrors((e) => ({ ...e, minOrder: '' }))
        }}
        error={errors.minOrder}
        placeholder="20.000"
        keyboardType="decimal-pad"
      />
      <View style={s.formActions}>
        <Button label="إضافة المنطقة" onPress={submit} disabled={busy} style={s.formActionBtn} />
        <Button
          label="إلغاء"
          variant="ghost"
          onPress={() => {
            setOpen(false)
          }}
          disabled={busy}
          style={[s.formActionBtn, s.ghostBtn]}
        />
      </View>
    </View>
  )
}

/** محرر منطقة قائمة — يُركَّب من بيانات الخادم (بلا تأثيرات بذر). */
function ZoneEditor({
  zone,
  busy,
  onCancel,
  onSave,
  onDelete,
}: {
  zone: MerchantZone
  busy: boolean
  onCancel: () => void
  onSave: (body: ZoneInput) => void
  onDelete: () => void
}) {
  const { t } = useTheme()
  const s = makeStyles(t)

  const [name, setName] = useState(zone.name)
  const [fee, setFee] = useState(formatMillimesAmount(zone.fee))
  const [minOrder, setMinOrder] = useState(zone.minOrder > 0 ? formatMillimesAmount(zone.minOrder) : '')
  const [isActive, setIsActive] = useState(zone.isActive)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function submit() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'أدخل اسم المنطقة'
    const feeMillimes = parseAmountMillimes(fee)
    if (feeMillimes === null) e.fee = 'أدخل رسومًا صحيحة مثل 4.000'
    else if (feeMillimes > 500_000) e.fee = 'الرسوم كبيرة جداً'
    const minMillimes = minOrder.trim() ? parseAmountMillimes(minOrder) : 0
    if (minMillimes === null) e.minOrder = 'قيمة غير صحيحة'
    setErrors(e)
    if (Object.keys(e).length > 0) return
    onSave({ name: name.trim(), fee: fee.trim(), minOrder: minOrder.trim() || '0', isActive })
  }

  return (
    <View style={s.editorBox}>
      <Text style={s.cardTitle}>تعديل «{zone.name}»</Text>
      <Field
        label="اسم المنطقة"
        value={name}
        onChangeText={(v) => {
          setName(v)
          setErrors((e) => ({ ...e, name: '' }))
        }}
        error={errors.name}
      />
      <Field
        label="رسوم التوصيل (د.ل) — مثل 4.000"
        value={fee}
        onChangeText={(v) => {
          setFee(v)
          setErrors((e) => ({ ...e, fee: '' }))
        }}
        error={errors.fee}
        keyboardType="decimal-pad"
      />
      <Field
        label="الحد الأدنى للطلب (اختياري)"
        value={minOrder}
        onChangeText={(v) => {
          setMinOrder(v)
          setErrors((e) => ({ ...e, minOrder: '' }))
        }}
        error={errors.minOrder}
        keyboardType="decimal-pad"
      />
      <Toggle label="مفعّلة للطلب" value={isActive} disabled={busy} onValueChange={setIsActive} />
      <View style={s.formActions}>
        <Button label="حفظ" onPress={submit} disabled={busy} style={s.formActionBtn} />
        <Button label="إلغاء" variant="ghost" onPress={onCancel} disabled={busy} style={[s.formActionBtn, s.ghostBtn]} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`حذف ${zone.name}`}
          disabled={busy}
          onPress={onDelete}
          style={({ pressed }) => [s.deleteBtn, pressed && { opacity: 0.7 }, busy && { opacity: 0.45 }]}
        >
          <Text style={s.deleteText}>حذف</Text>
        </Pressable>
      </View>
    </View>
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
  },
  sub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: t.mutedFg,
    lineHeight: 19,
    paddingBottom: 2,
  },
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
  addZoneBtn: {
    borderWidth: 1,
    borderColor: `${t.primary}55`,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 13,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addZoneText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: t.primary,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  rowIconWell: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: t.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  rowName: {
    fontFamily: fonts.bold,
    fontSize: 14.5,
    color: t.foreground,
  },
  rowMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.mutedFg,
  },
  editBtn: {
    borderWidth: 1,
    borderColor: t.primary,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 11,
  },
  editorBox: {
    backgroundColor: t.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.border,
    padding: 12,
    gap: 10,
    marginVertical: 4,
  },
  formActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  formActionBtn: { flex: 1, minHeight: 42, paddingVertical: 9 },
  ghostBtn: { borderWidth: 1, borderColor: t.border },
  deleteBtn: {
    borderWidth: 1,
    borderColor: t.destructive,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 18,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: t.destructive,
  },
})
