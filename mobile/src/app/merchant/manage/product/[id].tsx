/**
 * Smart Order Mobile — نموذج المنتج: إنشاء/تعديل/عرض (C2-REST).
 *
 * POST/PATCH /api/products(+[id]) — الاسم والقسم والوصف والسعر (سلسلة
 * عشرية «12.500» يفكّها parseLyd في الخادم — لا تعويم)، متاح/مميز،
 * محرر أحجام [اسم + فرق سعر]، ومحرر مجموعات إضافات [اسم + إلزامية +
 * حد الاختيار + خيارات]. الأرشفة (DELETE) بتأكيد — لا حذف نهائي مع
 * التاريخ. من لا يملك products.manage يرى نموذجًا للقراءة فقط.
 *
 * النموذج مكوّن ابن يُركَّب بعد جاهزية البيانات ويبذر حالته من
 * الخاصيات مرة واحدة عند التركيب (بلا تأثيرات بذر — لا تداخل عرض).
 */
import React, { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fonts, type ThemeColors } from '@/constants/theme'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuthStore } from '@/state/auth'
import {
  archiveProduct,
  createProduct,
  fetchCategories,
  fetchProductDetail,
  updateProduct,
  uploadProductImage,
  type ProductInput,
} from '@/services/merchant'
import { apiErrorMessage } from '@/lib/api-error'
import { formatMillimesAmount, parseAmountMillimes } from '@/lib/money-millimes'
import type { MerchantCategory, MerchantProduct } from '@/types/merchant'
import { Button, Chip, Field, Hairline, Toggle } from '@/components/ui'
import { LoadingState, ErrorState } from '@/components/state-views'
import { showToast } from '@/components/toast'
import { PlusIcon, TrashIcon } from '@/components/icons'

let draftSeq = 0
function draftKey(): string {
  draftSeq += 1
  return `d${draftSeq}`
}

/** P38 (C3 — صور المنتجات): سلّم ضغط الويب نفسه (src/lib/compress.ts):
 * حد أبعاد 1200، جودة 0.82، وسقف 480KB — الجودة تنزل درجات حتى يدخل
 * الحجم تحت السقف (الخادم يرفض >500KB). تُرجع dataURL جاهزًا لعقد
 * POST /api/media (نفس عقد الويب حرفيًا). */
const COMPRESS_MAX_DIM = 1200
const COMPRESS_START_QUALITY = 0.82
const COMPRESS_MAX_BYTES = 480 * 1024

async function compressToDataUrl(uri: string, width: number, height: number): Promise<string> {
  const scale = Math.min(1, COMPRESS_MAX_DIM / Math.max(width, height, 1))
  const actions: ImageManipulator.Action[] =
    scale < 1 ? [{ resize: { width: Math.round(width * scale), height: Math.round(height * scale) } }] : []
  let quality = COMPRESS_START_QUALITY
  // سلّم الجودة: 0.82 → 0.72 → … حتى 0.4 — كل درجة أرخص من إعادة فتح
  // المنتقي، والحد الأدنى يحافظ على قابلية استخدام الصورة.
  for (let attempt = 0; attempt < 5; attempt++) {
    const result = await ImageManipulator.manipulateAsync(uri, actions, {
      format: ImageManipulator.SaveFormat.JPEG,
      compress: quality,
      base64: true,
    })
    if (!result.base64) throw new Error('تعذر معالجة الصورة')
    const bytes = Math.floor((result.base64.length * 3) / 4)
    if (bytes <= COMPRESS_MAX_BYTES || actions.length === 0) {
      return `data:image/jpeg;base64,${result.base64}`
    }
    quality -= 0.1
    if (quality < 0.4) quality = 0.4
  }
  throw new Error('حجم الصورة كبير جداً — جرّب صورة أصغر')
}

interface VariantDraft {
  key: string
  name: string
  priceDelta: string
}

interface OptionDraft {
  key: string
  name: string
  priceDelta: string
}

