/**
 * Smart Order Mobile — مركز الإدارة (C2-REST).
 *
 * بوابة شاشات الإدارة الثماني من تبويب «المزيد»: المنتجات، الأقسام،
 * مناطق التوصيل، طرق الدفع، إعدادات المتجر، العملاء، الفريق،
 * والتقارير. الصفوف محكومة بصلاحيات العضوية الفعلية (لا الدور) —
 * الموظف يرى ما يخص الطلبات والقراءة فقط، وأسرار الإدارة (الفريق/
 * الإعدادات/الدفع/التوصيل) تختفي كليًا لمن لا يملكها.
 */
import React, { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, type Href } from 'expo-router'
import { t } from '@/constants/theme'
import { useAuthStore } from '@/state/auth'
import { Hairline } from '@/components/ui'
import {
  ChartIcon,
  PackageIcon,
  SettingsIcon,
  TagIcon,
  TruckIcon,
  UserPlusIcon,
  UsersIcon,
  WalletIcon,
} from '@/components/icons'

interface ManageRow {
  key: string
  label: string
  hint: string
  icon: React.ComponentType<{ size?: number; color?: string }>
  href: Href
  perm: string
}

/** كتالوج الصفوف — البوابة perm من صلاحيات العضوية (الخادم يفرضها
 * على كل مسار؛ الإخفاء هنا صدمة أقل لا حماية). */
const ROWS: ManageRow[] = [
  {
    key: 'products',
    label: 'المنتجات',
    hint: 'القائمة والأسعار والأحجام والإضافات',
    icon: PackageIcon,
    href: '/merchant/manage/products',
    perm: 'products.read',
  },
  {
    key: 'categories',
    label: 'الأقسام',
    hint: 'تنظيم منتجاتك في أقسام',
    icon: TagIcon,
    href: '/merchant/manage/categories',
    perm: 'products.read',
  },
  {
    key: 'zones',
    label: 'مناطق التوصيل',
    hint: 'الرسوم والحد الأدنى لكل منطقة',
    icon: TruckIcon,
    href: '/merchant/manage/delivery-zones',
    perm: 'delivery.manage',
  },
  {
    key: 'payments',
    label: 'طرق الدفع',
    hint: 'ما يظهر لعملائك عند الدفع وترتيبه',
    icon: WalletIcon,
    href: '/merchant/manage/payment-methods',
    perm: 'payments.manage',
  },
  {
    key: 'customers',
    label: 'العملاء',
    hint: 'سجل العملاء وطلباتهم',
    icon: UsersIcon,
    href: '/merchant/manage/customers',
    perm: 'customers.read',
  },
  {
    key: 'staff',
    label: 'الفريق',
    hint: 'حسابات الموظفين وأدوارهم',
    icon: UserPlusIcon,
    href: '/merchant/manage/staff',
    perm: 'staff.manage',
  },
  {
    key: 'reports',
    label: 'التقارير',
    hint: 'الإيرادات والطلبات على نافذة تختارها',
    icon: ChartIcon,
    href: '/merchant/manage/reports',
    perm: 'orders.read',
  },
  {
    key: 'settings',
    label: 'إعدادات المتجر',
    hint: 'الاسم والتواصل والنشر ورابط المتجر',
    icon: SettingsIcon,
    href: '/merchant/manage/settings',
    perm: 'settings.manage',
  },
]

export default function ManageHubScreen() {
  const membership = useAuthStore((s) => s.memberships.find((m) => m.businessId === s.selectedBusinessId))
  const businessName = membership?.business.name ?? ''

  const perms = useMemo(() => new Set(membership?.permissions ?? []), [membership])
  const rows = useMemo(() => ROWS.filter((r) => perms.has(r.perm)), [perms])

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="رجوع"
            onPress={() => router.back()}
            style={({ pressed }) => [s.backRow, pressed && { opacity: 0.6 }]}
          >
            <Text style={s.backText}>رجوع</Text>
            <Text style={s.backChevron}>‹</Text>
          </Pressable>
          <Text style={s.title}>الإدارة</Text>
          <Text style={s.sub} numberOfLines={1}>
            {businessName}
          </Text>
        </View>

        <View style={s.card}>
          {rows.map((row, i) => {
            const Icon = row.icon
            return (
              <View key={row.key}>
                {i > 0 ? <Hairline /> : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={row.label}
                  onPress={() => {
                    router.push(row.href)
                  }}
                  style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}
                >
                  <View style={s.iconWell}>
                    <Icon size={20} color={t.primary} />
                  </View>
                  <View style={s.rowText}>
                    <Text style={s.rowLabel}>{row.label}</Text>
                    <Text style={s.rowHint} numberOfLines={1}>
                      {row.hint}
                    </Text>
                  </View>
                  <Text style={s.chevron}>‹</Text>
                </Pressable>
              </View>
            )
          })}
        </View>

        <Text style={s.footHint}>
          الصلاحيات التي لا تملكها مخفية عنك هنا — الخادم يفرضها على كل مسار على أي حال
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.background },
  scroll: { padding: 16, gap: 12, paddingBottom: 32 },
  header: { gap: 2, paddingBottom: 4 },
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
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: t.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  rowLabel: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 14.5,
    color: t.foreground,
  },
  rowHint: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 12,
    color: t.mutedFg,
  },
  chevron: { color: t.mutedFg, fontSize: 20, lineHeight: 24 },
  footHint: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 12,
    color: t.mutedFg,
    textAlign: 'center',
    lineHeight: 18,
    paddingTop: 4,
  },
})
