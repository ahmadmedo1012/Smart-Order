/**
 * Smart Order Mobile — إعدادات المتجر (C2-REST، M4).
 *
 * GET/PATCH /api/business — بيانات المتجر الأساسية: الاسم، واتساب،
 * الهاتف، المدينة، العنوان، وتذييل الإيصال. النشر (isPublished) يُقلب
 * بتأكيد صريح في الاتجاهين: النشر يجعل المتجر مرئيًا للعملاء، وإيقافه
 * يخفيه فورًا — والخادم قد يرفض النشر برفق (200 مع published:false
 * وسبب عربي: لا نشر بلا قسم ومنتج متاح) فيظهر السبب في تنبيه.
 * رابط المتجر https://order.smart-link.ly/store/{slug} قابل للنسخ
 * والمشاركة. الشاشة كلها محكومة بـ settings.manage.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as Clipboard from 'expo-clipboard'
import { t } from '@/constants/theme'
import { WEB_BASE_URL } from '@/constants/config'
import { useAuthStore } from '@/state/auth'
import { fetchBusiness, updateBusiness } from '@/services/merchant'
import { apiErrorMessage } from '@/lib/api-error'
import { Button, Field, Hairline, MiniStamp, Toggle } from '@/components/ui'
import { EmptyState, ErrorState, LoadingState } from '@/components/state-views'
import { showToast } from '@/components/toast'
import { CopyIcon, ShareIcon } from '@/components/icons'

/** نموذج التحرير — القيم الاختيارية سلاسل قد تكون فارغة (تُرسل null
 *  لتفريغ الحقل فعليًا؛ هذا سلوك «ما تراه هو ما يُحفظ»). */
interface SettingsForm {
  name: string
  whatsapp: string
  phone: string
  city: string
  address: string
  receiptFooter: string
}

function seedForm(business: {
  name: string
  whatsappNumber: string | null
  phone: string | null
  city: string | null
  address: string | null
  receiptFooter: string | null
}): SettingsForm {
  return {
    name: business.name,
    whatsapp: business.whatsappNumber ?? '',
    phone: business.phone ?? '',
    city: business.city ?? '',
    address: business.address ?? '',
    receiptFooter: business.receiptFooter ?? '',
  }
}

/** هل الاستجابة رفضًا رقيقًا للنشر (200 مع published:false)؟ */
function isPublishRefusal(
  res: { business?: unknown } | { published?: boolean; reason?: string },
): res is { published: false; reason: string } {
  return 'published' in res && res.published === false
}