interface GroupDraft {
  key: string
  name: string
  required: boolean
  /** حد الاختيار الأقصى (1-10) — محرر نصي رقمي. */
  maxSelect: string
  /** minSelect محفوظ من الخادم (غير محرَّر هنا) — سياسة الاستبدال
   * الكامل لا تفقده. */
  minSelect: number
  options: OptionDraft[]
}

export default function ProductFormScreen() {
  const params = useLocalSearchParams<{ id: string }>()
  const productId = typeof params.id === 'string' && params.id !== 'new' ? params.id : null
  const isCreate = productId === null

  const businessId = useAuthStore((s) => s.selectedBusinessId)
  const membership = useAuthStore((s) => s.memberships.find((m) => m.businessId === s.selectedBusinessId))
  const canManage = useMemo(() => (membership?.permissions ?? []).includes('products.manage'), [membership])

  const productQuery = useQuery({
    queryKey: ['merchant', 'product', productId],
    queryFn: () => fetchProductDetail(productId as string, businessId as string),
    enabled: !!productId && !!businessId,
  })
  const categoriesQuery = useQuery({
    queryKey: ['merchant', 'categories', businessId],
    queryFn: () => fetchCategories(businessId as string),
    enabled: !!businessId,
  })

  // التحرير: المنتج أولًا؛ الإنشاء: لا انتظار.
  if (!isCreate && !productQuery.data) {
    if (productQuery.isError) {
      return (
        <ErrorState
          message="تعذر تحميل المنتج — تحقق من الإنترنت وحاول مجددًا"
          onRetry={() => {
            void productQuery.refetch()
          }}
        />
      )
    }
    return <LoadingState label="جارٍ تحميل المنتج…" />
  }

  return (
    <ProductForm
      productId={productId}
      product={isCreate ? null : productQuery.data?.product ?? null}
      categories={categoriesQuery.data?.categories ?? []}
      businessId={businessId as string}
      canManage={canManage}
    />
  )
}

