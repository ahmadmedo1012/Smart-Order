/**
 * Smart Order Mobile — الفريق (C2-REST، M4؛ الكتابة P38-C3).
 *
 * GET /api/staff?businessId — أعضاء فريق المتجر بأدوارهم (مالك/مدير/
 * موظف) وصلاحياتهم الإضافية. البوابة والشاشة محكومتان بـ staff.manage
 * — صلاحية لا يملكها دور «موظف» أصلًا، فلا يرى صفها في الإدارة ولا
 * الشاشة خلفه (الخادم يفرضها على المسار على أي حال).
 *
 * P38 (C3 — parity): الإنشاء/تغيير الدور/الإزالة صارت أصلية هنا عبر
 * نفس مسارات الويب (POST /api/staff · PATCH /api/staff/[id] · DELETE
 * /api/staff/[id]) — الخادم هو مرجع الصلاحية دائمًا: المالك محصّن من
 * التعديل والإزالة (403)، وحد المقاعد حسب الخطة يردّ 409 برسالة
 * الترقية العربية فتُعرض كما هي. لا صلاحيات إضافية (extraPerms)
 * في النسخة الأصلية — بقيت تحرر من الويب حيث نموذجها الكامل.
 */
import React, { useMemo, useState } from 'react'
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fonts, type ThemeColors } from '@/constants/theme'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuthStore } from '@/state/auth'
import { ApiError, NetworkError, createStaff, fetchStaff, removeStaff, updateStaffRole } from '@/services/merchant'
import { formatNumber } from '@/lib/money'
import { formatArabicDate } from '@/lib/datetime'
import { ROLE_AR, type Role } from '@/types/merchant'
import { Button, Chip, Field, Hairline, MiniStamp } from '@/components/ui'
import { EmptyState, ErrorState, LoadingState } from '@/components/state-views'
import { showToast } from '@/components/toast'
import { PlusIcon, TrashIcon, UserIcon } from '@/components/icons'

function roleFamily(role: Role): 'copper' | 'sky' | 'grey' {
  return role === 'OWNER' ? 'copper' : role === 'ADMIN' ? 'sky' : 'grey'
}

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof NetworkError) return 'تعذر الاتصال بالخادم — تحقق من الإنترنت وحاول مجددًا'
  return fallback
}

type AddErrors = { name?: string; email?: string; password?: string }

/** نموذج إضافة عضو — نفس عقود نموذج الويب (اسم/بريد/كلمة مرور ≥8/دور). */
function AddMemberForm({
  businessId,
  onClose,
}: {
  businessId: string
  onClose: (changed: boolean) => void
}) {
  const { t } = useTheme()
  const s = makeStyles(t)
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'ADMIN' | 'STAFF'>('STAFF')
  const [errors, setErrors] = useState<AddErrors>({})

  const mutation = useMutation({
    mutationFn: () => createStaff(businessId, { name: name.trim(), email: email.trim().toLowerCase(), password, role }),
    onSuccess: async () => {
      showToast('تمت إضافة العضو — يمكنه تسجيل الدخول الآن')
      await queryClient.invalidateQueries({ queryKey: ['merchant', 'staff'] })
      onClose(true)
    },
    onError: (err) => {
      // 409 حد المقاعد: رسالة الترقية العربية تصل كما هي من الخادم.
      Alert.alert('تعذّرت الإضافة', errMsg(err, 'تعذّرت الإضافة — حاول بعد قليل'))
    },
  })

  const save = () => {
    const e: AddErrors = {}
    if (!name.trim()) e.name = 'أدخل الاسم'
    if (!email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) e.email = 'أدخل بريداً إلكترونياً صحيحاً'
    if (password.length < 8) e.password = 'كلمة المرور 8 أحرف على الأقل'
    setErrors(e)
    if (Object.keys(e).length > 0) return
    mutation.mutate()
  }

  return (
    <View style={s.card}>
      <View style={s.formPad}>
        <Text style={s.formTitle}>عضو فريق جديد</Text>
        <Text style={s.formHint}>أنشئ حساباً لموظفك — يملك صلاحيات دوره فقط</Text>
        <Field
          label="الاسم"
          value={name}
          onChangeText={(v) => {
            setName(v)
            setErrors((er) => ({ ...er, name: '' }))
          }}
          error={errors.name}
          autoCapitalize="words"
          autoComplete="name"
        />
        <Field
          label="البريد الإلكتروني"
          value={email}
          onChangeText={(v) => {
            setEmail(v)
            setErrors((er) => ({ ...er, email: '' }))
          }}
          error={errors.email}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <Field
          label="كلمة مرور مؤقتة (8 أحرف على الأقل)"
          value={password}
          onChangeText={(v) => {
            setPassword(v)
            setErrors((er) => ({ ...er, password: '' }))
          }}
          error={errors.password}
          secureTextEntry
          autoCapitalize="none"
        />
        <View style={s.roleWrap}>
          <Text style={s.roleLabel}>الدور</Text>
          <View style={s.roleRow} accessible accessibilityLabel="اختيار الدور">
            <Chip label="موظف" active={role === 'STAFF'} onPress={() => setRole('STAFF')} />
            <Chip label="مدير" active={role === 'ADMIN'} onPress={() => setRole('ADMIN')} />
          </View>
          <Text style={s.roleHint}>
            {role === 'ADMIN' ? 'يدير الطلبات والكتالوج والتوصيل والدفع' : 'يرى الطلبات والعملاء فقط'}
          </Text>
        </View>
        <View style={s.formActions}>
          <Button label="إضافة العضو" onPress={save} disabled={mutation.isPending} />
          <Button
            label="إلغاء"
            variant="outline"
            onPress={() => {
              if (!mutation.isPending) onClose(false)
            }}
            disabled={mutation.isPending}
          />
        </View>
      </View>
    </View>
  )
}

