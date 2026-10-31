/**
 * Smart Order Mobile — شاشة إدارة (C2-REST) — قيد الإنشاء في هذا
 * الالتزام المؤقت؛ التنفيذ الكامل يهبط في الالتزامات التالية.
 */
import React from 'react'
import { StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { t } from '@/constants/theme'

export default function PlaceholderCustomerDetailScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <Text style={s.text}>قيد الإنشاء</Text>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.background, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: 'IBMPlexSansArabic_500Medium', fontSize: 15, color: t.mutedFg },
})