export default function ManageSettingsScreen() {
  const businessId = useAuthStore((s) => s.selectedBusinessId)
  const membership = useAuthStore((s) => s.memberships.find((m) => m.businessId === s.selectedBusinessId))
  const canManage = useMemo(() => (membership?.permissions ?? []).includes('settings.manage'), [membership])

  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['merchant', 'settings', businessId],
    queryFn: () => fetchBusiness(businessId as string),
    enabled: !!businessId && canManage,
  })
  const business = query.data?.business

  // بذر النموذج مرة لكل متجر — السحب للتحديث لا يمسح تعديلات جارية.
  const seededIdRef = useRef<string | null>(null)
  const [form, setForm] = useState<SettingsForm | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)

  useEffect(() => {
    if (business && seededIdRef.current !== business.id) {
      seededIdRef.current = business.id
      setForm(seedForm(business))
    }
  }, [business])

  /** حفظ بيانات المتجر — الحقول الفارغة تُرسل null (تفريغ مقصود). */
  const saveMutation = useMutation({
    mutationFn: (input: {
      name: string
      whatsappNumber: string | null
      phone: string | null
      city: string | null
      address: string | null
      receiptFooter: string | null
    }) => updateBusiness(businessId as string, input),
    onSuccess: async () => {
      showToast('تم حفظ الإعدادات')
      await queryClient.invalidateQueries({ queryKey: ['merchant'] })
    },
    onError: (err) => {
      Alert.alert('تعذّر الحفظ', apiErrorMessage(err, 'تعذّر حفظ الإعدادات — حاول بعد قليل'))
    },
  })

  /** قلب حالة النشر — الاستجابة قد تكون رفضًا رقيقًا (published:false). */
  const publishMutation = useMutation({
    mutationFn: (next: boolean) => updateBusiness(businessId as string, { isPublished: next }),
    onSuccess: async (res) => {
      if (isPublishRefusal(res)) {
        Alert.alert('لم يتم النشر', res.reason)
      } else {
        showToast(res.business.isPublished ? 'تم نشر المتجر' : 'تم إيقاف النشر')
      }
      await queryClient.invalidateQueries({ queryKey: ['merchant'] })
    },
    onError: (err) => {
      Alert.alert('تعذّر تغيير حالة النشر', apiErrorMessage(err, 'تعذّر تغيير حالة النشر — حاول بعد قليل'))
    },
  })

  const busy = saveMutation.isPending || publishMutation.isPending

  /** تأكيد قبل القلب في الاتجاهين — كلاهما يغيّر ما يراه العملاء فورًا. */
  function confirmPublish(next: boolean) {
    if (busy) return
    if (next) {
      Alert.alert('نشر المتجر؟', 'سيصبح متجرك مرئيًا للعملاء ويمكنهم تقديم الطلبات فورًا', [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'نشر المتجر', onPress: () => publishMutation.mutate(true) },
      ])
    } else {
      Alert.alert('إيقاف النشر؟', 'لن يظهر متجرك للعملاء ولن يستطيعوا الطلب حتى تعيد النشر', [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'إيقاف النشر', style: 'destructive', onPress: () => publishMutation.mutate(false) },
      ])
    }
  }

  function save() {
    if (!form || busy) return
    const name = form.name.trim()
    if (name.length < 2) {
      setNameError('أدخل اسم العمل (حرفان على الأقل)')
      return
    }
    setNameError(null)
    saveMutation.mutate({
      name,
      whatsappNumber: form.whatsapp.trim() || null,
      phone: form.phone.trim() || null,
      city: form.city.trim() || null,
      address: form.address.trim() || null,
      receiptFooter: form.receiptFooter.trim() || null,
    })
  }

  function copyStoreUrl() {
    if (!business) return
    const url = `${WEB_BASE_URL}/store/${business.slug}`
    void Clipboard.setStringAsync(url)
      .then(() => showToast('تم نسخ رابط المتجر'))
      .catch(() => Alert.alert('تعذّر النسخ', 'حاول مرة أخرى'))
  }

  function shareStoreUrl() {
    if (!business) return
    Share.share({ message: `${WEB_BASE_URL}/store/${business.slug}` }).catch(() => undefined)
  }

  if (!canManage) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <ErrorState message="هذه الشاشة تتطلب صلاحية إدارة إعدادات المتجر" />
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
        <Text style={s.title}>إعدادات المتجر</Text>
        <Text style={s.sub}>الاسم والتواصل والعنوان — وبيانات النشر ورابط المتجر</Text>

        {query.isPending ? (
          <LoadingState label="جارٍ تحميل الإعدادات…" />
        ) : query.isError || !business ? (
          <ErrorState
            message="تعذر تحميل إعدادات المتجر — تحقق من الإنترنت وحاول مجددًا"
            onRetry={() => {
              void query.refetch()
            }}
          />
        ) : !form ? (
          <EmptyState title="لا توجد بيانات" />
        ) : (
          <>
            {/* بيانات المتجر */}
            <View style={s.card}>
              <Text style={s.cardTitle}>بيانات المتجر</Text>
              <Field
                label="اسم المتجر"
                value={form.name}
                onChangeText={(v) => {
                  setForm((f) => (f ? { ...f, name: v } : f))
                  setNameError(null)
                }}
                error={nameError}
              />
              <Field
                label="رقم واتساب (اختياري)"
                value={form.whatsapp}
                onChangeText={(v) => {
                  setForm((f) => (f ? { ...f, whatsapp: v } : f))
                }}
                placeholder="0912345678"
                keyboardType="phone-pad"
              />
              <Field
                label="رقم الهاتف (اختياري)"
                value={form.phone}
                onChangeText={(v) => {
                  setForm((f) => (f ? { ...f, phone: v } : f))
                }}
                placeholder="0912345678"
                keyboardType="phone-pad"
              />
              <Field
                label="المدينة (اختياري)"
                value={form.city}
                onChangeText={(v) => {
                  setForm((f) => (f ? { ...f, city: v } : f))
                }}
                placeholder="طرابلس"
              />
              <Field
                label="العنوان (اختياري)"
                value={form.address}
                onChangeText={(v) => {
                  setForm((f) => (f ? { ...f, address: v } : f))
                }}
                multiline
                style={s.textarea}
              />
              <Field
                label="تذييل الإيصال (اختياري — يظهر أسفل الفاتورة)"
                value={form.receiptFooter}
                onChangeText={(v) => {
                  setForm((f) => (f ? { ...f, receiptFooter: v } : f))
                }}
                placeholder="شكرًا لزيارتكم — نتشرف بخدمتكم دائمًا"
                multiline
                style={s.textarea}
              />
              <Button label="حفظ التعديلات" onPress={save} disabled={busy} />
              <Text style={s.hint}>
                الأرقام الليبية يطبّعها الخادم تلقائيًا — اترك الحقل فارغًا لحذفه من صفحة متجرك
              </Text>
            </View>

            {/* النشر */}
            <View style={s.card}>
              <View style={s.publishHead}>
                <Text style={s.cardTitle}>النشر</Text>
                <MiniStamp
                  text={business.isPublished ? 'منشور' : 'غير منشور'}
                  family={business.isPublished ? 'mint' : 'grey'}
                />
              </View>
              <Toggle
                label="متجر منشور للعملاء"
                value={business.isPublished}
                onValueChange={confirmPublish}
                disabled={busy}
              />
              <Text style={s.hint}>
                النشر يتطلب قسمًا واحدًا ومنتجًا متاحًا واحدًا على الأقل — إن لم يتحقق ذلك يبقى المتجر غير منشور
                ويظهر لك السبب
              </Text>
            </View>

            {/* رابط المتجر */}
            <View style={s.card}>
              <Text style={s.cardTitle}>رابط متجرك</Text>
              <Text style={s.urlRow} selectable numberOfLines={1}>
                {`${WEB_BASE_URL}/store/${business.slug}`}
              </Text>
              <Hairline />
              <View style={s.urlActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="نسخ رابط المتجر"
                  onPress={copyStoreUrl}
                  style={({ pressed }) => [s.urlBtn, pressed && { opacity: 0.7 }]}
                >
                  <CopyIcon size={16} color={t.primary} />
                  <Text style={s.urlBtnText}>نسخ الرابط</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="مشاركة رابط المتجر"
                  onPress={shareStoreUrl}
                  style={({ pressed }) => [s.urlBtn, pressed && { opacity: 0.7 }]}
                >
                  <ShareIcon size={16} color={t.primary} />
                  <Text style={s.urlBtnText}>مشاركة</Text>
                </Pressable>
              </View>
              <Text style={s.hint}>هذا الرابط يفتح صفحة متجرك لدى العملاء — شاركه على واتساب ومواقع التواصل</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.background },
  scroll: { padding: 16, gap: 12, paddingBottom: 32 },
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
    lineHeight: 19,
    paddingBottom: 2,
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
  textarea: { minHeight: 66, textAlignVertical: 'top' },
  hint: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 12,
    color: t.mutedFg,
    lineHeight: 18,
  },
  publishHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  urlRow: {
    fontFamily: 'IBMPlexSansArabic_500Medium',
    fontSize: 13.5,
    color: t.ring,
    lineHeight: 20,
    direction: 'ltr',
    textAlign: 'left',
  },
  urlActions: { flexDirection: 'row', gap: 8 },
  urlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: t.primary,
    borderRadius: 12,
    minHeight: 44,
    paddingVertical: 10,
  },
  urlBtnText: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 13.5,
    color: t.primary,
  },
})
