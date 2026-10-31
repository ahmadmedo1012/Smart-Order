/**
 * Smart Order Mobile — التخطيط الجذري.
 *
 * - RTL عربي أولًا (نمط العائلة): كتابة الإعداد الأصلي قبل أي رسم +
 *   بوابة ensureRTL تضمن اتجاهًا صحيحًا من أول فتح بعد تثبيت نظيف.
 * - الخط (عقد الويب r152 «ضوء النهار التشغيلي»): Tajawal 400/500/
 *   700/800 صوتًا أساسيًا، Barlow Semi Condensed 600/700 للعرض
 *   اللاتيني، وIBM Plex Mono 400/500 للرموز التشغيلية.
 * - الوضع اللوني: ThemeProvider يقلع داكنًا (توافق الويب) مع
 *   تبديل محفوظ؛ الحالة وشريط التنقّل يتبعان الوضع.
 * - المزودات: QueryClient (نفس مكتبة الويب).
 */
import { I18nManager } from 'react-native'
import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { useFonts } from 'expo-font'
import {
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  Tajawal_800ExtraBold,
} from '@expo-google-fonts/tajawal'
import {
  BarlowSemiCondensed_600SemiBold,
  BarlowSemiCondensed_700Bold,
} from '@expo-google-fonts/barlow-semi-condensed'
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
} from '@expo-google-fonts/ibm-plex-mono'
import * as SplashScreen from 'expo-splash-screen'
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider'
import { queryClient } from '@/lib/query-client'
import { ensureRTL } from '@/lib/ensure-rtl'
import { useAuthStore } from '@/state/auth'
import { LoadingState } from '@/components/state-views'

// عربي أولًا — قبل أي رسم.
I18nManager.allowRTL(true)
I18nManager.forceRTL(true)

SplashScreen.preventAutoHideAsync()

function AppShell() {
  const { t } = useTheme()
  const [rtlReady, setRtlReady] = useState(false)
  const [fontsLoaded] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
    Tajawal_800ExtraBold,
    BarlowSemiCondensed_600SemiBold,
    BarlowSemiCondensed_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
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
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
