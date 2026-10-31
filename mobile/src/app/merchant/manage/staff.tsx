/**
 * Smart Order Mobile — الفريق (C2-REST، M4).
 *
 * GET /api/staff?businessId — أعضاء فريق المتجر بأدوارهم (مالك/مدير/
 * موظف) وصلاحياتهم الإضافية. البوابة والشاشة محكومتان بـ staff.manage
 * — صلاحية لا يملكها دور «موظف» أصلًا، فلا يرى صفها في الإدارة ولا
 * الشاشة خلفه (الخادم يفرضها على المسار على أي حال). قراءة فقط:
 * إضافة الأعضاء وإدارتهم تتم من لوحة الويب (حد المقاعد حسب الخطة).
 */
import React, { useMemo } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { fonts, type ThemeColors } from '@/constants/theme'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuthStore } from '@/state/auth'
import { fetchStaff } from '@/services/merchant'
import { formatNumber } from '@/lib/money'
import { formatArabicDate } from '@/lib/datetime'
import { ROLE_AR, type Role } from '@/types/merchant'
import { Hairline, MiniStamp } from '@/components/ui'
import { EmptyState, ErrorState, LoadingState } from '@/components/state-views'
import { UserIcon } from '@/components/icons'

function roleFamily(role: Role): 'copper' | 'sky' | 'grey' {
  return role === 'OWNER' ? 'copper' : role === 'ADMIN' ? 'sky' : 'grey'
}

export default function ManageStaffScreen() {
  const { t } = useTheme()
  const s = makeStyles(t)

  const businessId = useAuthStore((s) => s.selectedBusinessId)
  const user = useAuthStore((s) => s.user)
  const membership = useAuthStore((s) => s.memberships.find((m) => m.businessId === s.selectedBusinessId))
  const canManage = useMemo(() => (membership?.permissions ?? []).includes('staff.manage'), [membership])

  const query = useQuery({
    queryKey: ['merchant', 'staff', businessId],
    queryFn: () => fetchStaff(businessId as string),
    enabled: !!businessId && canManage,
  })
  const staff = useMemo(() => query.data?.staff ?? [], [query.data])

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
          {query.data ? `${formatNumber(staff.length)} عضو — حساب لكل عضو يملك صلاحيات دوره` : 'حسابات أعضاء فريق متجرك وأدوارهم'}
        </Text>

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
          <EmptyState title="لا أعضاء فريق" hint="أضف أعضاء من لوحة الويب — حد المقاعد حسب باقتك" />
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
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <Text style={s.footHint}>
          الأدوار: مالك يملك كل الصلاحيات · مدير يدير الطلبات والكتالوج والتوصيل والدفع · موظف يرى الطلبات
          والعملاء فقط
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
  card: {
    backgroundColor: t.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    padding: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
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
