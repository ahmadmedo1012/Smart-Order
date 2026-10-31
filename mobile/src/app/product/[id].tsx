/**
 * Smart Order Mobile — شاشة الصنف: النسخ والإضافات والكمية والملاحظة.
 *
 * نفس منطق product-dialog في الويب: نسخة واحدة اختيارية، مجموعات
 * إضافات بحد أدنى/أقصى (الإلزامية تحرس الإضافة)، وملاحظة سطر
 * قصيرة. السعر يعاد حسابه حيًا بمعادلة الخادم.
 */
import React, { useMemo, useState } from 'react'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { fonts, type ThemeColors } from '@/constants/theme'
import { useTheme } from '@/theme/ThemeProvider'
import { fetchStorefront } from '@/services/storefront'
import { unitPriceFor } from '@/state/pricing'
import { useCart } from '@/state/cart'
import { formatLyd } from '@/lib/money'
import { MinusIcon, PlusIcon } from '@/components/icons'
import { Button } from '@/components/ui'
import { ErrorState, LoadingState } from '@/components/state-views'

export default function ProductScreen() {
  const { t } = useTheme()
  const s = makeStyles(t)

  const params = useLocalSearchParams<{ id: string; slug: string }>()
  const productId = typeof params.id === 'string' ? params.id : ''
  const slug = typeof params.slug === 'string' ? params.slug : ''

  const query = useQuery({
    queryKey: ['storefront', slug],
    queryFn: () => fetchStorefront(slug),
    enabled: slug.length > 0,
  })

  const product = useMemo(
    () => query.data?.products.find((p) => p.id === productId) ?? null,
    [query.data, productId],
  )

  const [variantId, setVariantId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Record<string, string[]>>({})
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)

  const cart = useCart()

  if (query.isLoading) return <LoadingState label="جارٍ فتح الصنف…" />
  if (query.isError)
    return (
      <ErrorState
        message={query.error instanceof Error ? query.error.message : undefined}
        onRetry={() => query.refetch()}
      />
    )
  if (!product) return <ErrorState message="الصنف غير موجود" />

  const price = unitPriceFor(product, variantId, Object.values(selected).flat())

  const groupValid = (g: (typeof product.optionGroups)[number]) => {
    const count = (selected[g.id] ?? []).length
    if (g.required && g.minSelect > 0 && count < g.minSelect) return false
    if (g.maxSelect > 0 && count > g.maxSelect) return false
    return true
  }
  const allValid = product.optionGroups.every(groupValid)

  const toggleOption = (groupId: string, optionId: string, maxSelect: number) => {
    setTouched(true)
    setSelected((prev) => {
      const cur = prev[groupId] ?? []
      if (cur.includes(optionId)) {
        return { ...prev, [groupId]: cur.filter((x) => x !== optionId) }
      }
      if (maxSelect > 0 && cur.length >= maxSelect) {
        // حد أقصى: استبدل الأقدم (سلوك الويب للمفرد = تبديل)
        if (maxSelect === 1) return { ...prev, [groupId]: [optionId] }
        return prev
      }
      return { ...prev, [groupId]: [...cur, optionId] }
    })
  }

  const add = () => {
    setTouched(true)
    if (!product.isAvailable || !allValid) return
    cart.addLine(product, {
      variantId,
      optionIds: Object.values(selected).flat(),
      note: note.trim(),
      quantity,
    })
    router.back()
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* الترويسة البصرية */}
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={s.heroImage} contentFit="cover" />
        ) : (
          <View style={[s.heroImage, s.heroFallback]}>
            <Text style={s.heroFallbackText}>{product.name.slice(0, 1)}</Text>
          </View>
        )}

        <View style={s.body}>
          <Text style={s.name}>{product.name}</Text>
          {product.description ? (
            <Text style={s.desc}>{product.description}</Text>
          ) : null}

          {/* النسخ */}
          {product.variants.length > 0 ? (
            <View style={s.section}>
              <Text style={s.sectionTitle}>اختر الحجم</Text>
              <View style={s.pills}>
                {product.variants.map((v) => {
                  const active = variantId === v.id
                  return (
                    <Pressable
                      key={v.id}
                      accessibilityRole="button"
                      onPress={() => setVariantId(active ? null : v.id)}
                      style={({ pressed }) => [
                        s.pill,
                        active && s.pillActive,
                        pressed && { opacity: 0.75 },
                      ]}
                    >
                      <Text style={[s.pillText, active && s.pillTextActive]}>{v.name}</Text>
                      {v.priceDelta !== 0 ? (
                        <Text style={[s.pillDelta, active && s.pillTextActive]}>
                          {v.priceDelta > 0 ? '+' : ''}
                          {formatLyd(v.priceDelta)}
                        </Text>
                      ) : null}
                    </Pressable>
                  )
                })}
              </View>
            </View>
          ) : null}

          {/* مجموعات الإضافات */}
          {product.optionGroups.map((g) => {
            const count = (selected[g.id] ?? []).length
            const invalid = touched && !groupValid(g)
            return (
              <View key={g.id} style={s.section}>
                <Text style={s.sectionTitle}>
                  {g.name}
                  {g.required ? <Text style={s.requiredMark}> (إلزامي)</Text> : null}
                </Text>
                {g.maxSelect > 1 ? (
                  <Text style={s.sectionHint}>
                    اختر حتى {g.maxSelect} {count > 0 ? `— مختار ${count}` : ''}
                  </Text>
                ) : null}
                {invalid ? (
                  <Text style={s.invalidHint}>
                    {g.minSelect > 0 ? `اختر ${g.minSelect} على الأقل` : 'اختيار غير مكتمل'}
                  </Text>
                ) : null}
                <View style={s.pills}>
                  {g.options.map((o) => {
                    const active = (selected[g.id] ?? []).includes(o.id)
                    return (
                      <Pressable
                        key={o.id}
                        accessibilityRole="button"
                        onPress={() => toggleOption(g.id, o.id, g.maxSelect)}
                        style={({ pressed }) => [
                          s.pill,
                          active && s.pillActive,
                          pressed && { opacity: 0.75 },
                        ]}
                      >
                        <Text style={[s.pillText, active && s.pillTextActive]}>{o.name}</Text>
                        {o.priceDelta !== 0 ? (
                          <Text style={[s.pillDelta, active && s.pillTextActive]}>
                            {o.priceDelta > 0 ? '+' : ''}
                            {formatLyd(o.priceDelta)}
                          </Text>
                        ) : null}
                      </Pressable>
                    )
                  })}
                </View>
              </View>
            )
          })}

          {/* الملاحظة */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>ملاحظة (اختياري)</Text>
            <View style={s.noteWrap}>
              <TextInput
                style={s.note}
                placeholder="مثال: بلا بصل، صوص جانبي…"
                placeholderTextColor={t.mutedFg}
                value={note}
                onChangeText={setNote}
                maxLength={200}
                multiline
              />
            </View>
          </View>

          {/* الكمية */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>الكمية</Text>
            <View style={s.qtyRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="زيادة الكمية"
                onPress={() => setQuantity((q) => Math.min(q + 1, 99))}
                style={s.qtyBtn}
              >
                <PlusIcon size={18} color={t.primary} />
              </Pressable>
              <Text style={s.qtyText}>{quantity}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="إنقاص الكمية"
                onPress={() => setQuantity((q) => Math.max(q - 1, 1))}
                style={s.qtyBtn}
              >
                <MinusIcon size={18} color={t.primary} />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* شريط الإضافة */}
      <View style={s.footer}>
        <View style={s.footerPrice}>
          <Text style={s.footerTotalLabel}>الإجمالي</Text>
          <Text style={s.footerTotal}>{formatLyd(price * quantity)}</Text>
        </View>
        <Button
          label={product.isAvailable ? 'أضف إلى السلة' : 'غير متوفر حاليًا'}
          onPress={add}
          disabled={!product.isAvailable || !allValid}
          style={s.addBtn}
        />
      </View>
    </SafeAreaView>
  )
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.background },
  scroll: { paddingBottom: 16 },
  heroImage: { width: '100%', height: 220, backgroundColor: t.goldSoft },
  heroFallback: { alignItems: 'center', justifyContent: 'center' },
  heroFallbackText: { fontFamily: fonts.bold, fontSize: 64, color: t.ring },
  body: { padding: 16, gap: 18 },
  name: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: t.foreground,
  },
  desc: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: t.mutedFg,
    lineHeight: 22,
  },
  section: { gap: 10 },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: t.foreground,
  },
  requiredMark: { color: t.primary, fontSize: 13 },
  sectionHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.mutedFg,
    marginTop: -6,
  },
  invalidHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.destructive,
    marginTop: -6,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  pillActive: { backgroundColor: t.primary, borderColor: t.primary },
  pillText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: t.foreground,
  },
  pillTextActive: { color: t.primaryFg },
  pillDelta: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: t.mutedFg,
  },
  noteWrap: {
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  note: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: t.foreground,
    textAlign: 'right',
    minHeight: 44,
  },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: t.foreground,
    minWidth: 34,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    backgroundColor: t.card,
    borderTopWidth: 1,
    borderTopColor: t.border,
  },
  footerPrice: { flex: 1, gap: 0 },
  footerTotalLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: t.mutedFg,
  },
  footerTotal: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: t.primary,
  },
  addBtn: { minWidth: 170 },
})