function ProductForm({
  productId,
  product,
  categories,
  businessId,
  canManage,
}: {
  productId: string | null
  product: MerchantProduct | null
  categories: MerchantCategory[]
  businessId: string
  canManage: boolean
}) {
  const { t } = useTheme()
  const s = makeStyles(t)

  const isCreate = productId === null
  const readOnly = !canManage

  // بذرة واحدة عند التركيب — المصدر خاصيات جاهزة، لا تأثيرات.
  const [name, setName] = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [price, setPrice] = useState(product ? formatMillimesAmount(product.price) : '')
  const [categoryId, setCategoryId] = useState<string | null>(product?.categoryId ?? null)
  const [isAvailable, setIsAvailable] = useState(product?.isAvailable ?? true)
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false)
  /* P38 (C3): صورة المنتج — عقد الويب نفسه (POST /api/media بعد ضغط
   * ≤480KB)؛ القيمة رابط التخزين النهائي مثل الويب حرفيًا. */
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? '')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [variants, setVariants] = useState<VariantDraft[]>(() =>
    (product?.variants ?? []).map((v) => ({ key: draftKey(), name: v.name, priceDelta: formatMillimesAmount(v.priceDelta) })),
  )
  const [groups, setGroups] = useState<GroupDraft[]>(() =>
    (product?.optionGroups ?? []).map((g) => ({
      key: draftKey(),
      name: g.name,
      required: g.required,
      maxSelect: String(g.maxSelect),
      minSelect: g.minSelect,
      options: g.options.map((o) => ({ key: draftKey(), name: o.name, priceDelta: formatMillimesAmount(o.priceDelta) })),
    })),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const queryClient = useQueryClient()

  const saveMutation = useMutation({
    mutationFn: (payload: ProductInput) =>
      productId ? updateProduct(productId, businessId, payload) : createProduct(businessId, payload),
    onSuccess: async () => {
      showToast(isCreate ? 'تمت إضافة المنتج' : 'تم حفظ التعديلات')
      await queryClient.invalidateQueries({ queryKey: ['merchant'] })
      router.back()
    },
    onError: (err) => {
      Alert.alert('تعذّر الحفظ', apiErrorMessage(err, 'تعذّر حفظ المنتج — حاول بعد قليل'))
    },
  })

  const archiveMutation = useMutation({
    mutationFn: () => archiveProduct(productId as string, businessId),
    onSuccess: async () => {
      showToast('تمت أرشفة المنتج')
      await queryClient.invalidateQueries({ queryKey: ['merchant'] })
      router.back()
    },
    onError: (err) => {
      Alert.alert('تعذّرت الأرشفة', apiErrorMessage(err, 'تعذّرت أرشفة المنتج — حاول بعد قليل'))
    },
  })

  const busy = saveMutation.isPending || archiveMutation.isPending || uploadingImage

  /** P38 (C3): اختيار صورة → ضغط (سلّم الويب) → رفع عبر /api/media →
   * رابط نهائي يُحفظ مع المنتج. الأذونات تُطلب لحظتها (شرح القيمة قبل
   * الطلب)، والفشل يظهر برسالة الخادم كما هي (حد الرفعات/الحجم). */
  async function pickProductImage() {
    if (readOnly || uploadingImage || busy) return
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) {
        Alert.alert('الوصول للصور', 'الإذن مطلوب لاختيار صورة المنتج — فعّله من إعدادات التطبيق')
        return
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 1,
      })
      if (picked.canceled) return
      const asset = picked.assets[0]
      if (!asset) return
      setUploadingImage(true)
      const dataUrl = await compressToDataUrl(asset.uri, asset.width ?? 1200, asset.height ?? 1200)
      const res = await uploadProductImage(businessId, dataUrl)
      setImageUrl(res.url)
      showToast('تم رفع الصورة')
    } catch (err) {
      Alert.alert('تعذّر رفع الصورة', apiErrorMessage(err, 'تعذّر رفع الصورة — حاول مجددًا'))
    } finally {
      setUploadingImage(false)
    }
  }

  /** تحقق محلي — نفس قيود zod في الخادم، أول خطأ لكل حقل. */
  function validate(): Record<string, string> {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'أدخل اسم المنتج'
    const priceMillimes = parseAmountMillimes(price)
    if (priceMillimes === null) e.price = 'أدخل سعرًا صحيحًا مثل 12.500'
    else if (priceMillimes > 999_999_000) e.price = 'السعر كبير جداً'
    variants.forEach((v, i) => {
      if (!v.name.trim()) e[`variant-${i}-name`] = 'أدخل اسم الحجم/الخيار'
      if (parseAmountMillimes(v.priceDelta || '0') === null) e[`variant-${i}-delta`] = 'فرق سعر غير صحيح'
    })
    groups.forEach((g, gi) => {
      if (!g.name.trim()) e[`group-${gi}-name`] = 'أدخل اسم مجموعة الإضافات'
      const max = parseInt(g.maxSelect, 10)
      if (!Number.isFinite(max) || max < 1 || max > 10) e[`group-${gi}-max`] = 'حد الاختيار بين 1 و 10'
      g.options.forEach((o, oi) => {
        if (!o.name.trim()) e[`group-${gi}-opt-${oi}-name`] = 'أدخل اسم الإضافة'
        if (parseAmountMillimes(o.priceDelta || '0') === null) e[`group-${gi}-opt-${oi}-delta`] = 'فرق سعر غير صحيح'
      })
    })
    return e
  }

  function submit() {
    if (busy) return
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length > 0) {
      Alert.alert('بيانات ناقصة', 'راجع الحقول المعلَّمة بالأحمر ثم أعد المحاولة')
      return
    }
    saveMutation.mutate({
      name: name.trim(),
      description: description.trim(),
      categoryId,
      imageUrl: imageUrl.trim() || undefined,
      price: price.trim(),
      isAvailable,
      isFeatured,
      variants: variants.map((v) => ({ name: v.name.trim(), priceDelta: v.priceDelta.trim() || '0' })),
      optionGroups: groups.map((g) => ({
        name: g.name.trim(),
        required: g.required,
        maxSelect: parseInt(g.maxSelect, 10),
        minSelect: g.minSelect,
        options: g.options.map((o) => ({ name: o.name.trim(), priceDelta: o.priceDelta.trim() || '0' })),
      })),
    })
  }

  function confirmArchive() {
    if (busy || !productId) return
    Alert.alert(
      'أرشفة المنتج',
      'سيختفي المنتج من متجرك ومن قوائم الإدارة، ويبقى في سجل الطلبات القديمة — هل أنت متأكد؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'أرشفة', style: 'destructive', onPress: () => archiveMutation.mutate() },
      ],
    )
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="رجوع"
            onPress={() => router.back()}
            style={({ pressed }) => [s.backRow, pressed && { opacity: 0.6 }]}
          >
            <Text style={s.backText}>رجوع</Text>
            <Text style={s.backChevron}>‹</Text>
          </Pressable>
          <Text style={s.title}>{isCreate ? 'منتج جديد' : readOnly ? 'عرض منتج' : 'تعديل منتج'}</Text>
          {readOnly ? (
            <Text style={s.readOnlyHint}>لديك صلاحية قراءة فقط — حفظ التعديلات يتطلب صلاحية إدارة المنتجات</Text>
          ) : null}

          {/* الأساسيات */}
          <View style={s.card}>
            <Field
              label="اسم المنتج"
              value={name}
              editable={!readOnly}
              onChangeText={(v) => {
                setName(v)
                setErrors((e) => ({ ...e, name: '' }))
              }}
              error={errors.name}
              placeholder="مثال: بيتزا مارغريتا"
            />
            <Field
              label="السعر (د.ل) — بصيغة مثل 12.500"
              value={price}
              editable={!readOnly}
              onChangeText={(v) => {
                setPrice(v)
                setErrors((e) => ({ ...e, price: '' }))
              }}
              error={errors.price}
              placeholder="12.500"
              keyboardType="decimal-pad"
            />
            <Field
              label="الوصف (اختياري)"
              value={description}
              editable={!readOnly}
              onChangeText={setDescription}
              placeholder="وصف قصير يظهر للعميل"
              multiline
              style={s.textarea}
            />
            {/* P38 (C3): صورة المنتج — المنتقي + المعاينة + الإزالة؛ نفس
                عقد الويب (الصورة تُرفع أولاً إلى /api/media ويُحفظ رابطها). */}
            <View style={s.imageWrap}>
              <Text style={s.catLabel}>صورة المنتج (اختياري)</Text>
              {imageUrl ? (
                <View style={s.imageRow}>
                  <Image
                    source={{ uri: imageUrl }}
                    style={s.imagePreview}
                    contentFit="cover"
                    transition={120}
                    accessibilityLabel="معاينة صورة المنتج"
                  />
                  {!readOnly ? (
                    <View style={s.imageActions}>
                      <Button label="تغيير" variant="outline" onPress={pickProductImage} disabled={uploadingImage} />
                      <Button
                        label="إزالة"
                        variant="outline"
                        onPress={() => {
                          setImageUrl('')
                        }}
                        disabled={uploadingImage}
                      />
                    </View>
                  ) : null}
                </View>
              ) : !readOnly ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="إضافة صورة للمنتج"
                  onPress={pickProductImage}
                  disabled={uploadingImage}
                  style={({ pressed }) => [s.imagePicker, pressed && { opacity: 0.7 }]}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color={t.primary} />
                  ) : (
                    <PlusIcon size={18} color={t.primary} />
                  )}
                  <Text style={s.imagePickerText}>
                    {uploadingImage ? 'جارٍ الضغط والرفع…' : 'إضافة صورة'}
                  </Text>
                </Pressable>
              ) : null}
              {imageUrl && uploadingImage ? (
                <View style={s.imageUploadingRow}>
                  <ActivityIndicator size="small" color={t.primary} />
                  <Text style={s.imagePickerText}>جارٍ الضغط والرفع…</Text>
                </View>
              ) : null}
              <Text style={s.imageHint}>تُضغط تلقائياً (حد 480KB) — تظهر في المتجر والتطبيق معًا</Text>
            </View>
            <View style={s.catWrap}>
              <Text style={s.catLabel}>القسم</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catChips}>
                <Chip
                  label="بدون قسم"
                  active={categoryId === null}
                  onPress={() => {
                    if (!readOnly) setCategoryId(null)
                  }}
                />
                {categories.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.name}
                    active={categoryId === c.id}
                    onPress={() => {
                      if (!readOnly) setCategoryId(c.id)
                    }}
                  />
                ))}
              </ScrollView>
            </View>
            <Hairline />
            <Toggle label="متاح للطلب" value={isAvailable} disabled={readOnly || busy} onValueChange={setIsAvailable} />
            <Toggle label="منتج مميز" value={isFeatured} disabled={readOnly || busy} onValueChange={setIsFeatured} />
          </View>

          {/* الأحجام */}
          <View style={s.card}>
            <Text style={s.cardTitle}>الأحجام والخيارات</Text>
            <Text style={s.cardHint}>مثل: صغير / وسط / كبير — فرق السعر يُضاف إلى السعر الأساسي</Text>
            {variants.map((v, i) => (
              <View key={v.key} style={s.editorRow}>
                <Field
                  label={`الحجم ${i + 1}`}
                  value={v.name}
                  editable={!readOnly}
                  onChangeText={(nv) => {
                    setVariants((rows) => rows.map((r) => (r.key === v.key ? { ...r, name: nv } : r)))
                    setErrors((e) => ({ ...e, [`variant-${i}-name`]: '' }))
                  }}
                  error={errors[`variant-${i}-name`]}
                  placeholder="وسط"
                  style={s.flexInput}
                />
                <Field
                  label="فرق السعر"
                  value={v.priceDelta}
                  editable={!readOnly}
                  onChangeText={(nv) => {
                    setVariants((rows) => rows.map((r) => (r.key === v.key ? { ...r, priceDelta: nv } : r)))
                    setErrors((e) => ({ ...e, [`variant-${i}-delta`]: '' }))
                  }}
                  error={errors[`variant-${i}-delta`]}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  style={s.deltaInput}
                />
                {!readOnly ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`حذف الحجم ${i + 1}`}
                    disabled={busy}
                    onPress={() => {
                      setVariants((rows) => rows.filter((r) => r.key !== v.key))
                    }}
                    style={({ pressed }) => [s.removeBtn, pressed && { opacity: 0.7 }, busy && { opacity: 0.45 }]}
                  >
                    <TrashIcon size={18} color={t.destructive} />
                  </Pressable>
                ) : null}
              </View>
            ))}
            {!readOnly ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="إضافة حجم"
                disabled={busy || variants.length >= 20}
                onPress={() => {
                  setVariants((rows) => [...rows, { key: draftKey(), name: '', priceDelta: '0' }])
                }}
                style={({ pressed }) => [s.addRow, pressed && { opacity: 0.7 }, (busy || variants.length >= 20) && { opacity: 0.45 }]}
              >
                <PlusIcon size={16} color={t.primary} />
                <Text style={s.addText}>إضافة حجم</Text>
              </Pressable>
            ) : null}
          </View>

          {/* مجموعات الإضافات */}
          <View style={s.card}>
            <Text style={s.cardTitle}>مجموعات الإضافات</Text>
            <Text style={s.cardHint}>مثل: إضافات البيتزا — العميل يختار منها عند الطلب</Text>
            {groups.map((g, gi) => (
              <View key={g.key} style={s.groupBox}>
                <View style={s.editorRow}>
                  <Field
                    label="اسم المجموعة"
                    value={g.name}
                    editable={!readOnly}
                    onChangeText={(nv) => {
                      setGroups((rows) => rows.map((r) => (r.key === g.key ? { ...r, name: nv } : r)))
                      setErrors((e) => ({ ...e, [`group-${gi}-name`]: '' }))
                    }}
                    error={errors[`group-${gi}-name`]}
                    placeholder="إضافات"
                    style={s.flexInput}
                  />
                  {!readOnly ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`حذف المجموعة ${gi + 1}`}
                      disabled={busy}
                      onPress={() => {
                        setGroups((rows) => rows.filter((r) => r.key !== g.key))
                      }}
                      style={({ pressed }) => [s.removeBtn, pressed && { opacity: 0.7 }, busy && { opacity: 0.45 }]}
                    >
                      <TrashIcon size={18} color={t.destructive} />
                    </Pressable>
                  ) : null}
                </View>
                <View style={s.groupToggles}>
                  <View style={s.groupToggleWrap}>
                    <Toggle
                      label="إلزامية"
                      value={g.required}
                      disabled={readOnly || busy}
                      onValueChange={(next) => {
                        setGroups((rows) => rows.map((r) => (r.key === g.key ? { ...r, required: next } : r)))
                      }}
                    />
                  </View>
                  <Field
                    label="حد الاختيار"
                    value={g.maxSelect}
                    editable={!readOnly}
                    onChangeText={(nv) => {
                      setGroups((rows) => rows.map((r) => (r.key === g.key ? { ...r, maxSelect: nv } : r)))
                      setErrors((e) => ({ ...e, [`group-${gi}-max`]: '' }))
                    }}
                    error={errors[`group-${gi}-max`]}
                    placeholder="1"
                    keyboardType="number-pad"
                    style={s.maxInput}
                  />
                </View>
                {g.options.map((o, oi) => (
                  <View key={o.key} style={s.editorRow}>
                    <Field
                      label={`إضافة ${oi + 1}`}
                      value={o.name}
                      editable={!readOnly}
                      onChangeText={(nv) => {
                        setGroups((rows) =>
                          rows.map((r) =>
                            r.key === g.key
                              ? { ...r, options: r.options.map((x) => (x.key === o.key ? { ...x, name: nv } : x)) }
                              : r,
                          ),
                        )
                        setErrors((e) => ({ ...e, [`group-${gi}-opt-${oi}-name`]: '' }))
                      }}
                      error={errors[`group-${gi}-opt-${oi}-name`]}
                      placeholder="جبنة إضافية"
                      style={s.flexInput}
                    />
                    <Field
                      label="فرق السعر"
                      value={o.priceDelta}
                      editable={!readOnly}
                      onChangeText={(nv) => {
                        setGroups((rows) =>
                          rows.map((r) =>
                            r.key === g.key
                              ? { ...r, options: r.options.map((x) => (x.key === o.key ? { ...x, priceDelta: nv } : x)) }
                              : r,
                          ),
                        )
                        setErrors((e) => ({ ...e, [`group-${gi}-opt-${oi}-delta`]: '' }))
                      }}
                      error={errors[`group-${gi}-opt-${oi}-delta`]}
                      placeholder="0"
                      keyboardType="decimal-pad"
                      style={s.deltaInput}
                    />
                    {!readOnly ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`حذف الإضافة ${oi + 1}`}
                        disabled={busy}
                        onPress={() => {
                          setGroups((rows) =>
                            rows.map((r) => (r.key === g.key ? { ...r, options: r.options.filter((x) => x.key !== o.key) } : r)),
                          )
                        }}
                        style={({ pressed }) => [s.removeBtn, pressed && { opacity: 0.7 }, busy && { opacity: 0.45 }]}
                      >
                        <TrashIcon size={18} color={t.destructive} />
                      </Pressable>
                    ) : null}
                  </View>
                ))}
                {!readOnly ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="إضافة خيار للمجموعة"
                    disabled={busy || g.options.length >= 20}
                    onPress={() => {
                      setGroups((rows) =>
                        rows.map((r) =>
                          r.key === g.key ? { ...r, options: [...r.options, { key: draftKey(), name: '', priceDelta: '0' }] } : r,
                        ),
                      )
                    }}
                    style={({ pressed }) => [s.addRow, pressed && { opacity: 0.7 }, (busy || g.options.length >= 20) && { opacity: 0.45 }]}
                  >
                    <PlusIcon size={16} color={t.primary} />
                    <Text style={s.addText}>إضافة خيار</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
            {!readOnly ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="إضافة مجموعة إضافات"
                disabled={busy || groups.length >= 10}
                onPress={() => {
                  setGroups((rows) => [
                    ...rows,
                    { key: draftKey(), name: '', required: false, maxSelect: '1', minSelect: 0, options: [] },
                  ])
                }}
                style={({ pressed }) => [s.addRow, pressed && { opacity: 0.7 }, (busy || groups.length >= 10) && { opacity: 0.45 }]}
              >
                <PlusIcon size={16} color={t.primary} />
                <Text style={s.addText}>إضافة مجموعة</Text>
              </Pressable>
            ) : null}
          </View>

          {/* الحفظ / الأرشفة */}
          {canManage ? (
            <View style={s.actions}>
              <Button
                label={busy ? 'جارٍ الحفظ…' : isCreate ? 'إضافة المنتج' : 'حفظ التعديلات'}
                onPress={submit}
                disabled={busy}
              />
              {!isCreate ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="أرشفة المنتج"
                  disabled={busy}
                  onPress={confirmArchive}
                  style={({ pressed }) => [s.archiveBtn, pressed && { opacity: 0.75 }, busy && { opacity: 0.45 }]}
                >
                  <TrashIcon size={18} color={t.destructive} />
                  <Text style={s.archiveText}>أرشفة المنتج</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.background },
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4 },
  backText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: t.primary,
  },
  backChevron: { color: t.primary, fontSize: 20, lineHeight: 24 },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: t.foreground,
    paddingBottom: 2,
  },
  readOnlyHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.mutedFg,
    lineHeight: 18,
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
  cardHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.mutedFg,
    marginTop: -8,
    lineHeight: 18,
  },
  catWrap: { gap: 8 },
  /* P38 (C3): صورة المنتج — معاينة 96px مربعة + صف الإجراءات. */
  imageWrap: { gap: 8, paddingBottom: 4 },
  imageRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  imagePreview: {
    width: 96,
    height: 96,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  imageActions: { flexDirection: 'row', gap: 8, flex: 1, flexWrap: 'wrap' },
  imagePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${t.primary}40`,
    backgroundColor: t.card,
    paddingVertical: 14,
  },
  imagePickerText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: t.primary,
  },
  imageUploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  imageHint: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: t.mutedFg,
    lineHeight: 17,
  },
  catLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: t.foreground,
  },
  catChips: { gap: 8, paddingVertical: 2 },
  textarea: { minHeight: 76, textAlignVertical: 'top' },
  editorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  flexInput: { flex: 1 },
  deltaInput: { width: 104 },
  maxInput: { width: 110 },
  removeBtn: {
    borderWidth: 1,
    borderColor: t.destructive,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 26,
  },
  groupBox: {
    backgroundColor: t.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.border,
    padding: 12,
    gap: 10,
  },
  groupToggles: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  groupToggleWrap: { flex: 1 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: `${t.primary}55`,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 11,
    minHeight: 44,
  },
  addText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: t.primary,
  },
  actions: { gap: 10, paddingTop: 4 },
  archiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: t.destructive,
    borderRadius: 12,
    paddingVertical: 13,
    minHeight: 48,
  },
  archiveText: {
    fontFamily: fonts.bold,
    fontSize: 14.5,
    color: t.destructive,
  },
})
