/**
 * Smart Order Mobile — طرق الدفع (C2-REST، بما فيها إعادة ترتيب C4).
 *
 * GET/POST/PATCH/DELETE /api/payment-methods — ما يظهر للعملاء في صفحة
 * الدفع: تفعيل نوع (واحد من كل نوع)، تعليمات ورقم تحويل للمحافظ،
 * تعطيل/تمكين، حذف بتأكيد، وإعادة الترتيب بأسهم أعلى/أسفل ترسل
 * القائمة الكاملة المرتّبة (PATCH /api/payment-methods {businessId,
 * order}) — عقد C4: ناقصة/مكررة → 422، غريبة → 404. الشاشة كلها
 * محكومة بـ payments.manage.
 */
import React, { useMemo, useState } from 'react'
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { t } from '@/constants/theme'
import { useAuthStore } from '@/state/auth'
import {
  createPaymentMethod,
  deletePaymentMethod,
  fetchPaymentMethods,
  reorderPaymentMethods,
  updatePaymentMethod,
} from '@/services/merchant'
import { apiErrorMessage } from '@/lib/api-error'
import {
  PAYMENT_TYPE_AR,
  PAYMENT_TYPE_DESCRIPTION_AR,
  PAYMENT_TYPES,
  PAYMENT_TYPES_NEEDING_NUMBER,
  type MerchantPaymentMethod,
  type PaymentType,
} from '@/types/merchant'
import { Button, Field, Hairline, MiniStamp } from '@/components/ui'
import { EmptyState, ErrorState, LoadingState } from '@/components/state-views'
import { showToast } from '@/components/toast'
import { ChevronDownIcon, ChevronUpIcon, PencilIcon, WalletIcon } from '@/components/icons'

/** فك رقم التحويل من config (JSON "{number}") — فشل التفكيك = لا رقم. */
function methodNumber(method: MerchantPaymentMethod): string {
  if (!method.config) return ''
  try {
    const parsed = JSON.parse(method.config) as { number?: unknown }
    return typeof parsed.number === 'string' ? parsed.number : ''
  } catch {
    return ''
  }
}

