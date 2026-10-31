/**
 * Smart Order Mobile — العملاء (C2-REST، M4).
 *
 * GET /api/customers?businessId&q — سجل عملاء المتجر مع إثراء الخادم:
 * عدد الطلبات، إجمالي المدفوع (مليم)، متوسط الطلب، وآخر طلب. بحث
 * فوري بالاسم أو رقم الهاتف مع مهلة 350ms (لا نداء لكل حرف). لمس
 * العميل يفتح ملفه الكامل مع سجل طلباته. القائمة مقيّدة بـ 200 من
 * الخادم — يظهر تنبيه الحد مع تلميح تضييق البحث.
 */
import React, { useEffect, useMemo, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { fonts, type ThemeColors } from '@/constants/theme'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuthStore } from '@/state/auth'
import { fetchCustomers } from '@/services/merchant'
import { formatNumber } from '@/lib/money'
import { formatMillimes } from '@/lib/money-millimes'
import { formatArabicDate } from '@/lib/datetime'
import { Hairline } from '@/components/ui'
import { EmptyState, ErrorState, LoadingState } from '@/components/state-views'
import { SearchIcon, UserIcon } from '@/components/icons'

/** حد الخادم (take: 200) — نُظهره بصدق عند بلوغه. */
const SERVER_CAP = 200

export default function ManageCustomersScreen() {
  const { t } = useTheme()
  const s = makeStyles(t)

  const businessId = useAuthStore((s) => s.selectedBusinessId)
  const membership = useAuthStore((s) => s.memberships.find((m) => m.businessId === s.selectedBusinessId))
  const canRead = useMemo(() => (membership?.permissions ?? []).includes('customers.read'), [membership])

  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')

  // مهلة بحث قصيرة — الكتابة السريعة لا تشعل نداء لكل حرف.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 350)
    return () => clearTimeout(timer)
  }, [q])

  const query = useQuery({
    queryKey: ['merchant', 'customers', businessId, debouncedQ],
    queryFn: () => fetchCustomers(businessId as string, debouncedQ),
    enabled: !!businessId && canRead,
  })
  const customers = useMemo(() => query.data ?? [], [query.data])
  const searching = q.trim() !== debouncedQ

  if (!canRead) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <ErrorState message="هذه الشاشة تتطلب صلاحية الاطلاع على العملاء" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
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
        <Text style={s.title}>العملاء</Text>
        <Text style={s.sub}>سجل عملاء متجرك وطلباتهم — يُضاف العميل تلقائيًا مع أول طلب</Text>

        {/* البحث */}
        <View style={s.searchBox}>
          <SearchIcon size={17} color={t.mutedFg} />
          <TextInput
            accessibilityLabel="البحث في العملاء"
            value={q}
            onChangeText={setQ}
            placeholder="ابحث بالاسم أو رقم الهاتف"
            placeholderTextColor={t.mutedFg}
            style={s.searchInput}
            inputMode="search"
          />
          {q.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="مسح البحث"
              onPress={() => {
                setQ('')
              }}
              style={({ pressed }) => [s.clearBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={s.clearText}>✕</Text>
            </Pressable>
          ) : null}
        </View>

        {searching ? <Text style={s.searchingHint}>جارٍ البحث…</Text> : null}

        {query.isPending ? (
          <LoadingState label="جارٍ تحميل العملاء…" />
        ) : query.isError ? (
          <ErrorState
            message="تعذر تحميل العملاء — تحقق من الإنترنت وحاول مجددًا"
            onRetry={() => {
              void query.refetch()
            }}
          />
        ) : customers.length === 0 ? (
          debouncedQ ? (
            <EmptyState title={`لا نتائج تطابق «${debouncedQ}»`} hint="جرّب اسمًا آخر أو رقم هاتف مختلف" />
          ) : (
            <EmptyState title="لا عملاء بعد" hint="يُضاف العملاء تلقائيًا مع أول طلب من متجرك" />
          )
        ) : (
          <View style={s.card}>
            {customers.map((c, i) => (
              <View key={c.id}>
                {i > 0 ? <Hairline /> : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`ملف ${c.name}`}
                  onPress={() => {
                    router.push({ pathname: '/merchant/manage/customer/[id]', params: { id: c.id } })
                  }}
                  style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}
                >
                  <View style={s.iconWell}>
                    <UserIcon size={18} color={t.primary} />
                  </View>
                  <View style={s.rowText}>
                    <Text style={s.rowName} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text style={s.rowMeta} numberOfLines={1}>
                      {c.phone}
                    </Text>
                    <Text style={s.rowMeta} numberOfLines={1}>
                      {formatNumber(c.orderCount)} طلب · {formatMillimes(c.totalSpent)}
                    </Text>
                    {c.lastOrderAt ? (
                      <Text style={s.rowMeta}>آخر طلب: {formatArabicDate(c.lastOrderAt)}</Text>
                    ) : null}
                  </View>
                  <Text style={s.chevron}>‹</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {customers.length >= SERVER_CAP ? (
          <Text style={s.footHint}>
            أول {formatNumber(SERVER_CAP)} نتيجة — ضيّق البحث بالاسم أو الرقم لرؤية عملاء محددين
          </Text>
        ) : null}
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  searchInput: {
    flex: 1,
    color: t.foreground,
    fontFamily: fonts.regular,
    fontSize: 14.5,
    paddingVertical: 8,
    textAlign: 'right',
  },
  clearBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  clearText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: t.mutedFg,
  },
  searchingHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.mutedFg,
    textAlign: 'center',
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
  chevron: { color: t.mutedFg, fontSize: 20, lineHeight: 24 },
  footHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.mutedFg,
    textAlign: 'center',
    lineHeight: 18,
  },
})
