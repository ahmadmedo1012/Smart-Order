/**
 * Smart Order Mobile — حالات موحدة (تحميل/خطأ/فراغ) بنبرة العلامة.
 */
import React from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { t } from '@/constants/theme'

export function LoadingState({ label = 'جارٍ التحميل…' }: { label?: string }) {
  return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={t.primary} />
      <Text style={s.label}>{label}</Text>
    </View>
  )
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string | null
  onRetry?: () => void
}) {
  return (
    <View style={s.center}>
      <Text style={s.emoji} accessibilityRole="image" aria-label="خطأ">
        ⚠️
      </Text>
      <Text style={s.label}>{message ?? 'حدث خطأ غير متوقع'}</Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [s.retry, pressed && { opacity: 0.7 }]}
        >
          <Text style={s.retryText}>إعادة المحاولة</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={s.center}>
      <Text style={s.emoji} accessibilityRole="image" aria-label="فراغ">
        🛍️
      </Text>
      <Text style={s.title}>{title}</Text>
      {hint ? <Text style={s.label}>{hint}</Text> : null}
    </View>
  )
}

const s = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
    backgroundColor: t.background,
  },
  label: {
    color: t.mutedFg,
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  title: {
    color: t.foreground,
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 16,
    textAlign: 'center',
  },
  emoji: { fontSize: 40 },
  retry: {
    backgroundColor: t.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryText: {
    color: t.primaryFg,
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 14,
  },
})
