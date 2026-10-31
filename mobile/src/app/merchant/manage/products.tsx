/**
 * Smart Order Mobile — منتجات التاجر (C2-REST).
 *
 * GET /api/products + /api/categories — قائمة المنتجات الحيّة برقائق
 * تصفية بالقسم (الكل/قسم/بدون قسم)، طوابع متاح/مميز، وعدّاد الأحجام
 * والإضافات. الدخول للنموذج متاح للجميع (products.read) والتحرير
 * داخل النموذج محكوم بـ products.manage؛ «منتج جديد» لمن يملكها فقط.
 */
import React, { useMemo, useState } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { fonts, type ThemeColors } from '@/constants/theme'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuthStore } from '@/state/auth'
import { fetchCategories, fetchProducts } from '@/services/merchant'
import { formatMillimes } from '@/lib/money-millimes'
import { Button, Chip, MiniStamp } from '@/components/ui'
import { EmptyState, ErrorState, LoadingState } from '@/components/state-views'

const NO_CATEGORY = '__none__'

export default function ManageProductsScreen() {
  const { t } = useTheme()
  const s = makeStyles(t)

  const [filter, setFilter] = useState<string>('ALL')
  const businessId = useAuthStore((s) => s.selectedBusinessId)
  const membership = useAuthStore((s) => s.memberships.find((m) => m.businessId === s.selectedBusinessId))
  const canManage = useMemo(() => (membership?.permissions ?? []).includes('products.manage'), [membership])

  const productsQuery = useQuery({
    queryKey: ['merchant', 'products', businessId],
    queryFn: () => fetchProducts(businessId as string),
    enabled: !!businessId,
  })
  const categoriesQuery = useQuery({
    queryKey: ['merchant', 'categories', businessId],
    queryFn: () => fetchCategories(businessId as string),
    enabled: !!businessId,
  })

  const products = useMemo(() => productsQuery.data?.products ?? [], [productsQuery.data])
  const categories = useMemo(() => categoriesQuery.data?.categories ?? [], [categoriesQuery.data])

  const filtered = useMemo(() => {
    if (filter === 'ALL') return products
    if (filter === NO_CATEGORY) return products.filter((p) => p.categoryId === null)
    return products.filter((p) => p.categoryId === filter)
  }, [products, filter])

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
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
        <View style={s.titleRow}>
          <Text style={s.title}>المنتجات</Text>
          {productsQuery.data ? <Text style={s.count}>{products.length} منتج</Text> : null}
        </View>
      </View>

      {/* تصفية بالقسم */}
      {!categoriesQuery.isPending && categories.length > 0 ? (
        <FlatList
          horizontal
          data={[{ id: 'ALL', name: 'الكل' }, ...categories.map((c) => ({ id: c.id, name: c.name })), { id: NO_CATEGORY, name: 'بدون قسم' }]}
          keyExtractor={(c) => c.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chips}
          renderItem={({ item }) => (
            <Chip label={item.name} active={filter === item.id} onPress={() => setFilter(item.id)} />
          )}
        />
      ) : null}

      {canManage ? (
        <View style={s.addAction}>
          <Button
            label="منتج جديد"
            variant="outline"
            onPress={() => {
              router.push('/merchant/manage/product/new')
            }}
            style={s.addBtn}
          />
        </View>
      ) : null}

      {productsQuery.isPending ? (
        <LoadingState label="جارٍ تحميل المنتجات…" />
      ) : productsQuery.isError ? (
        <ErrorState
          message="تعذر تحميل المنتجات — تحقق من الإنترنت وحاول مجددًا"
          onRetry={() => {
            void productsQuery.refetch()
          }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={products.length === 0 ? 'لا منتجات بعد' : 'لا منتجات في هذا القسم'}
          hint={products.length === 0 ? 'أضف أول منتج ليظهر في متجرك' : 'جرّب قسمًا آخر من الأعلى'}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={productsQuery.isRefetching}
              onRefresh={() => {
                void productsQuery.refetch()
              }}
              tintColor={t.primary}
              colors={[t.primary]}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`تعديل المنتج ${item.name}`}
              onPress={() => {
                router.push({ pathname: '/merchant/manage/product/[id]', params: { id: item.id } })
              }}
              style={({ pressed }) => [s.card, pressed && { opacity: 0.82 }]}
            >
              <View style={s.cardTop}>
                <View style={s.titleWrap}>
                  <Text style={s.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={s.meta} numberOfLines={1}>
                    {item.category?.name ?? 'بدون قسم'}
                    {item.variants.length > 0 ? ` · ${item.variants.length} حجم` : ''}
                    {item.optionGroups.length > 0 ? ` · ${item.optionGroups.length} إضافات` : ''}
                  </Text>
                </View>
                <Text style={s.price}>{formatMillimes(item.price)}</Text>
              </View>
              <View style={s.stamps}>
                {item.isFeatured ? <MiniStamp text="مميز" family="yellow" /> : null}
                {item.isAvailable ? <MiniStamp text="متاح" family="mint" /> : <MiniStamp text="غير متاح" family="grey" />}
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.background },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 2 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4 },
  backText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: t.primary,
  },
  backChevron: { color: t.primary, fontSize: 20, lineHeight: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: t.foreground,
  },
  count: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: t.mutedFg,
  },
  chips: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  addAction: { paddingHorizontal: 16, paddingBottom: 4 },
  addBtn: { flexDirection: 'row', minHeight: 46 },
  list: { padding: 16, paddingTop: 8, gap: 10, paddingBottom: 32 },
  card: {
    backgroundColor: t.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    padding: 14,
    gap: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  titleWrap: { flex: 1, gap: 3 },
  name: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: t.foreground,
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.mutedFg,
  },
  price: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: t.ring,
  },
  stamps: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
