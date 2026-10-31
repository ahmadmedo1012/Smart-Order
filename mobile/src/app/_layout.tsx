/**
 * Smart Order Mobile — التخطيط الجذري.
 *
 * - RTL عربي أولًا (نمط العائلة): كتابة الإعداد الأصلي قبل أي رسم +
 *   بوابة ensureRTL تضمن اتجاهًا صحيحًا من أول فتح بعد تثبيت نظيف.
 * - الخط: IBM Plex Sans Arabic 400/500/600/700 — وجه العلامة (نفس
 *   الوجه الذي يستضيفه الويب ذاتيًا).
 * - المزودات: QueryClient (نفس مكتبة الويب).
 */
import { I18nManager } from 'react-native'
import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClientProvider } from '@tanstack/react-query'
import { useFonts } from 'expo-font'
import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic'
import * as SplashScreen from 'expo-splash-screen'
import { t } from '@/constants/theme'
import { queryClient } from '@/lib/query-client'
import { ensureRTL } from '@/lib/ensure-rtl'
import { useAuthStore } from '@/state/auth'
import { LoadingState } from '@/components/state-views'

// عربي أولًا — قبل أي رسم.
I18nManager.allowRTL(true)
I18nManager.forceRTL(true)

SplashScreen.preventAutoHideAsync()

function AppShell() {
  const [rtlReady, setRtlReady] = useState(false)
  const [fontsLoaded] = useFonts({
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  })

  // بوابة RTL: لا نرسم أي شاشة قبل حسم الاتجاه.
  useEffect(() => {
    let alive = true
    ensureRTL().then(() => {
      if (alive) setRtlReady(true)
    })
    return () => {
      alive = false
    }
  }, [])

  // P36: استرجاع جلسة التاجر عند الإقلاع (GET /me) — بلا توكن محفوظ
  // لا يحدث أي نداء شبكي، فتبقى رحلة الزائر كما هي تمامًا.
  useEffect(() => {
    void useAuthStore.getState().restore()
  }, [])

  useEffect(() => {
    if (fontsLoaded && rtlReady) {
      SplashScreen.hideAsync().catch(() => undefined)
    }
  }, [fontsLoaded, rtlReady])

  if (!fontsLoaded || !rtlReady) {
    return <LoadingState label="جارٍ تجهيز Smart Order…" />
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: t.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="store/[slug]" />
      <Stack.Screen name="product/[id]" />
      <Stack.Screen name="cart" />
      <Stack.Screen name="track/[token]" />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <AppShell />
    </QueryClientProvider>
  )
}