export default function ManagePaymentMethodsScreen() {
  const businessId = useAuthStore((s) => s.selectedBusinessId)
  const membership = useAuthStore((s) => s.memberships.find((m) => m.businessId === s.selectedBusinessId))
  const canManage = useMemo(() => (membership?.permissions ?? []).includes('payments.manage'), [membership])

  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['merchant', 'payments', businessId],
    queryFn: () => fetchPaymentMethods(businessId as string),
    enabled: !!businessId && canManage,
  })
  const methods = useMemo(() => query.data?.methods ?? [], [query.data])
  const availableTypes = useMemo(() => PAYMENT_TYPES.filter((type) => !methods.some((m) => m.type === type)), [methods])

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: (input: { type: PaymentType; name: string; instructions: string; number: string }) =>
      createPaymentMethod(businessId as string, input),
    onSuccess: async () => {
      showToast('تمت إضافة طريقة الدفع')
      setAdding(false)
      await queryClient.invalidateQueries({ queryKey: ['merchant'] })
    },
    onError: (err) => {
      Alert.alert('تعذّرت الإضافة', apiErrorMessage(err, 'تعذّرت إضافة طريقة الدفع — حاول بعد قليل'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: (input: {
      id: string
      body: { name?: string; instructions?: string | null; number?: string; isActive?: boolean }
    }) => updatePaymentMethod(input.id, businessId as string, input.body),
    onSuccess: async () => {
      showToast('تم الحفظ')
      setEditingId(null)
      await queryClient.invalidateQueries({ queryKey: ['merchant'] })
    },
    onError: (err) => {
      Alert.alert('تعذّر الحفظ', apiErrorMessage(err, 'تعذّر حفظ طريقة الدفع — حاول بعد قليل'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePaymentMethod(id, businessId as string),
    onSuccess: async () => {
      showToast('تم حذف طريقة الدفع')
      setEditingId(null)
      await queryClient.invalidateQueries({ queryKey: ['merchant'] })
    },
    onError: (err) => {
      Alert.alert('تعذّر الحذف', apiErrorMessage(err, 'تعذّر حذف طريقة الدفع — حاول بعد قليل'))
    },
  })

  const reorderMutation = useMutation({
    mutationFn: (order: string[]) => reorderPaymentMethods(businessId as string, order),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['merchant'] })
    },
    onError: (err) => {
      Alert.alert('تعذّر إعادة الترتيب', apiErrorMessage(err, 'تعذّر تحديث الترتيب — حاول بعد قليل'))
    },
  })

  const busy =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || reorderMutation.isPending

  /** سهم أعلى/أسفل — القائمة الكاملة الجديدة تُرسل دفعة واحدة (عقد C4). */
  function move(index: number, dir: -1 | 1) {
    if (busy) return
    const target = index + dir
    if (target < 0 || target >= methods.length) return
    const next = methods.map((m) => m.id)
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    reorderMutation.mutate(next)
  }

  function toggleActive(method: MerchantPaymentMethod) {
    if (busy) return
    updateMutation.mutate({ id: method.id, body: { isActive: !method.isActive } })
  }

  function confirmDelete(method: MerchantPaymentMethod) {
    Alert.alert(
      `حذف «${method.name}»؟`,
      'لن تظهر هذه الطريقة للعملاء في صفحة الدفع بعد الحذف',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حذف', style: 'destructive', onPress: () => deleteMutation.mutate(method.id) },
      ],
    )
  }

  if (!canManage) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <ErrorState message="هذه الشاشة تتطلب صلاحية إدارة طرق الدفع" />
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
        <Text style={s.title}>طرق الدفع</Text>
        <Text style={s.sub}>اختر ما يظهر للعملاء في صفحة الدفع — الأسهم ترتّب ظهورها</Text>

        {query.isPending ? (
          <LoadingState label="جارٍ تحميل طرق الدفع…" />
        ) : query.isError ? (
          <ErrorState
            message="تعذر تحميل طرق الدفع — تحقق من الإنترنت وحاول مجددًا"
            onRetry={() => {
              void query.refetch()
            }}
          />
        ) : methods.length === 0 ? (
          <EmptyState title="لا طرق دفع مفعّلة" hint="أضف طريقة واحدة على الأقل ليتمكن العملاء من إتمام الطلب" />
        ) : (
          <View style={s.card}>
            {methods.map((method, i) =>
              editingId === method.id ? (
                <MethodEditor
                  key={method.id}
                  method={method}
                  busy={busy}
                  onCancel={() => {
                    setEditingId(null)
                  }}
                  onSave={(body) => updateMutation.mutate({ id: method.id, body })}
                  onDelete={() => confirmDelete(method)}
                />
              ) : (
                <View key={method.id}>
                  {i > 0 ? <Hairline /> : null}
                  <View style={s.row}>
                    <View style={s.rowIconWell}>
                      <WalletIcon size={17} color={method.isActive ? t.primary : t.mutedFg} />
                    </View>
                    <View style={s.rowText}>
                      <View style={s.rowTitleWrap}>
                        <Text style={s.rowName} numberOfLines={1}>
                          {method.name}
                        </Text>
                        {method.isActive ? <MiniStamp text="مفعّلة" family="mint" /> : <MiniStamp text="معطلة" family="grey" />}
                      </View>
                      <Text style={s.rowMeta} numberOfLines={1}>
                        {PAYMENT_TYPE_AR[method.type] ?? method.type}
                        {methodNumber(method) ? ` · ${methodNumber(method)}` : ''}
                      </Text>
                      {method.instructions ? (
                        <Text style={s.rowInstructions} numberOfLines={2}>
                          {method.instructions}
                        </Text>
                      ) : null}
                    </View>
                    <View style={s.rowActions}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`تقديم ${method.name}`}
                        accessibilityState={{ disabled: i === 0 || busy }}
                        disabled={i === 0 || busy}
                        onPress={() => move(i, -1)}
                        style={({ pressed }) => [s.arrowBtn, pressed && { opacity: 0.7 }, (i === 0 || busy) && { opacity: 0.3 }]}
                      >
                        <ChevronUpIcon size={18} color={t.mutedFg} />
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`تأخير ${method.name}`}
                        accessibilityState={{ disabled: i === methods.length - 1 || busy }}
                        disabled={i === methods.length - 1 || busy}
                        onPress={() => move(i, 1)}
                        style={({ pressed }) => [
                          s.arrowBtn,
                          pressed && { opacity: 0.7 },
                          (i === methods.length - 1 || busy) && { opacity: 0.3 },
                        ]}
                      >
                        <ChevronDownIcon size={18} color={t.mutedFg} />
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={method.isActive ? `تعطيل ${method.name}` : `تفعيل ${method.name}`}
                        disabled={busy}
                        onPress={() => toggleActive(method)}
                        style={({ pressed }) => [s.toggleBtn, pressed && { opacity: 0.7 }, busy && { opacity: 0.45 }]}
                      >
                        <Text style={method.isActive ? s.toggleOnText : s.toggleOffText}>
                          {method.isActive ? 'تعطيل' : 'تفعيل'}
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`تعديل ${method.name}`}
                        disabled={busy}
                        onPress={() => {
                          setEditingId(method.id)
                        }}
                        style={({ pressed }) => [s.arrowBtn, pressed && { opacity: 0.7 }, busy && { opacity: 0.45 }]}
                      >
                        <PencilIcon size={17} color={t.primary} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ),
            )}
          </View>
        )}

        {/* الإضافة — الأنواع غير المفعّلة فقط */}
        {availableTypes.length > 0 ? (
          adding ? (
            <AddMethodCard
              available={availableTypes}
              busy={busy}
              onCancel={() => {
                setAdding(false)
              }}
              onSubmit={(input) => createMutation.mutate(input)}
            />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="إضافة طريقة دفع"
              disabled={busy}
              onPress={() => {
                setAdding(true)
              }}
              style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.75 }]}
            >
              <Text style={s.addText}>+ إضافة طريقة دفع ({availableTypes.length} متاحة)</Text>
            </Pressable>
          )
        ) : null}

        <Text style={s.footHint}>
          طرق الدفع يدوية بالكامل — تحويلات المحافظ تصل بحالة «غير مدفوع» وتؤكدها أنت من صفحة الطلب بعد وصول المبلغ
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

