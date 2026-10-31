/**
 * Smart Order Mobile — أقسام التاجر (C2-REST).
 *
 * GET/POST/PATCH/DELETE /api/categories — قائمة بعدّاد منتجات كل قسم،
 * إنشاء، إعادة تسمية (محرر مضمّن)، وحذف بعقد الخادم نفسه: الفارغ
 * يُحذف نهائيًا ومن فيه منتجات يُؤرشف. ترتيب الأقسام لا تدعمه
 * الواجهة البرمجية (PATCH بالاسم فقط) — القائمة بترتيب الخادم.
 * العرض لمن يملك products.read، والإدارة لمن يملك categories.manage.
 */
import React, { useMemo, useState } from 'react'
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { t } from '@/constants/theme'
import { useAuthStore } from '@/state/auth'
import { createCategory, deleteCategory, fetchCategories, renameCategory } from '@/services/merchant'
import { apiErrorMessage } from '@/lib/api-error'
import type { MerchantCategory } from '@/types/merchant'
import { Button, Field, Hairline, MiniStamp } from '@/components/ui'
import { EmptyState, ErrorState, LoadingState } from '@/components/state-views'
import { showToast } from '@/components/toast'
import { PencilIcon } from '@/components/icons'

export default function ManageCategoriesScreen() {
  const businessId = useAuthStore((s) => s.selectedBusinessId)
  const membership = useAuthStore((s) => s.memberships.find((m) => m.businessId === s.selectedBusinessId))
  const canManage = useMemo(() => (membership?.permissions ?? []).includes('categories.manage'), [membership])

  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['merchant', 'categories', businessId],
    queryFn: () => fetchCategories(businessId as string),
    enabled: !!businessId,
  })
  const categories = query.data?.categories ?? []

  const [newName, setNewName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const createMutation = useMutation({
    mutationFn: (name: string) => createCategory(businessId as string, name),
    onSuccess: async () => {
      showToast('تمت إضافة القسم')
      setNewName('')
      await queryClient.invalidateQueries({ queryKey: ['merchant'] })
    },
    onError: (err) => {
      Alert.alert('تعذّرت الإضافة', apiErrorMessage(err, 'تعذّرت إضافة القسم — حاول بعد قليل'))
    },
  })

  const renameMutation = useMutation({
    mutationFn: (input: { id: string; name: string }) => renameCategory(input.id, businessId as string, input.name),
    onSuccess: async () => {
      showToast('تم حفظ الاسم')
      setRenamingId(null)
      await queryClient.invalidateQueries({ queryKey: ['merchant'] })
    },
    onError: (err) => {
      Alert.alert('تعذّر التعديل', apiErrorMessage(err, 'تعذّر تعديل القسم — حاول بعد قليل'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id, businessId as string),
    onSuccess: async (res) => {
      showToast('archived' in res ? 'تمت أرشفة القسم (يحتوي منتجات)' : 'تم حذف القسم')
      setRenamingId(null)
      await queryClient.invalidateQueries({ queryKey: ['merchant'] })
    },
    onError: (err) => {
      Alert.alert('تعذّر الحذف', apiErrorMessage(err, 'تعذّر حذف القسم — حاول بعد قليل'))
    },
  })

  const busy = createMutation.isPending || renameMutation.isPending || deleteMutation.isPending

  function submitCreate() {
    const name = newName.trim()
    if (!name) {
      Alert.alert('بيانات ناقصة', 'أدخل اسم القسم')
      return
    }
    createMutation.mutate(name)
  }

  function submitRename(cat: MerchantCategory) {
    const name = renameValue.trim()
    if (!name) {
      Alert.alert('بيانات ناقصة', 'أدخل اسم القسم')
      return
    }
    renameMutation.mutate({ id: cat.id, name })
  }

  function confirmDelete(cat: MerchantCategory) {
    Alert.alert(
      `حذف «${cat.name}»؟`,
      'سيُؤرشف القسم إن كان يحتوي منتجات، وإلا يُحذف نهائياً',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حذف', style: 'destructive', onPress: () => deleteMutation.mutate(cat.id) },
      ],
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
        <Text style={s.title}>الأقسام</Text>

        {canManage ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>قسم جديد</Text>
            <Field
              label="اسم القسم"
              value={newName}
              onChangeText={setNewName}
              placeholder="مثال: المقبلات"
              editable={!createMutation.isPending}
            />
            <Button
              label={createMutation.isPending ? 'جارٍ الإضافة…' : 'إضافة القسم'}
              onPress={submitCreate}
              disabled={!newName.trim() || createMutation.isPending}
            />
          </View>
        ) : null}

        {query.isPending ? (
          <LoadingState label="جارٍ تحميل الأقسام…" />
        ) : query.isError ? (
          <ErrorState
            message="تعذر تحميل الأقسام — تحقق من الإنترنت وحاول مجددًا"
            onRetry={() => {
              void query.refetch()
            }}
          />
        ) : categories.length === 0 ? (
          <EmptyState title="لا أقسام بعد" hint="أضف قسماً أولًا ثم ضع منتجاته" />
        ) : (
          <View style={s.card}>
            {categories.map((cat, i) => {
              const renaming = renamingId === cat.id
              const count = cat._count?.products ?? 0
              return (
                <View key={cat.id}>
                  {i > 0 ? <Hairline /> : null}
                  {renaming ? (
                    <View style={s.renameBox}>
                      <Field
                        label="اسم القسم"
                        value={renameValue}
                        onChangeText={setRenameValue}
                        editable={!renameMutation.isPending}
                      />
                      <View style={s.renameActions}>
                        <Button
                          label={renameMutation.isPending ? 'جارٍ الحفظ…' : 'حفظ'}
                          onPress={() => submitRename(cat)}
                          disabled={renameMutation.isPending || !renameValue.trim()}
                          style={s.renameBtn}
                        />
                        <Button
                          label="إلغاء"
                          variant="ghost"
                          onPress={() => {
                            setRenamingId(null)
                          }}
                          disabled={renameMutation.isPending}
                          style={[s.renameBtn, s.ghostBtn]}
                        />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`حذف ${cat.name}`}
                          disabled={busy}
                          onPress={() => confirmDelete(cat)}
                          style={({ pressed }) => [s.deleteBtn, pressed && { opacity: 0.7 }, busy && { opacity: 0.45 }]}
                        >
                          <Text style={s.deleteText}>حذف</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={s.row}>
                      <View style={s.rowText}>
                        <Text style={s.rowName} numberOfLines={1}>
                          {cat.name}
                        </Text>
                        <Text style={s.rowMeta}>{count > 0 ? `${count} منتج` : 'بلا منتجات'}</Text>
                      </View>
                      {count === 0 ? <MiniStamp text="فارغ" family="grey" /> : null}
                      {canManage ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`تعديل ${cat.name}`}
                          disabled={busy}
                          onPress={() => {
                            setRenamingId(cat.id)
                            setRenameValue(cat.name)
                          }}
                          style={({ pressed }) => [s.editBtn, pressed && { opacity: 0.7 }, busy && { opacity: 0.45 }]}
                        >
                          <PencilIcon size={17} color={t.primary} />
                        </Pressable>
                      ) : null}
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        )}

        {categories.length > 0 ? (
          <Text style={s.footHint}>
            حذف قسم يحتوي منتجات يؤرشِفه بدل حذفه — الطلبات القديمة تحتفظ بأسماء أقسامها
          </Text>
        ) : null}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  rowText: { flex: 1, gap: 2 },
  rowName: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 14.5,
    color: t.foreground,
  },
  rowMeta: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 12,
    color: t.mutedFg,
  },
  editBtn: {
    borderWidth: 1,
    borderColor: t.primary,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 11,
  },
  renameBox: { gap: 10, paddingVertical: 8 },
  renameActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  renameBtn: { minHeight: 42, paddingVertical: 9, flex: 1 },
  ghostBtn: { borderWidth: 1, borderColor: t.border },
  deleteBtn: {
    borderWidth: 1,
    borderColor: t.destructive,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 18,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 13.5,
    color: t.destructive,
  },
  footHint: {
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 12,
    color: t.mutedFg,
    textAlign: 'center',
    lineHeight: 18,
  },
})
