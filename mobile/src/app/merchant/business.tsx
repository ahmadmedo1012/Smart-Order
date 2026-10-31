/**
 * Smart Order Mobile — اختيار متجر التاجر (P36 Phase C).
 *
 * عضويات المستخدم من /me: متجر واحد يُختار تلقائيًا عند الدخول؛
 * متعدد → هذه الشاشة تعرض القائمة (الاسم/الرمز/حالة النشر/الدور)
 * والاختيار يُثبَّت في AsyncStorage ويقود إلى صندوق الطلبات.
 */
import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { fonts, type ThemeColors } from '@/constants/theme'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuthStore } from '@/state/auth'
import { ROLE_AR } from '@/types/merchant'
import { StoreIcon, LogOutIcon } from '@/components/icons'
import { Button, Hairline } from '@/components/ui'

function PublishStamp({ published }: { published: boolean }) {
  const { t, statusFamily } = useTheme()
  const s = makeStyles(t)

  const fam = published ? statusFamily.mint : statusFamily.grey
  return (
    <View style={[s.stamp, { backgroundColor: fam.bg, borderColor: `${fam.ink}59` }]}>
      <Text style={[s.stampText, { color: fam.deep }]}>{published ? 'منشور' : 'غير منشور'}</Text>
    </View>
  )
}

export default function MerchantBusinessScreen() {
  const { t } = useTheme()
  const s = makeStyles(t)

  const memberships = useAuthStore((s) => s.memberships)
  const selectedBusinessId = useAuthStore((s) => s.selectedBusinessId)
  const selectBusiness = useAuthStore((s) => s.selectBusiness)
  const logout = useAuthStore((s) => s.logout)

  const choose = (businessId: string) => {
    selectBusiness(businessId)
    router.replace('/merchant/orders')
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.hero}>
          <Text style={s.heroTitle}>اختر المتجر</Text>
          <Text style={s.heroSub}>
            {memberships.length > 0
              ? 'حسابك مرتبط بأكثر من متجر — اختر الذي تديره الآن'
              : 'حسابك غير مرتبط بأي متجر بعد'}
          </Text>
        </View>

        {memberships.length === 0 ? (
          <View style={s.card}>
            <Text style={s.emptyTitle}>لا يوجد متجر مرتبط بحسابك</Text>
            <Text style={s.emptyHint}>
              أنشئ متجرك من موقع Smart Order ثم ادخل من هنا لإدارته، أو تواصل مع مالك متجرك
              ليضيفك كموظف
            </Text>
            <Button
              label="تسجيل الخروج"
              variant="outline"
              onPress={() => {
                void logout().then(() => router.replace('/merchant/login'))
              }}
            />
          </View>
        ) : (
          <View style={s.card}>
            {memberships.map((m, i) => {
              const active = m.businessId === selectedBusinessId
              return (
                <View key={m.businessId}>
                  {i > 0 ? <Hairline /> : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`اختيار متجر ${m.business.name}`}
                    onPress={() => choose(m.businessId)}
                    style={({ pressed }) => [s.bizRow, pressed && { backgroundColor: t.surface }]}
                  >
                    <View style={[s.bizWell, active && { backgroundColor: t.goldSoft }]}>
                      <StoreIcon size={22} color={active ? t.primary : t.mutedFg} />
                    </View>
                    <View style={s.bizText}>
                      <Text style={s.bizName}>{m.business.name}</Text>
                      <Text style={s.bizSlug} numberOfLines={1}>
                        {m.business.slug} · {ROLE_AR[m.role] ?? m.role}
                      </Text>
                      <PublishStamp published={m.business.isPublished} />
                    </View>
                    <Text style={s.chevron}>‹</Text>
                  </Pressable>
                </View>
              )
            })}
          </View>
        )}

        {memberships.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void logout().then(() => router.replace('/merchant/login'))
            }}
            style={({ pressed }) => [s.logoutRow, pressed && { opacity: 0.7 }]}
          >
            <LogOutIcon size={16} color={t.mutedFg} />
            <Text style={s.logoutText}>تسجيل الخروج</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.background },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },
  hero: { alignItems: 'center', paddingTop: 24, paddingBottom: 8, gap: 8 },
  heroTitle: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: t.foreground,
  },
  heroSub: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: t.mutedFg,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: t.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    padding: 16,
    gap: 4,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: t.foreground,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: t.mutedFg,
    textAlign: 'center',
    lineHeight: 20,
  },
  bizRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  bizWell: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: t.surface,
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
  chevron: { color: t.mutedFg, fontSize: 20, lineHeight: 24 },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  logoutText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: t.mutedFg,
  },
})