/** نموذج تفعيل نوع جديد — الاسم يتبع النوع، والرقم إلزامي للمحافظ. */
function AddMethodCard({
  available,
  busy,
  onCancel,
  onSubmit,
}: {
  available: PaymentType[]
  busy: boolean
  onCancel: () => void
  onSubmit: (input: { type: PaymentType; name: string; instructions: string; number: string }) => void
}) {
  const [type, setType] = useState<PaymentType>(available[0])
  const [name, setName] = useState(PAYMENT_TYPE_AR[available[0]])
  const [instructions, setInstructions] = useState('')
  const [number, setNumber] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function pickType(next: PaymentType) {
    setType(next)
    setName(PAYMENT_TYPE_AR[next])
    setInstructions('')
    setNumber('')
    setErrors({})
  }

  function submit() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'أدخل الاسم الظاهر للعملاء'
    if (PAYMENT_TYPES_NEEDING_NUMBER.includes(type) && !number.trim()) e.number = 'أدخل رقم الهاتف المستقبل للحوالات'
    setErrors(e)
    if (Object.keys(e).length > 0) return
    onSubmit({
      type,
      name: name.trim(),
      instructions: instructions.trim() || PAYMENT_TYPE_DESCRIPTION_AR[type],
      number: number.trim(),
    })
  }

  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>طريقة دفع جديدة</Text>
      <Text style={s.pickerLabel}>النوع</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.typeChips}>
        {available.map((ty) => (
          <Pressable
            key={ty}
            accessibilityRole="button"
            onPress={() => pickType(ty)}
            style={({ pressed }) => [s.typeChip, type === ty && s.typeChipActive, pressed && { opacity: 0.75 }]}
          >
            <Text style={[s.typeChipText, type === ty && s.typeChipTextActive]}>{PAYMENT_TYPE_AR[ty]}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={s.typeHint}>{PAYMENT_TYPE_DESCRIPTION_AR[type]}</Text>
      <Field
        label="الاسم الظاهر للعملاء"
        value={name}
        onChangeText={(v) => {
          setName(v)
          setErrors((e) => ({ ...e, name: '' }))
        }}
        error={errors.name}
      />
      {PAYMENT_TYPES_NEEDING_NUMBER.includes(type) ? (
        <Field
          label="رقم الهاتف المستقبل للحوالات"
          value={number}
          onChangeText={(v) => {
            setNumber(v)
            setErrors((e) => ({ ...e, number: '' }))
          }}
          error={errors.number}
          placeholder="0912345678"
          keyboardType="phone-pad"
        />
      ) : null}
      <Field
        label="تعليمات تظهر للعميل (اختياري)"
        value={instructions}
        onChangeText={setInstructions}
        placeholder={PAYMENT_TYPE_DESCRIPTION_AR[type]}
        multiline
        style={s.textarea}
      />
      <View style={s.formActions}>
        <Button label="تفعيل الطريقة" onPress={submit} disabled={busy} style={s.formActionBtn} />
        <Button label="إلغاء" variant="ghost" onPress={onCancel} disabled={busy} style={[s.formActionBtn, s.ghostBtn]} />
      </View>
    </View>
  )
}

/** محرر طريقة قائمة — التعليمات والرقم والاسم (مفعّلة تُدار من الصف). */
function MethodEditor({
  method,
  busy,
  onCancel,
  onSave,
  onDelete,
}: {
  method: MerchantPaymentMethod
  busy: boolean
  onCancel: () => void
  onSave: (body: { name?: string; instructions?: string | null; number?: string }) => void
  onDelete: () => void
}) {
  const [name, setName] = useState(method.name)
  const [instructions, setInstructions] = useState(method.instructions ?? '')
  const [number, setNumber] = useState(methodNumber(method))

  function submit() {
    if (!name.trim()) {
      Alert.alert('بيانات ناقصة', 'أدخل الاسم الظاهر للعملاء')
      return
    }
    const body: { name?: string; instructions?: string | null; number?: string } = {
      name: name.trim(),
      instructions: instructions.trim() || null,
    }
    // الرقم يُرسل فقط عند إدخاله — الخادم يطبّعه ويرفض غير الليبي.
    if (number.trim()) body.number = number.trim()
    onSave(body)
  }

  return (
    <View style={s.editorBox}>
      <Text style={s.cardTitle}>تعديل «{method.name}»</Text>
      <Field label="الاسم الظاهر للعملاء" value={name} onChangeText={setName} />
      {PAYMENT_TYPES_NEEDING_NUMBER.includes(method.type) ? (
        <Field
          label="رقم الهاتف المستقبل للحوالات"
          value={number}
          onChangeText={setNumber}
          placeholder="0912345678"
          keyboardType="phone-pad"
        />
      ) : null}
      <Field
        label="تعليمات تظهر للعميل"
        value={instructions}
        onChangeText={setInstructions}
        placeholder="اتركها فارغة لإخفائها"
        multiline
        style={s.textarea}
      />
      <View style={s.formActions}>
        <Button label="حفظ" onPress={submit} disabled={busy} style={s.formActionBtn} />
        <Button label="إلغاء" variant="ghost" onPress={onCancel} disabled={busy} style={[s.formActionBtn, s.ghostBtn]} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`حذف ${method.name}`}
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

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.background },
  scroll: { padding: 16, gap: 12, paddingBottom: 32 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4 },
  backText: {
    fontFamily: 'IBMPlexSansArabic_500Medium',
    fontSize: 14,
    color: t.primary,
  },
  backChevron: { color: t.primary, fontSize: 20, lineHeight: 24 },
  title: {
    fontFamily: 'IBMPlexSansArabic_700Bold',
    fontSize: 24,
    color: t.foreground,
  },
  sub: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
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
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 15,
    color: t.foreground,
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
  rowText: { flex: 1, gap: 3 },
  rowTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rowName: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 14.5,
    color: t.foreground,
  },
  rowMeta: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 12,
    color: t.mutedFg,
  },
  rowInstructions: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 11.5,
    color: t.mutedFg,
    lineHeight: 17,
  },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  arrowBtn: {
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtn: {
    borderWidth: 1,
    borderColor: t.primary,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  toggleOnText: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 12,
    color: t.primary,
  },
  toggleOffText: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 12,
    color: t.primary,
  },
  addBtn: {
    borderWidth: 1,
    borderColor: `${t.primary}55`,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 13,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 14,
    color: t.primary,
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
  pickerLabel: {
    fontFamily: 'IBMPlexSansArabic_500Medium',
    fontSize: 13,
    color: t.foreground,
  },
  typeChips: { gap: 8, paddingVertical: 2 },
  typeChip: {
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  typeChipActive: { backgroundColor: t.primary, borderColor: t.primary },
  typeChipText: {
    fontFamily: 'IBMPlexSansArabic_500Medium',
    fontSize: 12.5,
    color: t.mutedFg,
  },
  typeChipTextActive: {
    color: t.primaryFg,
  },
  typeHint: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 12,
    color: t.mutedFg,
    lineHeight: 18,
  },
  textarea: { minHeight: 66, textAlignVertical: 'top' },
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
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 13.5,
    color: t.destructive,
  },
  footHint: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 12,
    color: t.mutedFg,
    textAlign: 'center',
    lineHeight: 18,
  },
})
