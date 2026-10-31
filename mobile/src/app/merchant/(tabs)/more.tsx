/**
 * Smart Order Mobile — تبويب «المزيد» للتاجر (P36 Phase C).
 *
 * المتجر الحالي، تغيير المتجر (عند تعدد العضويات)، الأجهزة النشطة
 * مع إبطال أي جهاز (DELETE /sessions/[id] — «هذا الجهاز» يخرج عبر
 * تسجيل الخروج نفسه)، وتسجيل الخروج.
 */
import React from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fonts, type ThemeColors } from '@/constants/theme'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuthStore } from '@/state/auth'
import { fetchSessions, revokeSession, ApiError, NetworkError } from '@/services/merchant'
import { formatArabicDateTime } from '@/lib/datetime'
import { ROLE_AR, type DeviceSession } from '@/types/merchant'
import { Hairline, Toggle } from '@/components/ui'
import { LogOutIcon, SettingsIcon, SmartphoneIcon, StoreIcon } from '@/components/icons'

const PLATFORM_AR: Record<string, string> = {
  ios: 'آيفون',
  android: 'أندرويد',
  unknown: 'جهاز غير معروف',
}

function deviceLabel(s: DeviceSession): string {
  const platform = PLATFORM_AR[s.platform] ?? s.platform
  return s.deviceName ? `${s.deviceName} · ${platform}` : platform
}

