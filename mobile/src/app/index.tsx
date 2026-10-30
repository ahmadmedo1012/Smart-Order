/**
 * Smart Order Mobile — الشاشة الأولى: بوابة المتاجر.
 *
 * رمز المتجر (slug) → فتح الواجهة. المتاجر الأخيرة أولاً (AsyncStorage)،
 * ثم إدخال الرمز يدويًا. رحلة الضيف كاملة بلا حساب: تصفّح → سلّة →
 * طلب → تتبّع.
 */
import React, { useCallback, useEffect, useState } from 'react'
import { router } from 'expo-router'
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { queryClient } from '@/lib/query-client'
import { t } from '@/constants/theme'
import { fetchStorefront, ApiError, NetworkError } from '@/services/storefront'
import { readRecents, type RecentStore } from '@/state/recents'
import { SearchIcon, StoreIcon, TruckIcon } from '@/components/icons'
import { Button, Hairline } from '@/components/ui'
import { WEB_BASE_URL } from '@/constants/config'

export default function LookupScreen() {
  const [code, setCode] = useState('')
  const [recents, setRecents] = useState<RecentStore[]>([])
  const [opening, setOpening] = useState(false)

  useEffect(() => {
    readRecents().then(setRecents)
  }, [])

  const slug = code.trim().toLowerCase().replace(/^https?:\/\/[^/]+\//, '').replace(/\/.*$/, '')

  /**
   * فتح المتجر: استعلام مباشر (بلا effect) — تعبئة ذاكرة الاستعلام
   * نفسها كي تجدها شاشة المتجر فورًا، ثم دفع المسار.
   */
  const open = useCallback(async () => {
    if (slug.length < 2 || opening) return
    setOpening(true)
    try {
      const data = await queryClient.ensureQueryData({
        queryKey: ['storefront', slug],
        queryFn: () => fetchStorefront(slug),
      })
      router.push({
        pathname: '/store/[slug]',
        params: { slug: data.business.slug, name: data.business.name },
      })
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 404
          ? 'لم نجد متجرًا بهذا الرمز — تأكد منه وحاول مجددًا'
          : err instanceof ApiError && err.status === 403
            ? 'هذا المتجر لم يُنشر بعد'
            : err instanceof NetworkError
              ? 'تعذر الاتصال — تحقق من الإنترنت وحاول مجددًا'
              : 'تعذر فتح المتجر الآن — حاول بعد قليل'
      Alert.alert('المتجر غير متاح', msg)
    } finally {
      setOpening(false)
    }
  }, [slug, opening])

  const openRecent = useCallback((r: RecentStore) => {
    router.push({ pathname: '/store/[slug]', params: { slug: r.slug, name: r.name } })
  }, [])

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* الترويسة */}
        <View style={s.hero}>
          <View style={s.markWell}>
            <StoreIcon size={34} color={t.primary} />
          </View>
          <Text style={s.heroTitle}>Smart Order</Text>
          <Text style={s.heroSub}>متجر الطلبات الرقمي — اطلب من مطعمك المفضل وتتبّع طلبك لحظة بلحظة</Text>
        </View>

        {/* إدخال الرمز */}
        <View style={s.card}>
          <Text style={s.cardTitle}>افتح متجرك</Text>
          <Text style={s.cardHint}>
            أدخل رمز المتجر كما أعطاك إياه صاحب المتجر (مثال: <Text style={s.mono}>family-kitchen</Text>)، أو
            امسح رابط QR/المشاركة فسيفتح التطبيق مباشرة.
          </Text>
          <View style={s.row}>
            <View style={s.inputWrap}>
              <SearchIcon size={18} color={t.mutedFg} />
              <TextInput
                style={s.input}
                placeholder="رمز المتجر…"
                placeholderTextColor={t.mutedFg}
                autoCapitalize="none"
                autoCorrect={false}
                value={code}
                onChangeText={setCode}
                onSubmitEditing={() => {
                  void open()
                }}
              />
            </View>
            <Button
              label={opening ? 'جارٍ الفتح…' : 'فتح'}
              onPress={() => {
                void open()
              }}
              disabled={slug.length < 2 || opening}
              style={s.openBtn}
            />
          </View>
        </View>

        {/* المتاجر الأخيرة */}
        {recents.length > 0 ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>متاجرك الأخيرة</Text>
            {recents.map((r, i) => (
              <View key={r.slug}>
                {i > 0 ? <Hairline /> : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openRecent(r)}
                  style={({ pressed }) => [s.recentRow, pressed && { backgroundColor: t.surface }]}
                >
                  <StoreIcon size={20} color={t.primary} />
                  <View style={s.recentText}>
                    <Text style={s.recentName}>{r.name}</Text>
                    <Text style={s.recentSlug} numberOfLines={1}>
                      {r.slug}
                    </Text>
                  </View>
                  <Text style={s.chevron}>‹</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {/* كيف يعمل */}
        <View style={s.card}>
          <Text style={s.cardTitle}>كيف يعمل؟</Text>
          <View style={s.stepRow}>
            <View style={s.stepDot}>
              <Text style={s.stepNum}>١</Text>
            </View>
            <View style={s.stepText}>
              <Text style={s.stepTitle}>افتح المتجر برمزه</Text>
              <Text style={s.stepHint}>كل متجر له رمز قصير يشاركه صاحبه</Text>
            </View>
          </View>
          <View style={s.stepRow}>
            <View style={s.stepDot}>
              <Text style={s.stepNum}>٢</Text>
            </View>
            <View style={s.stepText}>
              <Text style={s.stepTitle}>اختر أصنافك وأرسل الطلب</Text>
              <Text style={s.stepHint}>إضافات ونِسَب، توصيل أو استلام، والدفع محلي</Text>
            </View>
          </View>
          <View style={s.stepRow}>
            <View style={s.stepDot}>
              <Text style={s.stepNum}>٣</Text>
            </View>
            <View style={s.stepText}>
              <Text style={s.stepTitle}>تتبّع طلبك حتى الباب</Text>
              <Text style={s.stepHint}>رابط تتبّع خاص بطلبك يعيش بعد الإرسال</Text>
            </View>
          </View>
        </View>

        {/* وصلة الويب */}
        <Pressable
          accessibilityRole="link"
          onPress={() => Linking.openURL(WEB_BASE_URL).catch(() => undefined)}
          style={({ pressed }) => [s.webRow, pressed && { opacity: 0.7 }]}
        >
          <TruckIcon size={16} color={t.mutedFg} />
          <Text style={s.webText}>لديك متجر؟ أنشئه من موقع Smart Order</Text>
          <Text style={s.chevron}>‹</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.background },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },
  hero: { alignItems: 'center', paddingTop: 24, paddingBottom: 8, gap: 10 },
  markWell: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: t.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontFamily: 'IBMPlexSansArabic_700Bold',
    fontSize: 26,
    color: t.foreground,
  },
  heroSub: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
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
    gap: 12,
  },
  cardTitle: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 15,
    color: t.foreground,
  },
  cardHint: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 13,
    color: t.mutedFg,
    lineHeight: 20,
  },
  mono: { fontFamily: 'IBMPlexSansArabic_500Medium', color: t.ring },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: t.background,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 15,
    color: t.foreground,
    paddingVertical: 8,
    textAlign: 'right',
  },
  openBtn: { minHeight: 48, paddingHorizontal: 24 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderRadius: 10,
    paddingHorizontal: 4,
  },
  recentText: { flex: 1, gap: 2 },
  recentName: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 14,
    color: t.foreground,
  },
  recentSlug: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 12,
    color: t.mutedFg,
  },
  chevron: { color: t.mutedFg, fontSize: 20, lineHeight: 24 },
  stepRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: t.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: { fontFamily: 'IBMPlexSansArabic_600SemiBold', fontSize: 13, color: t.ring },
  stepText: { flex: 1, gap: 2 },
  stepTitle: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 14,
    color: t.foreground,
  },
  stepHint: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 12.5,
    color: t.mutedFg,
    lineHeight: 19,
  },
  webRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  webText: {
    fontFamily: 'IBMPlexSansArabic_500Medium',
    fontSize: 13,
    color: t.mutedFg,
  },
})
