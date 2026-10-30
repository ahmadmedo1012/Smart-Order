/**
 * Smart Order Mobile — شاشة المتجر: القائمة بالتصنيفات.
 *
 * نفس بنية واجهة الويب: شريط تصنيفات أفقي لاصق + شبكة/قائمة أصناف
 * (المميز أولاً — ترتيب الخادم نفسه) + شريط سلة سفلي عائم بعدد
 * القطع والإجمالي الفرعي.
 */
import React, { useEffect, useMemo, useState } from 'react'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { t } from '@/constants/theme'
import { fetchStorefront } from '@/services/storefront'
import { useCart, zoneById } from '@/state/cart'
import { cartTotals } from '@/state/pricing'
import { rememberStore } from '@/state/recents'
import { formatLyd } from '@/lib/money'
import { CartIcon } from '@/components/icons'
import { Chip } from '@/components/ui'
import { EmptyState, ErrorState, LoadingState } from '@/components/state-views'

export default function StoreScreen() {
  const params = useLocalSearchParams<{ slug: string; name?: string }>()
  const slug = typeof params.slug === 'string' ? params.slug : ''
  const [activeCat, setActiveCat] = useState<string | 'ALL'>('ALL')

  const query = useQuery({
    queryKey: ['storefront', slug],
    queryFn: () => fetchStorefront(slug),
    enabled: slug.length > 0,
  })

  const cart = useCart()
  const data = query.data

  // تثبيت المتجر في السلة + قائمة المتاجر الأخيرة.
  useEffect(() => {
    if (data?.business) {
      cart.setStore(data.business.slug, data.business.name)
      rememberStore(data.business.slug, data.business.name).catch(() => undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.business?.slug])

  const products = useMemo(() => {
    if (!data) return []
    if (activeCat === 'ALL') return data.products
    return data.products.filter((p) => p.categoryId === activeCat)
  }, [data, activeCat])

  if (query.isLoading) return <LoadingState label="جارٍ فتح المتجر…" />
  if (query.isError)
    return (
      <ErrorState
        message={query.error instanceof Error ? query.error.message : undefined}
        onRetry={() => query.refetch()}
      />
    )
  if (!data) return <EmptyState title="المتجر فارغ" />

  const zone = zoneById(data.deliveryZones, cart.zoneId)
  const totals = cartTotals(
    cart.lines.map((l) => ({ ...l })),
    cart.fulfillment,
    zone,
  )

  const openProduct = (productId: string) => {
    router.push({ pathname: '/product/[id]', params: { id: productId, slug } })
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* ترويسة المتجر */}
      <View style={s.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>→</Text>
        </Pressable>
        <View style={s.headerText}>
          <Text style={s.storeName} numberOfLines={1}>
            {data.business.name}
          </Text>
          {data.business.city ? <Text style={s.storeCity}>{data.business.city}</Text> : null}
        </View>
        {data.business.logoUrl ? (
          <Image source={{ uri: data.business.logoUrl }} style={s.logo} contentFit="cover" />
        ) : (
          <View style={[s.logo, s.logoFallback]}>
            <Text style={s.logoFallbackText}>{data.business.name.slice(0, 1)}</Text>
          </View>
        )}
      </View>

      {/* شريط التصنيفات */}
      {data.categories.length > 0 ? (
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.cats}
          >
            <Chip label="الكل" active={activeCat === 'ALL'} onPress={() => setActiveCat('ALL')} />
            {data.categories.map((c) => (
              <Chip key={c.id} label={c.name} active={activeCat === c.id} onPress={() => setActiveCat(c.id)} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* قائمة الأصناف */}
      <ScrollView contentContainerStyle={s.list}>
        {products.length === 0 ? (
          <EmptyState title="لا أصناف في هذا القسم حاليًا" />
        ) : (
          products.map((p) => (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              onPress={() => openProduct(p.id)}
              style={({ pressed }) => [s.product, pressed && { transform: [{ scale: 0.985 }] }]}
            >
              <View style={s.productText}>
                <View style={s.productTitleRow}>
                  {p.isFeatured ? <View style={s.starWell}><Text style={s.star}>★</Text></View> : null}
                  <Text style={s.productName} numberOfLines={1}>
                    {p.name}
                  </Text>
                </View>
                {p.description ? (
                  <Text style={s.productDesc} numberOfLines={2}>
                    {p.description}
                  </Text>
                ) : null}
                <Text style={s.productPrice}>{formatLyd(p.price)}</Text>
                {!p.isAvailable ? (
                  <View style={s.unavailable}>
                    <Text style={s.unavailableText}>غير متوفر حاليًا</Text>
                  </View>
                ) : p.variants.length > 0 || p.optionGroups.length > 0 ? (
                  <Text style={s.optionsHint}>خيارات متعددة</Text>
                ) : null}
              </View>
              {p.imageUrl ? (
                <Image source={{ uri: p.imageUrl }} style={s.productImage} contentFit="cover" />
              ) : (
                <View style={[s.productImage, s.imageFallback]}>
                  <Text style={s.imageFallbackText}>{p.name.slice(0, 1)}</Text>
                </View>
              )}
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* شريط السلة */}
      {cart.lines.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/cart', params: { slug } })}
          style={({ pressed }) => [s.cartBar, pressed && { opacity: 0.9 }]}
        >
          <View style={s.cartCount}>
            <CartIcon size={16} color={t.primaryFg} />
            <Text style={s.cartCountText}>{totals.count}</Text>
          </View>
          <Text style={s.cartTotal}>{formatLyd(totals.subtotal)}</Text>
          <Text style={s.cartCta}>إتمام الطلب</Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: t.card,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { color: t.primary, fontSize: 22, lineHeight: 26 },
  headerText: { flex: 1, gap: 1 },
  storeName: {
    fontFamily: 'IBMPlexSansArabic_700Bold',
    fontSize: 17,
    color: t.foreground,
  },
  storeCity: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 12,
    color: t.mutedFg,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: t.goldSoft,
  },
  logoFallback: { alignItems: 'center', justifyContent: 'center' },
  logoFallbackText: {
    fontFamily: 'IBMPlexSansArabic_700Bold',
    fontSize: 18,
    color: t.ring,
  },
  cats: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: t.background,
  },
  list: { padding: 16, gap: 10, paddingBottom: 110 },
  product: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 14,
    padding: 12,
  },
  productText: { flex: 1, gap: 6 },
  productTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  starWell: {
    backgroundColor: t.goldSoft,
    borderRadius: 6,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: { color: t.ring, fontSize: 12 },
  productName: {
    flex: 1,
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 15,
    color: t.foreground,
  },
  productDesc: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 12.5,
    color: t.mutedFg,
    lineHeight: 19,
  },
  productPrice: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 14,
    color: t.primary,
  },
  optionsHint: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 11.5,
    color: t.mutedFg,
  },
  unavailable: {
    alignSelf: 'flex-start',
    backgroundColor: t.surface,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  unavailableText: {
    fontFamily: 'IBMPlexSansArabic_500Medium',
    fontSize: 11,
    color: t.mutedFg,
  },
  productImage: {
    width: 86,
    height: 86,
    borderRadius: 12,
    backgroundColor: t.goldSoft,
  },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  imageFallbackText: {
    fontFamily: 'IBMPlexSansArabic_700Bold',
    fontSize: 26,
    color: t.ring,
  },
  cartBar: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    backgroundColor: t.primary,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    shadowColor: '#1B2A41',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  cartCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  cartCountText: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 13,
    color: t.primaryFg,
  },
  cartTotal: {
    flex: 1,
    fontFamily: 'IBMPlexSansArabic_700Bold',
    fontSize: 15,
    color: t.primaryFg,
  },
  cartCta: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 14,
    color: t.primaryFg,
  },
})