export default function MerchantMoreScreen() {
  const { t, statusFamily, name, setTheme } = useTheme()
  const s = makeStyles(t)

  const user = useAuthStore((s) => s.user)
  const memberships = useAuthStore((s) => s.memberships)
  const businessId = useAuthStore((s) => s.selectedBusinessId)
  const membership = memberships.find((m) => m.businessId === businessId)
  const logout = useAuthStore((s) => s.logout)

  const queryClient = useQueryClient()
  const sessionsQuery = useQuery({
    queryKey: ['merchant', 'sessions'],
    queryFn: fetchSessions,
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeSession(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['merchant', 'sessions'] })
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof NetworkError
            ? 'تعذر الاتصال بالخادم — تحقق من الإنترنت وحاول مجددًا'
            : 'تعذّر إبطال الجهاز — حاول بعد قليل'
      Alert.alert('تعذّر الإبطال', msg)
    },
  })

  const confirmLogout = () => {
    Alert.alert('تسجيل الخروج', 'سيتم إنهاء جلسة هذا الجهاز — هل أنت متأكد؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تسجيل الخروج',
        style: 'destructive',
        onPress: () => {
          void logout().then(() => router.replace('/merchant/login'))
        },
      },
    ])
  }

  const confirmRevoke = (s: DeviceSession) => {
    Alert.alert('إبطال جهاز', `سيتم إنهاء جلسة «${deviceLabel(s)}» — هل أنت متأكد؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'إبطال',
        style: 'destructive',
        onPress: () => {
          revokeMutation.mutate(s.id)
        },
      },
    ])
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.header}>
          <Text style={s.title}>المزيد</Text>
        </View>

        {/* المتجر الحالي */}
        <View style={s.card}>
          <View style={s.bizRow}>
            <View style={s.bizWell}>
              <StoreIcon size={22} color={t.primary} />
            </View>
            <View style={s.bizText}>
              <Text style={s.bizName}>{membership?.business.name ?? ''}</Text>
              <Text style={s.bizSlug}>
                {membership ? `${membership.business.slug} · ${ROLE_AR[membership.role] ?? membership.role}` : ''}
              </Text>
              <View
                style={[
                  s.stamp,
                  {
                    backgroundColor: membership?.business.isPublished ? statusFamily.mint.bg : statusFamily.grey.bg,
                    borderColor: membership?.business.isPublished
                      ? `${statusFamily.mint.ink}59`
                      : `${statusFamily.grey.ink}59`,
                  },
                ]}
              >
                <Text
                  style={[
                    s.stampText,
                    { color: membership?.business.isPublished ? statusFamily.mint.deep : statusFamily.grey.deep },
                  ]}
                >
                  {membership?.business.isPublished ? 'منشور' : 'غير منشور'}
                </Text>
              </View>
            </View>
          </View>
          {memberships.length > 1 ? (
            <>
              <Hairline />
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/merchant/business')}
                style={({ pressed }) => [s.rowBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={s.rowBtnText}>تغيير المتجر ({memberships.length})</Text>
                <Text style={s.chevron}>‹</Text>
              </Pressable>
            </>
          ) : null}
        </View>

        {/* الحساب */}
        <View style={s.card}>
          <Text style={s.cardTitle}>الحساب</Text>
          <Text style={s.userName}>{user?.name ?? ''}</Text>
          <Text style={s.userEmail}>{user?.email ?? ''}</Text>
        </View>

        {/* المظهر — الوضع الليلي هو الافتراضي (توافق الويب)؛ الاختيار
            يُحفظ ويبقى عبر إعادة التشغيل، ويسري على التطبيق كله. */}
        <View style={s.card}>
          <Text style={s.cardTitle}>المظهر</Text>
          <Toggle
            label="الوضع الليلي"
            value={name === 'dark'}
            onValueChange={(on) => setTheme(on ? 'dark' : 'light')}
          />
          <Text style={s.themeHint}>
            {name === 'dark' ? 'غرفة العمليات الليلية — أرض كحلية وبرتقالي مضيء' : 'ضوء النهار — ورق فاتح وبرتقالي التوصيل'}
          </Text>
        </View>

        {/* الإدارة — بوابة شاشات الإدارة (C2-REST)، الصفوف تُبوَّب
            بالصلاحيات داخلها. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="الإدارة"
          onPress={() => router.push('/merchant/manage')}
          style={({ pressed }) => [s.manageCard, pressed && { opacity: 0.8 }]}
        >
          <View style={s.manageWell}>
            <SettingsIcon size={20} color={t.primary} />
          </View>
          <View style={s.manageText}>
            <Text style={s.manageTitle}>الإدارة</Text>
            <Text style={s.manageHint} numberOfLines={1}>
              المنتجات · الأقسام · التوصيل · الدفع · العملاء · التقارير
            </Text>
          </View>
          <Text style={s.chevron}>‹</Text>
        </Pressable>

        {/* الأجهزة النشطة */}
        <View style={s.card}>
          <Text style={s.cardTitle}>الأجهزة النشطة</Text>
          {sessionsQuery.isPending ? (
            <Text style={s.hint}>جارٍ تحميل الأجهزة…</Text>
          ) : sessionsQuery.isError ? (
            <View style={s.inlineErrorWrap}>
              <Text style={s.inlineError}>تعذر تحميل الأجهزة — تحقق من الإنترنت</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void sessionsQuery.refetch()
                }}
                style={({ pressed }) => [s.inlineRetry, pressed && { opacity: 0.7 }]}
              >
                <Text style={s.inlineRetryText}>إعادة المحاولة</Text>
              </Pressable>
            </View>
          ) : (sessionsQuery.data?.sessions ?? []).length === 0 ? (
            <Text style={s.hint}>لا توجد أجهزة نشطة</Text>
          ) : (
            (sessionsQuery.data?.sessions ?? []).map((sess, i) => (
              <View key={sess.id}>
                {i > 0 ? <Hairline /> : null}
                <View style={s.sessionRow}>
                  <View style={s.sessionIconWell}>
                    <SmartphoneIcon size={18} color={t.mutedFg} />
                  </View>
                  <View style={s.sessionText}>
                    <Text style={s.sessionName}>{deviceLabel(sess)}</Text>
                    <Text style={s.sessionMeta}>
                      آخر نشاط: {formatArabicDateTime(sess.lastUsedAt)}
                    </Text>
                    {sess.current ? (
                      <View style={[s.stamp, { backgroundColor: t.goldSoft, borderColor: `${t.ring}40` }]}>
                        <Text style={[s.stampText, { color: t.ring }]}>هذا الجهاز</Text>
                      </View>
                    ) : null}
                  </View>
                  {sess.current ? null : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`إبطال جلسة ${deviceLabel(sess)}`}
                      disabled={revokeMutation.isPending}
                      onPress={() => confirmRevoke(sess)}
                      style={({ pressed }) => [
                        s.revokeBtn,
                        pressed && { opacity: 0.7 },
                        revokeMutation.isPending && { opacity: 0.45 },
                      ]}
                    >
                      <Text style={s.revokeText}>إبطال</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* تسجيل الخروج */}
        <Pressable
          accessibilityRole="button"
          onPress={confirmLogout}
          style={({ pressed }) => [s.logoutCard, pressed && { opacity: 0.8 }]}
        >
          <LogOutIcon size={18} color={t.destructive} />
          <Text style={s.logoutText}>تسجيل الخروج</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.background },
  scroll: { padding: 16, gap: 12, paddingBottom: 32 },
  header: { paddingBottom: 4 },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: t.foreground,
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
  bizRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bizWell: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: t.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bizText: { flex: 1, gap: 3 },
  bizName: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: t.foreground,
  },
  bizSlug: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.mutedFg,
  },
  stamp: {
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginTop: 2,
  },
  stampText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 16,
  },
  rowBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  rowBtnText: {
    fontFamily: fonts.medium,
    fontSize: 13.5,
    color: t.primary,
  },
  chevron: { color: t.mutedFg, fontSize: 20, lineHeight: 24 },
  userName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: t.foreground,
  },
  userEmail: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: t.mutedFg,
  },
  manageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: t.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    padding: 14,
  },
  manageWell: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: t.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageText: { flex: 1, gap: 2 },
  manageTitle: {
    fontFamily: fonts.bold,
    fontSize: 14.5,
    color: t.foreground,
  },
  manageHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.mutedFg,
  },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  sessionIconWell: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: t.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionText: { flex: 1, gap: 2 },
  sessionName: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: t.foreground,
  },
  sessionMeta: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: t.mutedFg,
  },
  revokeBtn: {
    borderWidth: 1,
    borderColor: t.destructive,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  revokeText: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: t.destructive,
  },
  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: t.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    padding: 16,
    minHeight: 52,
  },
  logoutText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: t.destructive,
  },
  themeHint: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: t.mutedFg,
    lineHeight: 17,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: t.mutedFg,
    textAlign: 'center',
  },
  inlineErrorWrap: { alignItems: 'center', gap: 8, paddingVertical: 6 },
  inlineError: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: t.destructive,
    textAlign: 'center',
  },
  inlineRetry: {
    borderWidth: 1,
    borderColor: t.primary,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  inlineRetryText: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: t.primary,
  },
})