export default function ManageStaffScreen() {
  const { t } = useTheme()
  const s = makeStyles(t)
  const queryClient = useQueryClient()

  const businessId = useAuthStore((s) => s.selectedBusinessId)
  const user = useAuthStore((s) => s.user)
  const membership = useAuthStore((s) => s.memberships.find((m) => m.businessId === s.selectedBusinessId))
  const canManage = useMemo(() => (membership?.permissions ?? []).includes('staff.manage'), [membership])
  const [adding, setAdding] = useState(false)

  const query = useQuery({
    queryKey: ['merchant', 'staff', businessId],
    queryFn: () => fetchStaff(businessId as string),
    enabled: !!businessId && canManage,
  })
  const staff = useMemo(() => query.data?.staff ?? [], [query.data])

  const roleMutation = useMutation({
    mutationFn: (input: { id: string; role: 'ADMIN' | 'STAFF' }) =>
      updateStaffRole(input.id, businessId as string, input.role),
    onSuccess: async () => {
      showToast('تم تحديث الدور')
      await queryClient.invalidateQueries({ queryKey: ['merchant', 'staff'] })
    },
    onError: (err) => {
      Alert.alert('تعذّر التحديث', errMsg(err, 'تعذّر تحديث الدور — حاول بعد قليل'))
    },
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeStaff(id, businessId as string),
    onSuccess: async () => {
      showToast('تمت إزالة العضو من الفريق')
      await queryClient.invalidateQueries({ queryKey: ['merchant', 'staff'] })
    },
    onError: (err) => {
      Alert.alert('تعذّرت الإزالة', errMsg(err, 'تعذّرت الإزالة — حاول بعد قليل'))
    },
  })

  const confirmRemove = (name: string, id: string) => {
    Alert.alert('إزالة العضو', `سيُفقد ${name} وصوله لمتجر هذا الجهاز فورًا. هل أنت متأكد؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'إزالة',
        style: 'destructive',
        onPress: () => {
          removeMutation.mutate(id)
        },
      },
    ])
  }

  const busy = roleMutation.isPending || removeMutation.isPending

  if (!canManage) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <ErrorState message="هذه الشاشة تتطلب صلاحية إدارة الفريق" />
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
        <Text style={s.title}>الفريق</Text>
        <Text style={s.sub}>
          {query.data
            ? `${formatNumber(staff.length)} عضو — حساب لكل عضو يملك صلاحيات دوره`
            : 'حسابات أعضاء فريق متجرك وأدوارهم'}
        </Text>

        {!adding ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="إضافة عضو فريق"
            onPress={() => setAdding(true)}
            style={({ pressed }) => [s.addButton, pressed && { opacity: 0.7 }]}
          >
            <PlusIcon size={16} color={t.primary} />
            <Text style={s.addText}>إضافة عضو</Text>
          </Pressable>
        ) : (
          <AddMemberForm
            businessId={businessId as string}
            onClose={(changed) => {
              setAdding(false)
              if (changed) void query.refetch()
            }}
          />
        )}

        {query.isPending ? (
          <LoadingState label="جارٍ تحميل الفريق…" />
        ) : query.isError ? (
          <ErrorState
            message="تعذر تحميل الفريق — تحقق من الإنترنت وحاول مجددًا"
            onRetry={() => {
              void query.refetch()
            }}
          />
        ) : staff.length === 0 ? (
          <EmptyState title="لا أعضاء فريق" hint="أضف أعضاء من زر «إضافة عضو» — حد المقاعد حسب باقتك" />
        ) : (
          <View style={s.card}>
            {staff.map((m, i) => (
              <View key={m.id}>
                {i > 0 ? <Hairline /> : null}
                <View style={s.row}>
                  <View style={s.iconWell}>
                    <UserIcon size={18} color={t.primary} />
                  </View>
                  <View style={s.rowText}>
                    <View style={s.nameWrap}>
                      <Text style={s.rowName} numberOfLines={1}>
                        {m.user.name}
                      </Text>
                      <MiniStamp text={ROLE_AR[m.role] ?? m.role} family={roleFamily(m.role)} />
                      {user && m.user.id === user.id ? (
                        <View
                          style={[s.youStamp, { backgroundColor: t.goldSoft, borderColor: `${t.ring}40` }]}
                        >
                          <Text style={[s.youText, { color: t.ring }]}>أنت</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={s.rowMeta} numberOfLines={1}>
                      {m.user.email}
                    </Text>
                    <Text style={s.rowMeta}>عضو منذ {formatArabicDate(m.createdAt)}</Text>
                    {m.extraPerms && m.extraPerms.length > 0 ? (
                      <Text style={s.rowMeta}>+{formatNumber(m.extraPerms.length)} صلاحية إضافية</Text>
                    ) : null}
                    {/* المالك محصّن خادميًا (403) — لا نعرض له أزرار تعديل
                        أصلاً؛ بقية الأدوار: تبديل فوري + إزالة بتأكيد. */}
                    {m.role !== 'OWNER' ? (
                      <View style={s.rowActions}>
                        <View style={s.roleToggle} accessible accessibilityLabel={`تغيير دور ${m.user.name}`}>
                          <Chip
                            label="موظف"
                            active={m.role === 'STAFF'}
                            onPress={() => {
                              if (!busy && m.role !== 'STAFF') roleMutation.mutate({ id: m.id, role: 'STAFF' })
                            }}
                          />
                          <Chip
                            label="مدير"
                            active={m.role === 'ADMIN'}
                            onPress={() => {
                              if (!busy && m.role !== 'ADMIN') roleMutation.mutate({ id: m.id, role: 'ADMIN' })
                            }}
                          />
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`إزالة ${m.user.name} من الفريق`}
                          disabled={busy}
                          onPress={() => confirmRemove(m.user.name, m.id)}
                          style={({ pressed }) => [s.removeButton, pressed && { opacity: 0.6 }]}
                        >
                          <TrashIcon size={16} color={t.destructive} />
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <Text style={s.footHint}>
          الأدوار: مالك يملك كل الصلاحيات · مدير يدير الطلبات والكتالوج والتوصيل والدفع · موظف يرى الطلبات
          والعملاء فقط — الصلاحيات الإضافية تُدار من لوحة الويب
        </Text>
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
  },
  sub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: t.mutedFg,
    lineHeight: 19,
    paddingBottom: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${t.primary}40`,
    backgroundColor: t.card,
    paddingVertical: 12,
  },
  addText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: t.primary,
  },
  card: {
    backgroundColor: t.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    padding: 6,
  },
  formPad: { padding: 10, gap: 12 },
  formTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: t.foreground,
  },
  formHint: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: t.mutedFg,
    lineHeight: 18,
  },
  roleWrap: { gap: 6 },
  roleLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: t.foreground,
  },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleHint: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: t.mutedFg,
    lineHeight: 17,
  },
  formActions: { flexDirection: 'row', gap: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12 },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: t.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  nameWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
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
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 6,
  },
  roleToggle: { flexDirection: 'row', gap: 8 },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${t.destructive}40`,
    backgroundColor: t.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  youStamp: {
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  youText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 16,
  },
  footHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.mutedFg,
    textAlign: 'center',
    lineHeight: 18,
  },
})
